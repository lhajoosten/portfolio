# AI Pipeline

This guide covers the AI features in the portfolio — the writing assistant and RAG-powered semantic search — including the architecture, model choices, and how to extend them.

For the high-level overview including diagrams, see [Architecture](architecture.md).

---

## Overview

The portfolio has two distinct AI capabilities:

| Feature | Technology | Purpose |
|---|---|---|
| **Writing assistant** | vLLM + Qwen2.5-7B-AWQ | Stream-generate content in the TipTap editor |
| **RAG search** | infinity-emb + bge-base-en-v1.5 + pgvector | Semantic search across all portfolio content |

Both features use **OpenAI-compatible APIs** so the backend client code is identical regardless of whether you point at a local vLLM instance or OpenAI's hosted API.

---

## Infrastructure

### Local AI stack (development)

```text
┌─────────────────────────────────────────────────────────┐
│  vllm-chat  (Docker, GPU)                               │
│  Qwen2.5-7B-Instruct-AWQ                                │
│  OpenAI-compatible  →  http://localhost:8001/v1         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  infinity  (Docker, CPU)                                │
│  BAAI/bge-base-en-v1.5                                  │
│  OpenAI-compatible  →  http://localhost:8002/v1         │
└─────────────────────────────────────────────────────────┘
```

Start both with:

```bash
task vllm:up
```

Stop both with:

```bash
task vllm:down
```

### Model choices

| Model | Role | VRAM | Notes |
|---|---|---|---|
| `Qwen/Qwen2.5-7B-Instruct-AWQ` | Chat / writing | ~4 GB | AWQ 4-bit quant — leaves headroom on an RTX 4080 |
| `BAAI/bge-base-en-v1.5` | Embeddings | CPU only | 768-dim, ~440 MB download, excellent quality/size ratio |

---

## Writing assistant

### Pipeline

```
User prompt (TipTap editor)
  → POST /api/v1/ai/write
    → WritingService.stream()
      → prompts.py           (system + user prompt assembly)
        → AsyncOpenAI        (chat client → vllm-chat)
          → StreamingResponse (text/event-stream, SSE)
            → TipTap editor  (tokens appended in real time)
```

### Modes

The writing assistant supports two modes, controlled by the `mode` field in the request body:

| Mode | Behaviour |
|---|---|
| `write` | Generate new content from a prompt from scratch |
| `improve` | Rewrite or improve an existing draft passed as `context` |

### Prompt management

All prompt strings live in `app/services/ai/prompts.py` as versioned constants.
**They are never inlined in service or route code.**

```python
# app/services/ai/prompts.py
WRITE_SYSTEM_PROMPT = """..."""
IMPROVE_SYSTEM_PROMPT = """..."""
```

To change the assistant's behaviour, edit `prompts.py` — no other file needs to change.

### SSE streaming

The route returns a `StreamingResponse` with `media_type="text/event-stream"`.
Each token delta is emitted as:

```
data: <token>\n\n
```

The frontend reads these with the browser's `EventSource` API (or a compatible fetch-based SSE reader) and appends each token to the TipTap editor content.

A final `data: [DONE]\n\n` event signals the end of the stream.

---

## RAG search

### Pipeline

```
Portfolio content (projects, posts, certifications)
  → RagService.index_text()
    → infinity-emb  →  768-dim vector
      → UPDATE content_embedding  (pgvector column)

User search query
  → RagService.search()
    → embed query  →  768-dim vector
      → UNION SELECT … ORDER BY content_embedding <=> query_vec ASC
        → Top-K results (title, type, slug, distance)
```

### Embedding

`RagService.embed(text)` calls the infinity-emb `/v1/embeddings` endpoint:

```python
response = await self.client.embeddings.create(
    model=settings.VLLM_EMBED_MODEL,   # "BAAI/bge-base-en-v1.5"
    input=text.strip(),
)
return response.data[0].embedding     # list[float] — 768 dims
```

The returned vector is L2-normalised by the model, making it suitable for
cosine similarity with pgvector's `<=>` operator.

