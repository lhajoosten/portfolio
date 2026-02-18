# Architecture

This document describes the overall architecture of the portfolio application — the layering rules, data-flow contracts, and the reasoning behind every structural decision.

---

## Guiding principles

| Principle | How it shows up |
|---|---|
| **Thin routes** | Route handlers parse the request and delegate — zero business logic, zero SQL |
| **Explicit layers** | Routes → Services → Repositories → Database. Cross-layer imports are forbidden |
| **Typed at every boundary** | Pydantic schemas at the HTTP boundary, SQLAlchemy models inside, never mixed |
| **Fail loudly** | Domain exceptions propagate up; global handlers map them to HTTP — no silent swallows |
| **No magic strings** | Every repeated value (model names, token limits, route prefixes) lives in `constants.py` / `constants.ts` |
| **Generated clients** | The frontend never hand-writes fetch calls — Hey API generates a typed client from the OpenAPI spec |

---

## System overview

```mermaid
graph TB
    subgraph Browser["Browser"]
        FE["React 19 · TanStack Router<br/>TanStack Query · Hey API client"]
    end

    subgraph API["FastAPI  :8000"]
        R["Routes<br/><small>parse · delegate · return</small>"]
        S["Services<br/><small>business logic · AI orchestration</small>"]
        Repo["Repositories<br/><small>all SQL queries</small>"]
        Core["Core<br/><small>config · auth · exceptions · middleware</small>"]
    end

    subgraph Data["Data layer"]
        PG["PostgreSQL 16 + pgvector"]
        VEC["content_embedding vector(1536)"]
    end

    subgraph AI["AI provider  (OpenAI or vLLM)"]
        Chat["Chat completions<br/><small>SSE stream → writing assistant</small>"]
        Embed["Embeddings<br/><small>text-embedding-3-small → RAG</small>"]
    end

    FE -- "HTTP / SSE  credentials:include" --> R
    R --> S
    S --> Repo
    Repo --> PG
    PG --- VEC
    S --> Core
    R --> Core
    S -- "AsyncOpenAI" --> Chat
    S -- "AsyncOpenAI" --> Embed
    Embed --> VEC
```

---

## Backend layer rules

```mermaid
flowchart LR
    Route["Route handler<br/><code>api/v1/routes/</code>"]
    Service["Service<br/><code>services/</code>"]
    Repository["Repository<br/><code>repositories/</code>"]
    DB[("PostgreSQL")]

    Route -- "calls" --> Service
    Service -- "calls" --> Repository
    Repository -- "AsyncSession" --> DB

    Route -. "NEVER touches" .-> Repository
    Route -. "NEVER touches" .-> DB
    Service -. "NEVER imports" .-> Route
```

### What lives where

| Layer | File pattern | Allowed to… | Must never… |
|---|---|---|---|
| **Routes** | `api/v1/routes/*.py` | Parse request · call service · return schema | Touch DB · contain business logic |
| **Services** | `services/*.py` | Orchestrate repos · call AI · raise domain exceptions | Import routes · return raw ORM objects |
| **Repositories** | `repositories/*.py` | Issue SQL via `AsyncSession` | Raise domain exceptions · contain rules |
| **Models** | `models/*.py` | Define ORM columns + relationships | Contain any logic |
| **Schemas** | `schemas/*.py` | Validate I/O · transform data | Import from routes or services |
| **Core** | `core/*.py` | Config · exceptions · security · middleware | Import from any feature module |

---

## Request lifecycle

```mermaid
sequenceDiagram
    actor Client
    participant MW as RequestIDMiddleware
    participant Route as Route handler
    participant Service as Service
    participant Repo as Repository
    participant DB as PostgreSQL

    Client->>MW: HTTP request
    MW->>MW: stamp X-Request-ID
    MW->>Route: forward request
    Route->>Route: parse + validate (Pydantic)
    Route->>Service: call service method
    Service->>Repo: call repository method
    Repo->>DB: SELECT / INSERT / UPDATE / DELETE
    DB-->>Repo: rows
    Repo-->>Service: ORM object(s)
    Service->>Service: validate business rules
    Service-->>Route: Pydantic response schema
    Route-->>MW: JSONResponse
    MW->>MW: attach X-Request-ID header
    MW-->>Client: response + X-Request-ID
```

