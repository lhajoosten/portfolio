# Backend Architecture

This guide covers the backend implementation in detail — how the FastAPI application is structured, the patterns enforced at each layer, and the reasoning behind every decision.

For the high-level overview including diagrams, see [Architecture](architecture.md).

---

## Technology stack

| Layer | Technology | Version |
|---|---|---|
| Web framework | FastAPI | 0.115+ |
| ASGI server | Uvicorn | 0.30+ |
| ORM | SQLAlchemy (async) | 2.x |
| Migrations | Alembic | 1.x |
| Validation | Pydantic v2 | 2.x |
| Database driver | asyncpg | 0.29+ |
| Vector search | pgvector | 0.7+ |
| Settings | pydantic-settings | 2.x |
| Auth | python-jose + bcrypt | — |
| HTTP client | httpx | 0.27+ |

---

## Directory structure

```text
backend/
└── app/
    ├── api/
    │   └── v1/
    │       ├── router.py          # Mounts all route modules
    │       └── routes/
    │           ├── projects.py
    │           ├── posts.py
    │           ├── certifications.py
    │           ├── auth.py
    │           └── ai.py
    ├── core/
    │   ├── config.py              # pydantic-settings — all env vars
    │   ├── constants.py           # No magic strings/numbers
    │   ├── deps.py                # FastAPI dependency functions
    │   ├── exceptions.py          # Domain exception hierarchy
    │   ├── error_handlers.py      # Maps exceptions → HTTP responses
    │   ├── logging.py             # Structured logging config
    │   ├── middleware.py          # RequestIDMiddleware
    │   └── security.py           # JWT encode/decode, password hashing
    ├── db/
    │   ├── base.py                # SQLAlchemy declarative base
    │   └── session.py             # AsyncSession factory + engine
    ├── models/                    # SQLAlchemy ORM models
    ├── schemas/                   # Pydantic request/response schemas
    ├── repositories/              # All SQL queries
    ├── services/                  # Business logic + AI orchestration
    │   └── ai/
    │       ├── client.py          # OpenAI-compatible client singletons
    │       ├── prompts.py         # All prompt strings (versioned constants)
    │       ├── writing_service.py # SSE streaming writing assistant
    │       └── rag_service.py     # Embedding + semantic search
    └── main.py                    # App factory, middleware, mounts
```

---

## Layer rules

The codebase enforces a strict call order. **Violations are bugs**, not style issues:

```
HTTP Request
  → Route handler     (parse, validate, delegate, return — nothing else)
    → Service         (business logic, orchestration, AI calls)
      → Repository    (all SQL — zero logic)
        → Database    (AsyncSession)
```

### What each layer owns

| Layer | Owns | Never does |
|---|---|---|
| **Routes** `api/v1/routes/` | Parse request body/params, call one service method, return schema | Touch DB directly, contain `if/else` business logic |
| **Services** `services/` | Orchestrate repositories, enforce rules, call AI, raise domain exceptions | Import from routes, return raw ORM objects |
| **Repositories** `repositories/` | Issue `SELECT`/`INSERT`/`UPDATE`/`DELETE` via `AsyncSession` | Raise domain exceptions, contain `if/else` rules |
| **Models** `models/` | Define ORM columns and relationships | Contain any logic |
| **Schemas** `schemas/` | Validate HTTP I/O, transform Pydantic ↔ ORM | Import from routes or services |
| **Core** `core/` | Config, exceptions, security, middleware, deps | Import from any feature module |

---

## Configuration — `app.core.config`

All configuration is managed by a single `Settings` class backed by `pydantic-settings`.
It reads from environment variables and the `backend/.env` file automatically.

```python
# Access settings anywhere in the application:
from app.core.config import settings

print(settings.DATABASE_URL)
print(settings.VLLM_CHAT_MODEL)
```

Never read `os.environ` directly. Every value has a type annotation and an optional
default — this means misconfiguration fails loudly at startup, not at runtime.

---

## Database session — `app.db.session`

All database access uses SQLAlchemy's async session. Sessions are injected by FastAPI's
dependency system:

