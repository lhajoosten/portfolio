# Database & Pooling

This guide covers the database layer of the portfolio backend — PostgreSQL setup,
pgvector, SQLAlchemy async sessions, Alembic migrations, and connection pooling.

---

## Technology stack

| Component | Technology | Version |
|---|---|---|
| Database | PostgreSQL | 16 |
| Vector extension | pgvector | 0.7+ |
| ORM | SQLAlchemy (async) | 2.x |
| Driver | asyncpg | 0.29+ |
| Migrations | Alembic | 1.x |
| Docker image | `pgvector/pgvector:pg16` | — |

---

## Local setup

PostgreSQL runs in Docker Compose with the pgvector extension pre-installed:

```bash
task db:up          # start Postgres + pgvector (detached)
task db:migrate     # run all pending Alembic migrations
task db:shell       # open a psql shell inside the container
task db:down        # stop the database container
```

The database is available on **host port 5433** (mapped from container port 5432)
to avoid conflicts with any locally installed PostgreSQL instance.

---

## Connection configuration

All database connection settings are read from `backend/.env` via
`pydantic-settings`. The async SQLAlchemy engine is constructed once at startup
in `app/db/session.py`:

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

engine = create_async_engine(
    settings.DATABASE_URL,           # postgresql+asyncpg://…
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,              # validates connections on checkout
    pool_recycle=3600,               # recycle connections after 1 hour
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,          # avoids lazy-load errors after commit
)
```

### `expire_on_commit=False`

This is important for async SQLAlchemy. With the default `expire_on_commit=True`,
accessing attributes on an ORM object after `db.commit()` would trigger a lazy
load — which is not supported in async mode and raises a `MissingGreenlet` error.
Setting it to `False` means ORM objects retain their loaded attribute values
after commit.

---

## Session lifecycle — `app.core.deps`

Database sessions are injected into route handlers via FastAPI's dependency system:

```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

Sessions are automatically committed on success and rolled back on any exception.
**Routes never call `db.commit()` or `db.rollback()` directly.**

---

## pgvector

The pgvector extension adds a native `vector` column type and distance operators
to PostgreSQL. It is enabled in the Docker image (`pgvector/pgvector:pg16`) and
activated in the first Alembic migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Vector columns

Every content model (`Project`, `Post`, `Certification`) carries a
`content_embedding` column for RAG semantic search:

```python
from pgvector.sqlalchemy import Vector
from app.core.constants import EMBEDDING_DIMENSIONS  # 768

class Project(Base):
    __tablename__ = "projects"
    # …
    content_embedding: Mapped[list[float] | None] = mapped_column(
        Vector(EMBEDDING_DIMENSIONS), nullable=True
    )
```

### Distance operators

pgvector provides three distance operators. The RAG service uses **cosine distance**
(`<=>`) because the embedding model (`bge-base-en-v1.5`) produces L2-normalised
vectors:

| Operator | Distance type | Use when… |
|---|---|---|
| `<->` | L2 (Euclidean) | Vectors are not normalised |
| `<=>` | Cosine | Vectors are normalised (our case) |
| `<#>` | Inner product (negated) | Maximum inner product search |

### Indexes

For production performance, add an HNSW index on the embedding column:

```sql
CREATE INDEX ON projects
USING hnsw (content_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

This is not yet in the Alembic migrations — add it once the dataset is large
enough for index performance to matter (typically > 10,000 rows).

---

## SQLAlchemy models — `app.models`

All models inherit from a shared `Base` with a `TimestampMixin`:

```python
# app/db/base.py
from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column
from datetime import datetime, timezone

class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
```

All IDs are UUIDs generated at the application layer (not the database):

```python
from uuid import UUID, uuid4
from sqlalchemy.orm import mapped_column, Mapped

id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
```

---

## Alembic migrations

Migrations live in `backend/alembic/versions/`. The migration environment is
configured in `backend/alembic/env.py` to use the async SQLAlchemy engine.

### Common commands

```bash
# Run all pending migrations
task db:migrate

# Create a new migration (auto-generates from model diff)
task db:migration name="add_featured_column_to_posts"

# Roll back the last migration
task db:rollback

# Show migration history
task db:history
```

### Migration conventions

- **Always review** auto-generated migrations before committing — Alembic
  sometimes misses renames or generates destructive changes
- Add a `# noqa: E501` comment on long lines to silence linter warnings in
  generated files
- Migrations that change `content_embedding` vector dimensions must drop and
  recreate the column — pgvector does not support `ALTER COLUMN … TYPE` for
  vector columns

### Example migration

```python
def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("featured", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("posts", "featured")
```

---

## Schema overview

```text
projects
├── id             uuid PK
├── title          text NOT NULL
├── slug           text UNIQUE NOT NULL
├── description    text
├── content        text
├── tags           text[]
├── tech_stack     text[]
├── live_url       text
├── repo_url       text
├── image_url      text
├── featured       boolean
├── published      boolean
├── order          integer
├── content_embedding  vector(768)
├── created_at     timestamptz
└── updated_at     timestamptz

posts
├── id             uuid PK
├── title          text NOT NULL
├── slug           text UNIQUE NOT NULL
├── body           text
├── excerpt        text
├── tags           text[]
├── published      boolean
├── content_embedding  vector(768)
├── created_at     timestamptz
└── updated_at     timestamptz

certifications
├── id             uuid PK
├── name           text NOT NULL
├── issuer         text NOT NULL
├── credential_url text
├── badge_url      text
├── description    text
├── issued_at      date
├── content_embedding  vector(768)
├── created_at     timestamptz
└── updated_at     timestamptz

users
├── id             uuid PK
├── email          text UNIQUE NOT NULL
├── hashed_password text NOT NULL
├── is_active      boolean
├── is_superuser   boolean
├── created_at     timestamptz
└── updated_at     timestamptz
```

---

## Connection pooling in production

The default pool settings (`pool_size=10`, `max_overflow=20`) support up to
30 concurrent database connections. For a single-instance deployment on a VPS
this is more than sufficient.

If you scale to multiple Uvicorn workers or multiple containers, each process
maintains its own pool. Use **PgBouncer** in transaction-pooling mode to prevent
connection exhaustion:

```text
Application workers  →  PgBouncer (transaction pooling)  →  PostgreSQL
```

PgBouncer configuration is not included in this repository but is recommended
for any deployment with more than 2 Uvicorn workers.

---

## Backup & restore

```bash
# Backup
docker exec portfolio-db-1 pg_dump -U postgres portfolio > backup.sql

# Restore
docker exec -i portfolio-db-1 psql -U postgres portfolio < backup.sql
```

For production, use `pg_basebackup` or a managed PostgreSQL service (e.g. Supabase,
Neon, Railway) that handles backups automatically.