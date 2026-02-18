from openai import AsyncOpenAI

from app.core.config import settings

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.active_base_url,
        )
    return _client


def reset_client() -> None:
    """Reset the singleton — useful when settings change (e.g. in tests)."""
    global _client
    _client = None
