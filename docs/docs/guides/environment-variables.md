# Environment Variables

All configuration is managed via `.env` files. Copy the example and edit as needed:

```bash
cp backend/.env.example backend/.env
```

---

## Backend (`backend/.env`)

### Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | ✅ | — | 256-bit hex secret used to sign JWT tokens. Generate with `openssl rand -hex 32`. |
| `ENVIRONMENT` | | `development` | One of `development`, `staging`, `production`. Controls log level and debug features. |
| `LOG_LEVEL` | | `INFO` | Python logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR`. |

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_HOST` | | `localhost` | Hostname of the PostgreSQL server. Use `db` when running inside Docker Compose. |
| `POSTGRES_PORT` | | `5432` | PostgreSQL port (container-internal). The host port is mapped to `5433` in Docker Compose. |
| `POSTGRES_DB` | | `portfolio` | Database name. |
| `POSTGRES_USER` | | `postgres` | Database username. |
| `POSTGRES_PASSWORD` | ✅ | — | Database password. |
| `DATABASE_URL` | | *(auto-built)* | Full async DSN. If set, overrides the individual `POSTGRES_*` vars. Format: `postgresql+asyncpg://user:pass@host:port/db`. |

### Auth

| Variable | Required | Default | Description |
|---|---|---|---|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | `30` | JWT access token lifetime in minutes. |
| `FIRST_SUPERUSER_EMAIL` | ✅ | — | Email of the initial admin user created on first startup. |
| `FIRST_SUPERUSER_PASSWORD` | ✅ | — | Password of the initial admin user. **Change this immediately after first login.** |

### CORS

| Variable | Required | Default | Description |
|---|---|---|---|
| `BACKEND_CORS_ORIGINS` | | `["http://localhost:5173"]` | JSON array of allowed CORS origins. In production, set to your frontend domain. |

### AI — Chat (vLLM)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VLLM_CHAT_BASE_URL` | | `http://localhost:8001/v1` | Base URL of the vLLM OpenAI-compatible chat endpoint. |
| `VLLM_CHAT_MODEL` | | `qwen2.5-7b` | Model name passed to the vLLM `/v1/chat/completions` endpoint. |
| `VLLM_CHAT_API_KEY` | | `none` | API key for the vLLM chat service (use `none` for local setups). |

### AI — Embeddings (infinity)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VLLM_EMBED_BASE_URL` | | `http://localhost:8002/v1` | Base URL of the infinity-emb OpenAI-compatible embeddings endpoint. |
| `VLLM_EMBED_MODEL` | | `BAAI/bge-base-en-v1.5` | Embedding model name passed to the `/v1/embeddings` endpoint. |
| `VLLM_EMBED_API_KEY` | | `none` | API key for the embedding service (use `none` for local setups). |

### RAG

| Variable | Required | Default | Description |
|---|---|---|---|
| `RAG_TOP_K` | | `5` | Number of nearest-neighbour results returned by the RAG search service. |

---

## Frontend (`frontend/.env.local`)

The frontend reads all config from `import.meta.env`. Only variables prefixed
with `VITE_` are exposed to the browser bundle.

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | | `http://localhost:8000` | Base URL of the FastAPI backend. Must not have a trailing slash. |

---

## Docker Compose overrides

When running services inside Docker Compose, the containers communicate over
the internal Docker network. The backend container should set:

```dotenv
POSTGRES_HOST=db          # service name in docker-compose.yml
VLLM_CHAT_BASE_URL=http://vllm-chat:8000/v1
VLLM_EMBED_BASE_URL=http://infinity:7997/v1
```

These differ from the local-dev defaults (which point to `localhost`) because
Docker containers cannot reach `localhost` of the host machine.

---

## Security checklist

!!! warning "Before deploying to production"
    - [ ] Rotate `SECRET_KEY` — never reuse the development value
    - [ ] Change `FIRST_SUPERUSER_PASSWORD` and log in to confirm
    - [ ] Set `BACKEND_CORS_ORIGINS` to your actual frontend domain
    - [ ] Set `ENVIRONMENT=production` to disable debug features
    - [ ] Use Docker secrets or a secrets manager (e.g. Doppler, Vault) — never commit `.env` files