### Error path

```mermaid
sequenceDiagram
    actor Client
    participant Route as Route handler
    participant Service as Service
    participant EH as Global exception handler

    Client->>Route: HTTP request
    Route->>Service: call service method
    Service->>Service: resource not found
    Service-->>Route: raise ProjectNotFoundError
    Route-->>EH: exception propagates (no try/except in route)
    EH->>EH: map NotFoundError → HTTP 404
    EH-->>Client: {"detail": "...", "request_id": "..."}
```

!!! tip "No try/except in routes"
    Domain exceptions bubble up from the service layer through the route layer
    unchanged.  The global handlers in `app.core.error_handlers` catch them and
    produce the correct HTTP response.  This keeps every route handler to
    ~10 lines.

---

## Frontend data flow

```mermaid
flowchart TD
    Page["Route / Page component<br/><code>src/routes/</code>"]
    Hook["Domain hook<br/><code>src/hooks/use*.ts</code>"]
    Wrapper["useAppQuery / useAppMutation<br/><code>src/lib/query.ts</code>"]
    Gen["Generated TanStack options<br/><code>src/lib/api/@tanstack/react-query.gen.ts</code>"]
    Client["Hey API client<br/><code>src/lib/api-client.ts</code>"]
    API["FastAPI backend"]

    Page -->|"calls"| Hook
    Hook -->|"passes generated options to"| Wrapper
    Wrapper -->|"wraps"| Gen
    Gen -->|"uses"| Client
    Client -->|"fetch + credentials:include"| API

    Page -. "NEVER calls fetch directly" .-> API
    Hook -. "NEVER imports from routes" .-> Page
```

### Component rules

| Layer | Pattern | Allowed to… | Must never… |
|---|---|---|---|
| **Route / Page** | `src/routes/**/*.tsx` | Compose hooks + components | Call `fetch` · use `useEffect` for data |
| **Domain hook** | `src/hooks/use*.ts` | Call `useAppQuery` / `useAppMutation` with generated options | Contain render logic |
| **`useAppQuery`** | `src/lib/query.ts` | Wrap TanStack Query + log errors in dev | Import from feature modules |
| **Generated client** | `src/lib/api/` | Typed fetch calls against the OpenAPI spec | Be edited by hand |

---

## AI pipeline

```mermaid
flowchart LR
    subgraph Frontend
        Editor["TipTap editor"]
        Hook["useWritingAssistant()"]
        SSE["EventSource / SSE reader"]
    end

    subgraph Backend
        AIRoute["POST /api/v1/ai/write"]
        WritingSvc["WritingService.stream()"]
        Prompts["prompts.py<br/><small>all prompt strings</small>"]
        OpenAI["AsyncOpenAI client<br/><small>singleton</small>"]
    end

    subgraph Provider["AI provider"]
        GPT["GPT-4o<br/><small>or vLLM</small>"]
    end

    Editor -- "prompt + mode + context" --> Hook
    Hook -- "POST body" --> AIRoute
    AIRoute --> WritingSvc
    WritingSvc --> Prompts
    WritingSvc --> OpenAI
    OpenAI -- "stream=True" --> GPT
    GPT -- "token deltas" --> OpenAI
    OpenAI -- "AsyncGenerator[str]" --> WritingSvc
    WritingSvc -- "data: <token>\n\n" --> AIRoute
    AIRoute -- "StreamingResponse (text/event-stream)" --> SSE
    SSE -- "append token" --> Editor
```

### RAG pipeline

