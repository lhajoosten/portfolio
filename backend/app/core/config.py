"""Application settings loaded from environment variables.

All configuration is read from the environment (or a ``.env`` file in the
working directory) via ``pydantic-settings``.  Every field has a sensible
development default so the application starts without any ``.env`` file.

AI providers
------------
The portfolio uses two fully-local, free AI services — both exposed via
OpenAI-compatible HTTP APIs so the ``openai`` Python SDK works unchanged:

``vllm-chat``
    vLLM serving ``Qwen/Qwen2.5-7B-Instruct-AWQ`` for the writing assistant.
    Activated with the ``vllm`` Docker Compose profile.
    Endpoint: ``http://vllm-chat:8000/v1``

``infinity``
    infinity-emb serving ``BAAI/bge-base-en-v1.5`` for RAG embeddings.
    Activated with the ``vllm`` Docker Compose profile.
    Endpoint: ``http://infinity:7997/v1``

Both containers cache downloaded model weights in named Docker volumes so
the first-run download only happens once.

Example ``backend/.env``::

    # Database
    DATABASE_URL=postgresql+asyncpg://portfolio:portfolio@db:5432/portfolio

    # Auth
    JWT_SECRET=change-me-in-production

    # AI — vLLM chat container
    VLLM_CHAT_BASE_URL=http://vllm-chat:8000/v1
    VLLM_CHAT_MODEL=qwen2.5-7b

    # AI — infinity-emb container
    VLLM_EMBED_BASE_URL=http://infinity:7997/v1
    VLLM_EMBED_MODEL=BAAI/bge-base-en-v1.5
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.constants import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    VLLM_CHAT_MODEL,
    VLLM_EMBED_MODEL,
)


class Settings(BaseSettings):
    """Application-wide settings sourced from environment variables / ``.env``.

    Attributes:
        ENVIRONMENT: Runtime environment tag (``"development"`` | ``"staging"``
            | ``"production"``).  Controls cookie ``Secure`` flag and log
            verbosity.
        DEBUG: When ``True`` SQLAlchemy echoes every SQL statement to stdout.
            Always ``False`` in production.
        DATABASE_URL: Async SQLAlchemy connection string.  Must use the
            ``postgresql+asyncpg://`` scheme.
        DB_POOL_SIZE: Number of persistent connections in the connection pool.
        DB_MAX_OVERFLOW: Extra connections allowed beyond ``DB_POOL_SIZE``
            during traffic spikes.
        DB_POOL_TIMEOUT: Seconds to wait for a connection before raising
            ``TimeoutError``.
        DB_POOL_RECYCLE: Seconds after which idle connections are recycled to
            avoid being cut by a firewall or the server's ``wait_timeout``.
        JWT_SECRET: HMAC signing key for JWT tokens.  **Must** be overridden
            in production with a long random string.
        JWT_ALGORITHM: JWT signing algorithm (default ``"HS256"``).
        JWT_EXPIRE_MINUTES: Token lifetime in minutes.
        FIRST_SUPERUSER_EMAIL: Email address for the initial superuser account.
        FIRST_SUPERUSER_PASSWORD: Password for the initial superuser account.
        LLM_API_KEY: Dummy API key sent to both vLLM and infinity-emb.
            Neither service validates the key value — any non-empty string
            works.  Kept as a single field so the ``openai`` SDK does not
            complain about a missing ``api_key``.
        VLLM_CHAT_BASE_URL: Base URL of the vLLM chat container's
            OpenAI-compatible endpoint.  Default resolves to the Docker
            Compose service name ``vllm-chat``.
        VLLM_CHAT_MODEL: Served model name advertised by the vLLM chat API
            (``--served-model-name``).  Must match the value passed to the
            vLLM process.  Defaults to ``"qwen2.5-7b"``.
        VLLM_EMBED_BASE_URL: Base URL of the infinity-emb container's
            OpenAI-compatible endpoint.  Default resolves to the Docker
            Compose service name ``infinity``.
        VLLM_EMBED_MODEL: Model name served by infinity-emb.  For
            ``BAAI/bge-base-en-v1.5`` this is the HuggingFace repo path
            itself, which infinity-emb uses directly as the API model
            identifier.
        CORS_ORIGINS: Allowed origins for the CORS middleware.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ---------------------------------------------------------------------------
    # App
    # ---------------------------------------------------------------------------
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # ---------------------------------------------------------------------------
    # Database
    # ---------------------------------------------------------------------------
    DATABASE_URL: str = "postgresql+asyncpg://portfolio:portfolio@localhost:5432/portfolio"

    # Connection pool — see app/db/session.py
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # 30 min — prevent stale connections after firewall idle cut

    # ---------------------------------------------------------------------------
    # Auth / JWT
    # ---------------------------------------------------------------------------
    JWT_SECRET: str = "changeme"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = ACCESS_TOKEN_EXPIRE_MINUTES
    FIRST_SUPERUSER_EMAIL: str = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "mysuperstrongpassword"

    # ---------------------------------------------------------------------------
    # AI — shared dummy API key
    #
    # Both vLLM and infinity-emb accept any non-empty string when
    # --api-key is not configured on the server side.  A single field here
    # avoids duplicating the "not a real key" pattern.
    # ---------------------------------------------------------------------------
    LLM_API_KEY: str = "vllm-local"

    # ---------------------------------------------------------------------------
    # AI — vLLM chat container  (writing assistant)
    #
    # Docker Compose service: vllm-chat
    # Model:  Qwen/Qwen2.5-7B-Instruct-AWQ  (~4 GB VRAM, Ada Lovelace)
    # Port:   8001 → 8000 (container)
    # Profile: vllm
    # ---------------------------------------------------------------------------
    VLLM_CHAT_BASE_URL: str = "http://vllm-chat:8000/v1"
    VLLM_CHAT_MODEL: str = VLLM_CHAT_MODEL

    # ---------------------------------------------------------------------------
    # AI — infinity-emb container  (RAG embeddings)
    #
    # Docker Compose service: infinity
    # Model:  BAAI/bge-base-en-v1.5  (768 dims, CPU, ~440 MB)
    # Port:   8002 → 7997 (container)
    # Profile: vllm
    # ---------------------------------------------------------------------------
    VLLM_EMBED_BASE_URL: str = "http://infinity:7997/v1"
    VLLM_EMBED_MODEL: str = VLLM_EMBED_MODEL

    # ---------------------------------------------------------------------------
    # CORS
    # ---------------------------------------------------------------------------
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]


settings = Settings()