```python
# In a repository:
async def get_project(self, db: AsyncSession, project_id: UUID) -> Project | None:
    result = await db.execute(select(Project).where(Project.id == project_id))
    return result.scalar_one_or_none()
```

```python
# In a route (via dependency injection):
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    project_service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return await project_service.get(db, project_id)
```

The `get_db` dependency yields a session that is automatically committed on success
and rolled back on exception.

---

## Domain exceptions — `app.core.exceptions`

All domain errors are typed exceptions that inherit from a base hierarchy:

```text
PortfolioError (base)
├── NotFoundError
│   ├── ProjectNotFoundError
│   ├── PostNotFoundError
│   └── CertificationNotFoundError
├── ConflictError
│   └── SlugConflictError
├── AuthError
│   ├── InvalidCredentialsError
│   └── InsufficientPermissionsError
└── AIServiceError
```

Services raise typed exceptions. Routes **never** catch them — the global handlers
in `app.core.error_handlers` map each exception type to the correct HTTP status code
and response body. This keeps every route handler to ~10 lines.

---

## Models & pgvector — `app.models`

Every content model (`Project`, `Post`, `Certification`) carries a
`content_embedding` vector column used by the RAG search service:

```python
from pgvector.sqlalchemy import Vector
from app.core.constants import EMBEDDING_DIMENSIONS  # 768

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str]
    slug: Mapped[str] = mapped_column(unique=True)
    content_embedding: Mapped[list[float] | None] = mapped_column(
        Vector(EMBEDDING_DIMENSIONS), nullable=True
    )
```

The embedding dimension is defined once in `constants.py` and shared across models,
schemas, migrations, and the RAG service — changing it in one place propagates
everywhere.

---

## Schemas — `app.schemas`

Each domain has separate request and response schemas:

```python
class ProjectCreate(BaseModel):
    title: str
    slug: str
    description: str
    # ...

class ProjectResponse(ProjectCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

`from_attributes=True` lets Pydantic construct a response schema directly from
a SQLAlchemy ORM object — routes never need to serialise manually.

---

## Auth — `app.core.security`

Authentication uses JWT tokens stored in `httpOnly` cookies:

1. `POST /api/v1/auth/login` — validates credentials, issues a signed JWT, sets it as an `httpOnly` cookie
2. Every protected route uses `Depends(get_current_user)` — the dependency decodes the cookie, verifies the token, and returns the `User` model
3. Admin-only routes additionally use `Depends(require_superuser)`

Passwords are hashed with bcrypt. The `SECRET_KEY` setting is used to sign tokens — rotate it to invalidate all sessions.

---

## AI services — `app.services.ai`

### Writing assistant

`WritingService.stream()` calls the vLLM chat container via an OpenAI-compatible
client and yields token deltas as SSE events. All prompt strings live in
`prompts.py` as versioned constants — they are never inlined in service code.

### RAG service

`RagService` handles two responsibilities:

- **`embed(text)`** — calls the infinity-emb container to produce a 768-dim vector
- **`search(db, query, limit)`** — embeds the query and runs a UNION cosine-distance
  query across `projects`, `posts`, and `certifications` via pgvector's `<=>` operator

See the [AI Pipeline](ai-pipeline.md) guide for the full pipeline diagram and design rationale.

---

## Adding a new domain

To add a new content domain (e.g. `talks`):

1. **Model** — create `app/models/talk.py` with a `Talk` SQLAlchemy model including a `content_embedding` column
2. **Schema** — create `app/schemas/talk.py` with `TalkCreate`, `TalkUpdate`, `TalkResponse`
3. **Repository** — create `app/repositories/talk_repository.py` with CRUD methods
4. **Service** — create `app/services/talk_service.py` with business logic
5. **Routes** — create `app/api/v1/routes/talks.py` with thin route handlers
6. **Router** — register the router in `app/api/v1/router.py`
7. **Migration** — run `task db:migration name="add_talks_table"` and edit the generated file
8. **RAG** — add `talks` to the UNION query in `RagService.search()` and the allowed tables in `RagService.index_text()`
