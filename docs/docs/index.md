# Portfolio Developer Docs

> **Luc Hajoosten** — Full-stack software engineer specialising in AI-powered product development.

This site documents the technical architecture, API reference, and development guides for the
[portfolio monorepo](https://github.com/lhajoosten/portfolio).
The docs are **auto-generated** from source — Python docstrings via
[mkdocstrings](https://mkdocstrings.github.io/) and TypeScript TSDoc via
[TypeDoc](https://typedoc.org/) — so they always reflect the current codebase.

---

## What's inside

<div class="grid cards" markdown>

-   :material-server: **Backend**

    ---

    FastAPI · Python 3.12 · SQLAlchemy (async) · Alembic · pgvector

    [:octicons-arrow-right-24: Backend reference](backend/index.md)

-   :material-react: **Frontend**

    ---

    React 19 · TypeScript · TanStack Router + Query · Hey API · Tailwind CSS

    [:octicons-arrow-right-24: Frontend reference](frontend/index.md)

-   :material-brain: **AI Pipeline**

    ---

    OpenAI GPT-4o · SSE streaming · pgvector RAG · writing assistant

    [:octicons-arrow-right-24: AI pipeline guide](guides/ai-pipeline.md)

-   :material-shield-lock: **Auth & Security**

    ---

    JWT · httpOnly cookies · bcrypt · superuser RBAC

    [:octicons-arrow-right-24: Auth guide](guides/auth.md)

</div>

---

## Quick links

| Topic | Link |
|---|---|
| Local dev setup | [Development Setup](guides/development-setup.md) |
| Environment variables | [Environment Variables](guides/environment-variables.md) |
| Architecture overview | [Architecture](guides/architecture.md) |
| Backend API reference | [Backend](backend/index.md) |
| Frontend reference | [Frontend](frontend/index.md) |
| Exception hierarchy | [`app.core.exceptions`](backend/core/exceptions.md) |
| Database & pooling | [Database Guide](guides/database.md) |

---

## Stack at a glance

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                        │
│  React 19 · TanStack Router · TanStack Query · Hey API client   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / SSE  (credentials: include)
┌───────────────────────────▼─────────────────────────────────────┐
│  FastAPI  (port 8000)                                           │
│  ├── Routes  (thin — parse, delegate, return)                   │
│  ├── Services  (business logic, AI orchestration)               │
│  ├── Repositories  (all SQL queries)                            │
│  └── Core  (config, auth, exceptions, middleware)               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ asyncpg
┌───────────────────────────▼─────────────────────────────────────┐
│  PostgreSQL 16 + pgvector                                       │
│  ├── projects · posts · certifications · profile · users        │
│  └── content_embedding  vector(1536)  ← RAG search             │
└─────────────────────────────────────────────────────────────────┘
                            │ OpenAI-compatible API
┌───────────────────────────▼─────────────────────────────────────┐
│  AI Provider  (OpenAI OR vLLM)                                  │
│  ├── Chat completions  →  writing assistant (SSE stream)        │
│  └── Embeddings        →  RAG pipeline (pgvector)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture in one sentence

> **Routes are thin** — they parse the request and delegate to a **Service**.
> Services contain all business logic and call a **Repository** for data access.
> Repositories contain only SQL — no exceptions, no rules.
> AI features live in `app/services/ai/` and are the **same pattern**, just with an
> OpenAI client instead of a database session.

---

## Contributing

See the [Development Setup](guides/development-setup.md) guide to get a local
environment running in under five minutes.

All PRs must pass:

```bash
task lint        # ruff + eslint
task typecheck   # mypy + tsc
task test        # pytest + vitest
```
