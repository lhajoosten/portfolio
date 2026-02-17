# Portfolio

Personal portfolio website with self-hosted CMS and AI writing assistant.

## Stack

**Frontend** — React 19, TypeScript, TanStack Router, TanStack Query, Tailwind CSS, TipTap, Hey API

**Backend** — Python 3.12, FastAPI, SQLAlchemy, Alembic, pgvector, uv

**Database** — PostgreSQL 16 with pgvector extension

**AI** — OpenAI GPT-4o with SSE streaming

## Getting Started

### Prerequisites
- Docker + Docker Compose
- Node.js 22+ + pnpm
- Python 3.12+ + uv
- Taskfile (`brew install go-task` or see taskfile.dev)

### Setup

```bash
# Clone
git clone git@github.com:lhajoosten/portfolio.git
cd portfolio

# Environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Install deps
task setup

# Start DB
task db:up

# Run migrations
task db:migrate

# Start dev servers (two terminals)
task dev:backend
task dev:frontend
```

### Available Tasks

```bash
task --list
```

| Task | Description |
|------|-------------|
| `task setup` | Install all dependencies |
| `task dev:frontend` | Start frontend dev server |
| `task dev:backend` | Start backend dev server |
| `task db:up` | Start Postgres + pgvector |
| `task db:migrate` | Run migrations |
| `task db:migration -- "name"` | Create new migration |
| `task db:shell` | Open psql shell |
| `task lint` | Lint everything |
| `task format` | Format everything |
| `task generate:client` | Regenerate API client from OpenAPI spec |

## Project Structure

```
portfolio/
├── frontend/
│   ├── src/
│   │   ├── routes/        # TanStack Router file-based routes
│   │   ├── components/    # UI components
│   │   ├── lib/api/       # Generated Hey API client
│   │   └── hooks/         # Custom React hooks
│   └── ...
├── backend/
│   ├── app/
│   │   ├── api/v1/        # FastAPI routes
│   │   ├── core/          # Config, auth
│   │   ├── db/            # Session, base models
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── services/      # Business logic
│   └── ...
├── docker-compose.yml
├── Taskfile.yml
└── .env.example
```

## API Docs

With backend running: [http://localhost:8000/docs](http://localhost:8000/docs)
