"""Application-wide constants.

This module is the **single source of truth** for every magic value used
across the backend.  Import from here; never inline literals elsewhere.

Groups:

- **AI / OpenAI** — model names, token budgets, embedding config
- **vLLM** — the default open-source model served via ``vllm/vllm-openai``
- **Auth** — JWT expiry window

Example::

    from app.core.constants import OPENAI_CHAT_MODEL, EMBEDDING_DIMENSIONS
"""

# ---------------------------------------------------------------------------
# OpenAI / compatible provider — chat
# ---------------------------------------------------------------------------

OPENAI_CHAT_MODEL: str = "gpt-4o"
"""Default OpenAI chat-completion model.

Used when ``settings.VLLM_ENABLED`` is ``False`` (the default).
Override at runtime via the ``OPENAI_MODEL`` environment variable.
"""

VLLM_CHAT_MODEL: str = "qwen2.5-14b"
"""Served model name for the vLLM container (RTX 4080 / 16 GB VRAM profile).

This value is passed as the ``model`` parameter in every
``chat.completions.create`` call when ``settings.VLLM_ENABLED`` is ``True``.
It must match the ``--served-model-name`` flag passed to the vLLM process so
that the OpenAI-compatible API accepts it.

**Recommended model: Qwen/Qwen2.5-14B-Instruct-AWQ**

Chosen for the RTX 4080 (16 GB VRAM) because it hits the sweet spot between
quality and VRAM headroom — a 20 B model leaves almost no room for KV cache,
while a 7 B model is noticeably weaker for writing/instruction tasks.

**VRAM budget (RTX 4080 — 16 GB, Qwen2.5 family):**

+--------------------------------+--------+----------+-----------------+
| Model / precision              | Params | Weights  | KV cache left   |
+================================+========+==========+=================+
| Qwen2.5-7B-Instruct (FP16)     |  7 B   |  ~14 GB  | ~2 GB  ✗ tight  |
+--------------------------------+--------+----------+-----------------+
| Qwen2.5-7B-Instruct-AWQ        |  7 B   |  ~4 GB   | ~12 GB ✓ fast   |
+--------------------------------+--------+----------+-----------------+
| **Qwen2.5-14B-Instruct-AWQ**   | **14B**| **~7.5GB**| **~8.5GB ✓**  |
+--------------------------------+--------+----------+-----------------+
| Qwen2.5-20B-Instruct-AWQ       | 20 B   | ~10 GB   | ~6 GB  ✓ tight  |
+--------------------------------+--------+----------+-----------------+
| Qwen2.5-20B-Instruct (FP16)    | 20 B   | ~40 GB   | —      ✗        |
+--------------------------------+--------+----------+-----------------+

Set the HuggingFace repo path in ``.env`` (root) and ``backend/.env``::

    # root .env  (Docker Compose variable substitution)
    VLLM_MODEL_HF_ID=Qwen/Qwen2.5-14B-Instruct-AWQ
    VLLM_MODEL=qwen2.5-14b

    # backend/.env  (pydantic-settings / application config)
    VLLM_ENABLED=true
    VLLM_MODEL=qwen2.5-14b

The vLLM container is started with ``--quantization awq`` and
``--served-model-name qwen2.5-14b`` so the backend always calls
``model="qwen2.5-14b"`` regardless of the underlying HF repo path.

Override at runtime via the ``VLLM_MODEL`` environment variable.
"""

# ---------------------------------------------------------------------------
# OpenAI / compatible provider — embeddings
# ---------------------------------------------------------------------------

OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
"""Embedding model used to generate ``content_embedding`` vectors.

``text-embedding-3-small`` produces 1 536-dimension vectors and offers an
excellent quality-to-cost ratio for RAG retrieval workloads.

.. note::
    **Future: fully-local embeddings**

    To remove the OpenAI dependency entirely, switch to a vLLM-served
    embedding model such as ``BAAI/bge-m3`` (1 024 dims).  This requires:

    1. A second ``vllm`` service in ``docker-compose.yml`` dedicated to the
       embedding model (or use a lighter runtime like ``infinity-emb``).
    2. An Alembic migration to resize every ``vector(1536)`` column to
       ``vector(1024)``.
    3. Re-generating all stored embeddings after the migration.
    4. Updating ``EMBEDDING_DIMENSIONS`` below to ``1024``.

    Do **not** change ``EMBEDDING_DIMENSIONS`` without the matching migration
    — pgvector will reject inserts where the vector length does not match the
    column definition.
"""

EMBEDDING_DIMENSIONS: int = 1536
"""Dimensionality of the embedding vectors stored in pgvector.

Must match the output dimension of ``OPENAI_EMBEDDING_MODEL``.  Changing
this value requires a new Alembic migration to resize the ``vector`` column.

Current value ``1536`` matches ``text-embedding-3-small``.  If you switch to
a local model (e.g. ``BAAI/bge-m3``), update this to ``1024`` **and** run the
migration before inserting any new embeddings.
"""

# ---------------------------------------------------------------------------
# AI generation budgets
# ---------------------------------------------------------------------------

WRITING_MAX_TOKENS: int = 1000
"""Maximum tokens the writing assistant may generate in a single stream.

Kept intentionally short to stay within rate limits and keep latency low
for interactive CMS use.
"""

RAG_MAX_TOKENS: int = 2000
"""Maximum tokens the RAG-answer endpoint may generate per query."""

RAG_TOP_K: int = 5
"""Number of nearest-neighbour chunks retrieved from pgvector per query.

Higher values improve recall at the cost of larger prompt context and
slightly slower LLM responses.
"""

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
"""JWT access-token lifetime in minutes (default: 7 days).

Overridden at runtime via ``JWT_EXPIRE_MINUTES`` in ``.env``.
"""
