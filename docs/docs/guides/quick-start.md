# Quick Start

Get the full portfolio stack running locally in under five minutes.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker & Docker Compose | 24+ | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 9+ | `npm i -g pnpm` |
| Python | 3.12 | [python.org](https://www.python.org/) |
| uv | latest | `pip install uv` |
| Task | latest | [taskfile.dev](https://taskfile.dev/) |

---

## 1 — Clone & install

```bash
git clone https://github.com/lhajoosten/portfolio.git
cd portfolio
task setup
```

`task setup` installs all frontend, backend, and docs dependencies in one step.

---

## 2 — Configure environment

Copy the example env files and fill in your values:

```bash
cp backend/.env.example backend/.env
```

The only value you **must** change for local development is the database URL,
which is already pre-filled for the Docker Compose Postgres service.
See [Environment Variables](environment-variables.md) for the full reference.

---

## 3 — Start the stack

```bash
task dev:d          # starts Postgres + backend + frontend (detached)
```

| Service | URL |
|---|---|
| Frontend (Vite) | <http://localhost:5173> |
| Backend (FastAPI) | <http://localhost:8000> |
| API docs (Swagger) | <http://localhost:8000/docs> |
| API docs (Redoc) | <http://localhost:8000/redoc> |

---

## 4 — Run migrations

```bash
task db:migrate
```

---

## 5 — (Optional) Start AI services

The writing assistant and RAG search require the local LLM containers:

```bash
task vllm:up        # starts vllm-chat + infinity embedding server
```

> **Note** — first run downloads ~4 GB (Qwen2.5-7B-AWQ) and ~440 MB
> (bge-base-en-v1.5). Subsequent starts are instant once the models are cached.

---

## Verify everything works

```bash
task check          # lint + typecheck + test (frontend + backend)
```

All checks should pass on a clean clone. If anything fails, check the
[Development Setup](development-setup.md) guide for troubleshooting steps.