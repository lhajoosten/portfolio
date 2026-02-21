"""AI client singletons.

Provides two separately-configured ``AsyncOpenAI`` clients:

``get_chat_client()``
    Points at the vLLM chat container (``vllm-chat``), which serves
    ``Qwen/Qwen2.5-7B-Instruct-AWQ`` under the name ``qwen2.5-7b``.
    Used by :mod:`app.services.ai.writing_service` for SSE-streamed
    text generation.

``get_embed_client()``
    Points at the infinity-emb container (``infinity``), which serves
    ``BAAI/bge-base-en-v1.5`` on CPU.  Used by
    :mod:`app.services.ai.rag_service` for generating and querying
    pgvector embeddings.

Both containers expose an OpenAI-compatible ``/v1`` API, so the same
``openai`` SDK works for both — only the ``base_url`` and ``model``
differ.

Singleton pattern
-----------------
Each getter lazily constructs the client on first call and caches it for
the lifetime of the process.  Call the corresponding ``reset_*`` helper in
tests to force re-initialisation with different settings.
"""

from openai import AsyncOpenAI

from app.core.config import settings

# ---------------------------------------------------------------------------
# Chat client — vLLM (Qwen2.5-7B-Instruct-AWQ)
# ---------------------------------------------------------------------------

_chat_client: AsyncOpenAI | None = None


def get_chat_client() -> AsyncOpenAI:
    """Return the singleton chat client pointed at the vLLM chat container.

    Lazily constructed on first call using ``settings.VLLM_CHAT_BASE_URL``
    and ``settings.LLM_API_KEY``.

    Returns:
        A configured :class:`openai.AsyncOpenAI` instance for text
        generation / SSE streaming.
    """
    global _chat_client
    if _chat_client is None:
        _chat_client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.VLLM_CHAT_BASE_URL,
        )
    return _chat_client


def reset_chat_client() -> None:
    """Reset the chat client singleton.

    Forces the next :func:`get_chat_client` call to construct a fresh
    client.  Useful in tests that override ``settings`` between cases.
    """
    global _chat_client
    _chat_client = None


# ---------------------------------------------------------------------------
# Embed client — infinity-emb (BAAI/bge-base-en-v1.5)
# ---------------------------------------------------------------------------

_embed_client: AsyncOpenAI | None = None


def get_embed_client() -> AsyncOpenAI:
    """Return the singleton embed client pointed at the infinity-emb container.

    Lazily constructed on first call using ``settings.VLLM_EMBED_BASE_URL``
    and ``settings.LLM_API_KEY``.

    Returns:
        A configured :class:`openai.AsyncOpenAI` instance for generating
        embedding vectors via the ``/v1/embeddings`` endpoint.
    """
    global _embed_client
    if _embed_client is None:
        _embed_client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.VLLM_EMBED_BASE_URL,
        )
    return _embed_client


def reset_embed_client() -> None:
    """Reset the embed client singleton.

    Forces the next :func:`get_embed_client` call to construct a fresh
    client.  Useful in tests that override ``settings`` between cases.
    """
    global _embed_client
    _embed_client = None
