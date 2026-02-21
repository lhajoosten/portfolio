# Development Setup

A complete guide to setting up a local development environment for the portfolio monorepo.

---

## Repository structure

```text
portfolio/
├── backend/          # FastAPI application (Python 3.12, uv)
├── frontend/         # React 19 application (TypeScript, pnpm)
├── docs/             # MkDocs documentation site
├── docker-compose.yml
└── Taskfile.yml      # All dev tasks live here — run `task --list` to explore
```

---

## Prerequisites

Install the following tools before continuing:

### Required

| Tool | Version | Notes |
|---|---|---|
| **Docker** | 24+ | [docs.docker.com](https://docs.docker.com/get-docker/) — includes Docker Compose v2 |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) — LTS recommended |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Python** | 3.12 | [python.org](https://www.python.org/downloads/) |
| **uv** | latest | `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Task** | 3+ | [taskfile.dev/installation](https://taskfile.dev/installation/) |

### Optional (for AI features)

| Tool | Notes |
|---|---|
| **NVIDIA GPU** | RTX 4080 or better recommended for the vLLM chat model |
| **NVIDIA Container Toolkit** | Required to pass the GPU into Docker — [install guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) |

---

## Step-by-step setup

### 1. Clone the repository

```bash
git clone https://github.com/lhajoosten/portfolio.git
cd portfolio
```

### 2. Install all dependencies

```bash
task setup
```

This runs:

- `task setup:frontend` — `pnpm install` in `frontend/`
- `task setup:backend` — `uv sync --all-groups` in `backend/`
- `task setup:docs` — `uv sync --group docs` in `backend/` (MkDocs)
- `task setup:hooks` — installs Husky pre-commit hooks

### 3. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum:

```dotenv
SECRET_KEY=change-me-to-a-random-256-bit-hex-string
POSTGRES_PASSWORD=postgres
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_PASSWORD=changeme
```

See [Environment Variables](environment-variables.md) for every key explained.

### 4. Start the database

```bash
task db:up          # starts Postgres + pgvector in Docker (detached)
```

### 5. Run database migrations

```bash
task db:migrate     # runs all pending Alembic migrations
```

### 6. Start the development servers

```bash
task dev:backend    # FastAPI on http://localhost:8000
task dev:frontend   # Vite on http://localhost:5173
```

Or start everything including the database in one command:

```bash
task dev            # docker compose up (db + backend + frontend)
```

---

## Running the full stack with Docker Compose

```bash
task dev:d          # detached — all services in background
task logs           # follow all container logs
task dev:down       # stop containers (keep volumes)
task dev:down:v     # stop containers AND wipe volumes (full reset)
```

---

## AI services (optional)

The writing assistant and RAG search require two additional containers:

```bash
task vllm:up                # starts both AI containers
task vllm:logs:chat         # follow vLLM chat model logs
task vllm:logs:embed        # follow infinity embedding server logs
task vllm:down              # stop AI containers
```

| Container | Role | Port |
|---|---|---|
| `vllm-chat` | Qwen2.5-7B-AWQ — writing assistant | 8001 |
| `infinity` | bge-base-en-v1.5 — embeddings | 8002 |

> **First run:** the models are downloaded from HuggingFace on first start.
> `vllm-chat` downloads ~4 GB; `infinity` downloads ~440 MB.
> Subsequent starts are instant once the model cache volume is populated.

---

## Code quality

```bash
task lint           # ESLint (frontend) + Ruff (backend)
task typecheck      # tsc --noEmit (frontend) + mypy (backend)
task test           # Vitest (frontend) + pytest (backend)
task check          # lint + typecheck + test in sequence
task fix            # auto-fix lint issues (ESLint --fix + Ruff --fix)
task format         # Prettier (frontend) + Ruff format (backend)
```

---

## Generating the API client

After changing any backend route or schema, regenerate the typed frontend client:

```bash
# Requires the backend to be running on http://localhost:8000
task generate:client
```

This runs `openapi-ts` against the live OpenAPI spec and updates
`frontend/src/lib/api/` — **never edit that directory by hand**.

---

## Database helpers

```bash
task db:migration name="add_something"   # create a new Alembic migration
task db:rollback                         # roll back one migration
task db:history                          # show migration history
task db:shell                            # open psql inside the Postgres container
task db:reset                            # wipe DB volume and restart Postgres
```

---

## Troubleshooting

### Port conflicts

All services use non-standard ports to avoid clashing with other local projects:

| Service | Default port |
|---|---|
| PostgreSQL | 5433 (host) → 5432 (container) |
| Backend | 8000 |
| Frontend | 5173 |
| vLLM chat | 8001 |
| Infinity embed | 8002 |

Edit `docker-compose.yml` if any of these conflict with existing services.

### `uv` command not found

Make sure `uv` is on your `PATH`. If you installed it via the install script,
add `~/.cargo/bin` (Linux/macOS) to your shell's `PATH`.

### Database migration errors

If migrations fail with a "table already exists" or "column missing" error,
try a full reset:

```bash
task dev:down:v     # wipes all volumes
task db:up
task db:migrate
```

### `pnpm install` fails on Node.js version

Ensure you are running Node.js 20+. Use [nvm](https://github.com/nvm-sh/nvm)
or [fnm](https://github.com/Schniz/fnm) to manage Node versions:

```bash
fnm use 20
pnpm install
```
