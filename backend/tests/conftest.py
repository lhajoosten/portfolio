"""
Integration test configuration.

Fixtures provided:
  - ``postgres_container`` (session-scoped) — spins up a real Postgres 16 +
    pgvector container once per test session via testcontainers.
  - ``engine`` (session-scoped) — async SQLAlchemy engine pointed at the
    container; runs all Alembic migrations before yielding.
  - ``db`` (function-scoped) — yields a fresh ``AsyncSession`` per test,
    wrapped in a transaction that is rolled back on teardown so every test
    starts with a clean slate without dropping/recreating tables.
  - ``client`` (function-scoped) — ``httpx.AsyncClient`` wired to the
    FastAPI app with the overridden DB session.

Usage
-----
Mark integration tests with ``@pytest.mark.integration`` and run with::

    uv run pytest -m integration tests/integration/

To skip integration tests in CI when Docker is unavailable::

    uv run pytest -m "not integration"
"""

from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
import pytest_asyncio
from alembic.config import Config as AlembicConfig
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from testcontainers.postgres import PostgresContainer

from alembic import command as alembic_command
from app.db.session import get_db
from app.main import app

# ---------------------------------------------------------------------------
# Pytest markers
# ---------------------------------------------------------------------------

pytest_plugins = ["pytest_asyncio"]


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "integration: mark test as an integration test requiring Docker",
    )


# ---------------------------------------------------------------------------
# Container — started once per session
# ---------------------------------------------------------------------------

POSTGRES_IMAGE = "pgvector/pgvector:pg16"


@pytest.fixture(scope="session")
def postgres_container() -> Generator[PostgresContainer, None, None]:
    """Start a Postgres 16 + pgvector container for the test session."""
    with PostgresContainer(
        image=POSTGRES_IMAGE,
        username="test",
        password="test",
        dbname="test_portfolio",
        driver="asyncpg",
    ) as container:
        yield container


# ---------------------------------------------------------------------------
# Engine — session-scoped, migrations applied once
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="session")
async def engine(postgres_container: PostgresContainer) -> AsyncGenerator[Any, None]:
    """
    Create an async engine pointed at the test container and run all
    Alembic migrations so the schema matches the application models.
    """
    database_url = postgres_container.get_connection_url()
    # testcontainers returns a sync URL — switch to asyncpg driver
    async_url = database_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://")

    test_engine = create_async_engine(async_url, echo=False, pool_pre_ping=True)

    # Run migrations synchronously (Alembic needs a sync connection under the hood)
    alembic_cfg = AlembicConfig("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", async_url)

    def _run_migrations(connection: Any) -> None:
        alembic_cfg.attributes["connection"] = connection
        alembic_command.upgrade(alembic_cfg, "head")

    async with test_engine.begin() as conn:
        await conn.run_sync(_run_migrations)

    yield test_engine

    await test_engine.dispose()


# ---------------------------------------------------------------------------
# DB session — function-scoped with rollback isolation
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture()
async def db(engine: Any) -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a per-test ``AsyncSession`` inside a savepoint transaction.

    The outer transaction is never committed — it is rolled back after the
    test so each test starts with a pristine database state without needing
    to recreate the schema.
    """
    async with engine.connect() as connection:
        await connection.begin()
        # Nested (SAVEPOINT) transaction for per-test rollback
        await connection.begin_nested()

        session_factory = async_sessionmaker(
            bind=connection,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        async with session_factory() as session:
            yield session

        await connection.rollback()


# ---------------------------------------------------------------------------
# HTTP client — function-scoped, overrides DB dependency
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture()
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Yield an ``httpx.AsyncClient`` wired to the FastAPI app with the test
    DB session injected via dependency override.
    """

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