```mermaid
flowchart TD
    Content["Portfolio content<br/>(projects · posts · certs · profile)"]
    EmbedSvc["RagService.embed()"]
    PGVector["pgvector<br/>content_embedding column"]

    Query["User search query"]
    EmbedQuery["Embed query"]
    Similarity["cosine similarity<br/>SELECT ... ORDER BY embedding <=> query_vec"]
    TopK["Top-K chunks"]
    LLM["LLM with retrieved context"]
    Answer["Grounded answer"]

    Content --> EmbedSvc
    EmbedSvc --> PGVector

    Query --> EmbedQuery
    EmbedQuery --> Similarity
    PGVector --> Similarity
    Similarity --> TopK
    TopK --> LLM
    Query --> LLM
    LLM --> Answer
```

---

## Database schema

```mermaid
erDiagram
    projects {
        uuid id PK
        string title
        string slug UK
        text description
        text content
        string[] tags
        string[] tech_stack
        string live_url
        string repo_url
        string image_url
        bool featured
        bool published
        int order
        vector content_embedding
        timestamptz created_at
        timestamptz updated_at
    }

    users {
        uuid id PK
        string email UK
        string hashed_password
        bool is_active
        bool is_superuser
        timestamptz created_at
        timestamptz updated_at
    }

    posts {
        uuid id PK
        string title
        string slug UK
        text body
        string[] tags
        bool published
        vector content_embedding
        timestamptz created_at
        timestamptz updated_at
    }

    certifications {
        uuid id PK
        string title
        string issuer
        string credential_url
        string badge_url
        date issued_at
        vector content_embedding
        timestamptz created_at
        timestamptz updated_at
    }
```

!!! note "pgvector"
    Every domain model that participates in RAG search carries a
    `content_embedding vector(1536)` column.  The dimension `1536` matches
    OpenAI's `text-embedding-3-small` output.  Changing this requires a new
    Alembic migration.

---

## Auth flow

```mermaid
sequenceDiagram
    actor Admin
    participant FE as React app
    participant API as FastAPI
    participant DB as PostgreSQL

    Admin->>FE: POST /login  {email, password}
    FE->>API: POST /api/v1/auth/login
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: User row
    API->>API: verify bcrypt hash
    API->>API: create_access_token(sub=user.id)
    API-->>FE: Set-Cookie: access_token=<JWT>; HttpOnly; SameSite=Lax
    FE-->>Admin: redirect to /admin

    Admin->>FE: navigate to /admin/projects
    FE->>API: GET /api/v1/projects/?published_only=false<br/>(cookie sent automatically)
    API->>API: decode_access_token(cookie)
    API->>DB: SELECT user WHERE id = sub
    DB-->>API: User row
    API-->>FE: [ProjectResponse, ...]
    FE-->>Admin: projects list
```

See the [Auth & Security guide](auth.md) for the full implementation details.

---

## Deployment topology (planned)

```mermaid
graph TB
    DNS["DNS / CDN<br/><small>Cloudflare</small>"]

    subgraph VPS["VPS / Fly.io"]
        Nginx["Nginx reverse proxy<br/><small>SSL termination</small>"]
        FEContainer["Frontend container<br/><small>pnpm build → static files</small>"]
        BEContainer["Backend container<br/><small>uvicorn workers</small>"]
        DBContainer["PostgreSQL + pgvector"]
        DocsContainer["MkDocs static site<br/><small>served by FastAPI at /project-docs/</small>"]
    end

    subgraph AI["AI provider"]
        OAI["OpenAI API<br/><small>or self-hosted vLLM</small>"]
    end

    DNS --> Nginx
    Nginx --> FEContainer
    Nginx --> BEContainer
    BEContainer --> DBContainer
    BEContainer --> OAI
    BEContainer --> DocsContainer
```

!!! tip "Docs embedded in the portfolio"
    The MkDocs static build output (`site/`) is served by FastAPI as a
    `StaticFiles` mount at `/project-docs/`.  No separate web server needed.
    The portfolio frontend links to `/project-docs/` as a normal `<a>` tag.
    When the project matures, this can be upgraded to a full Docusaurus site
    as a `/docs` route inside the React app itself.