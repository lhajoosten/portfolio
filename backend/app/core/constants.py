"""Application-wide constants.

This module is the **single source of truth** for every magic value used
across the backend.  Import from here; never inline literals elsewhere.

Groups:

- **AI / vLLM chat** — served model name for the writing assistant
- **AI / vLLM embeddings** — model name and vector dimensions for RAG
- **AI generation budgets** — token limits
- **Auth** — JWT expiry window

Example::

    from app.core.constants import VLLM_CHAT_MODEL, EMBEDDING_DIMENSIONS
"""

# ---------------------------------------------------------------------------
# vLLM — chat / writing assistant
# ---------------------------------------------------------------------------

VLLM_CHAT_MODEL: str = "qwen2.5-7b"
"""Served model name for the vLLM chat container.

This is the value passed as ``--served-model-name`` to the vLLM process and
the value used as ``model=`` in every ``chat.completions.create`` call.
The actual HuggingFace repository path (``Qwen/Qwen2.5-7B-Instruct-AWQ``)
never appears in application code — only in ``docker-compose.yml``.

**Why Qwen2.5-7B-Instruct-AWQ?**

The portfolio writing assistant does not need a 14 B parameter model.
7 B AWQ hits the right balance for this use case:

+----------------------------------+-------+-----------+-------------------+
| Model / precision                | Params| VRAM      | Notes             |
+==================================+=======+===========+===================+
| Qwen2.5-7B-Instruct (FP16)       |  7 B  | ~14 GB    | Leaves no KV room |
+----------------------------------+-------+-----------+-------------------+
| **Qwen2.5-7B-Instruct-AWQ**      |**7 B**| **~4 GB** | **← used here**   |
+----------------------------------+-------+-----------+-------------------+
| Qwen2.5-14B-Instruct-AWQ         | 14 B  |  ~7.5 GB  | Overkill for CMS  |
+----------------------------------+-------+-----------+-------------------+

Override at runtime via the ``VLLM_CHAT_MODEL`` environment variable.
"""

VLLM_CHAT_MODEL_HF_ID: str = "Qwen/Qwen2.5-7B-Instruct-AWQ"
"""HuggingFace repository path passed as ``--model`` to the vLLM chat container.

Used only in ``docker-compose.yml`` (via the ``VLLM_CHAT_MODEL_HF_ID``
environment variable) so the HF path never leaks into application code.
Listed here as the canonical reference value.
"""

# ---------------------------------------------------------------------------
# infinity-emb — embedding model for RAG
# ---------------------------------------------------------------------------

VLLM_EMBED_MODEL: str = "BAAI/bge-base-en-v1.5"
"""Model name served by the infinity-emb container.

Unlike the vLLM chat container, infinity-emb advertises the HuggingFace
model name directly as the API model identifier, so this value is both
the HF repo path **and** the ``model=`` parameter in every
``embeddings.create`` call.

**Why BAAI/bge-base-en-v1.5?**

+--------------------------+------+--------+------------------------------------+
| Model                    | Dims | Size   | Notes                              |
+==========================+======+========+====================================+
| bge-small-en-v1.5        |  384 | ~130MB | Fastest; quality good for small    |
+--------------------------+------+--------+------------------------------------+
| **bge-base-en-v1.5**     |**768**|**~440MB**| **← sweet spot: quality + speed** |
+--------------------------+------+--------+------------------------------------+
| bge-large-en-v1.5        | 1024 |  ~1.3GB| Diminishing returns for this use   |
+--------------------------+------+--------+------------------------------------+
| bge-m3                   | 1024 |  ~2.2GB| Multilingual; unnecessary here     |
+--------------------------+------+--------+------------------------------------+

768 dimensions give excellent English semantic search quality with smaller
pgvector indices than the 1 024-dim alternatives.  The model runs on CPU
inside Docker, leaving all GPU VRAM for the chat container.
"""

EMBEDDING_DIMENSIONS: int = 768
"""Dimensionality of the embedding vectors stored in pgvector.

Must match the output dimension of ``VLLM_EMBED_MODEL``.  Changing this
value requires a new Alembic migration to resize every ``vector(N)`` column
in the ``projects``, ``posts``, and ``certifications`` tables **and**
re-generating all stored embeddings afterward.

Current value ``768`` matches ``BAAI/bge-base-en-v1.5``.
"""

# ---------------------------------------------------------------------------
# AI generation budgets
# ---------------------------------------------------------------------------

WRITING_MAX_TOKENS: int = 1000
"""Maximum tokens the writing assistant may generate in a single stream.

Kept intentionally short to stay within context and keep latency low for
interactive CMS use.  Increase if you find content generation cutting off.
"""

RAG_MAX_TOKENS: int = 2000
"""Maximum tokens the RAG-answer endpoint may generate per query."""

RAG_TOP_K: int = 5
"""Number of nearest-neighbour chunks retrieved from pgvector per query.

Higher values improve recall at the cost of a larger prompt context window
and slightly slower LLM responses.
"""

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
"""JWT access-token lifetime in minutes (default: 7 days).

Overridden at runtime via ``JWT_EXPIRE_MINUTES`` in ``.env``.
"""