### Semantic search query

The search runs a single `UNION ALL` across all three content tables:

```sql
SELECT id::text, 'project' AS type, title, description AS excerpt, slug,
       content_embedding <=> '[…]'::vector AS distance
FROM   projects
WHERE  content_embedding IS NOT NULL

UNION ALL

SELECT id::text, 'post' AS type, title, excerpt, slug,
       content_embedding <=> '[…]'::vector AS distance
FROM   posts
WHERE  content_embedding IS NOT NULL

UNION ALL

SELECT id::text, 'certification' AS type, name AS title,
       COALESCE(description, issuer) AS excerpt, NULL AS slug,
       content_embedding <=> '[…]'::vector AS distance
FROM   certifications
WHERE  content_embedding IS NOT NULL

ORDER BY distance ASC
LIMIT   :limit
```

Results are sorted globally across all tables by ascending cosine distance
(0 = identical, 2 = opposite). The top-K results are returned with their
`type`, `title`, `slug`, and `distance` fields.

### Indexing content

To index (or re-index) a single row, call `RagService.index_text()`:

```python
await rag_service.index_text(
    db,
    table="projects",
    row_id=str(project.id),
    content=f"{project.title}\n\n{project.description}\n\n{project.content}",
)
```

To re-index all content, use the admin "Re-embed all" endpoint (planned) or
run the indexing script directly.

### Embedding dimensions

The embedding dimension is defined once in `app/core/constants.py`:

```python
EMBEDDING_DIMENSIONS = 768   # bge-base-en-v1.5
```

Every `content_embedding vector(N)` column in the database uses this constant.
If you switch to a different embedding model with a different output dimension,
you must:

1. Update `EMBEDDING_DIMENSIONS` in `constants.py`
2. Update `VLLM_EMBED_MODEL` in `.env`
3. Generate and run an Alembic migration that drops and recreates the
   `content_embedding` columns with the new dimension
4. Re-index all content

---

## Configuration reference

All AI-related settings are in `backend/.env`. See [Environment Variables](environment-variables.md) for the full reference.

| Setting | Default | Description |
|---|---|---|
| `VLLM_CHAT_BASE_URL` | `http://localhost:8001/v1` | vLLM chat endpoint |
| `VLLM_CHAT_MODEL` | `qwen2.5-7b` | Chat model name |
| `VLLM_EMBED_BASE_URL` | `http://localhost:8002/v1` | Infinity embed endpoint |
| `VLLM_EMBED_MODEL` | `BAAI/bge-base-en-v1.5` | Embedding model name |
| `RAG_TOP_K` | `5` | Max results returned by semantic search |

---

## Switching to OpenAI (production)

Because both services use the OpenAI-compatible API, switching to hosted OpenAI
requires only `.env` changes — no code changes:

```dotenv
VLLM_CHAT_BASE_URL=https://api.openai.com/v1
VLLM_CHAT_MODEL=gpt-4o
VLLM_CHAT_API_KEY=sk-...

VLLM_EMBED_BASE_URL=https://api.openai.com/v1
VLLM_EMBED_MODEL=text-embedding-3-small
VLLM_EMBED_API_KEY=sk-...
```

> **Note** — if you switch the embedding model you must also update
> `EMBEDDING_DIMENSIONS` and run a migration to resize the vector columns.

---

## Extending the AI features

### Adding a new writing mode

1. Add a new prompt constant to `app/services/ai/prompts.py`
2. Handle the new mode in `WritingService.stream()`
3. Add the mode value to the `WriteMode` enum in `app/schemas/ai.py`
4. The frontend `WriteMode` type alias (in `src/types/index.ts`) will need updating too

### Adding a new content type to RAG

1. Add a `content_embedding vector(768)` column to the new model and create a migration
2. Add a new `UNION ALL` branch to `RagService.search()`
3. Add the new table name to the `allowed_tables` set in `RagService.index_text()`
4. Index existing rows via `index_text()` before searching