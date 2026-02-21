"""Application settings loaded from environment variables.

All configuration is read from the environment (or a ``.env`` file in the
working directory) via ``pydantic-settings``.  Every field has a sensible
development default so the application starts without any ``.env`` file.

vLLM vs OpenAI
--------------
The backend is designed to work with **either** the real OpenAI API **or** a
self-hosted vLLM container that exposes an OpenAI-compatible endpoint.
Toggle between them with ``VLLM_ENABLED``:

- ``VLLM_ENABLED=false`` (default) — uses ``OPENAI_BASE_URL`` + ``OPENAI_MODEL``
- ``VLLM_ENABLED=true`` — uses ``VLLM_BASE_URL`` + ``VLLM_MODEL`` (served name)

Recommended model for RTX 4080 (16 GB VRAM): **Qwen/Qwen2.5-14B-Instruct-AWQ**
(~7.5 GB weights, ~8.5 GB left for KV cache).  Set these in ``backend/.env``::

    # root .env  (Docker Compose variable substitution)
    VLLM_MODEL_HF_ID=Qwen/Qwen2.5-14B-Instruct-AWQ
    VLLM_MODEL=qwen2.5-14b

    # backend/.env  (pydantic-settings)
    VLLM_ENABLED=true
    VLLM_MODEL=qwen2.5-14b
    VLLM_BASE_URL=http://vllm:8000/v1

Example ``backend/.env``::

    VLLM_ENABLED=true
    VLLM_MODEL_HF_ID=Qwen/Qwen2.5-14B-Instruct-AWQ
    VLLM_MODEL=qwen2.5-14b
    OPENAI_API_KEY=local-dev-key
    JWT_SECRET=change-me-in-production
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.constants import ACCESS_TOKEN_EXPIRE_MINUTES, OPENAI_CHAT_MODEL, VLLM_CHAT_MODEL


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
        OPENAI_API_KEY: API key for OpenAI **or** the vLLM container (vLLM
            accepts any non-empty string when ``--api-key`` is not set).
        OPENAI_BASE_URL: Base URL for the OpenAI-compatible API.  Set to
            ``http://vllm:8000/v1`` when using the vLLM container.
        OPENAI_MODEL: Chat model name used when ``VLLM_ENABLED=false``.
        VLLM_ENABLED: Switch to the vLLM container as the AI provider.
        VLLM_MODEL_HF_ID: HuggingFace repository path that the vLLM container
            downloads and serves (e.g. ``"Qwen/Qwen2.5-14B-Instruct-AWQ"``).  This
            is passed as ``--model`` to the vLLM process.
        VLLM_MODEL: The **served model name** advertised by the vLLM
            OpenAI-compatible API (``--served-model-name``).  The backend uses
            this as the ``model`` parameter in every completion call so the
            actual HF repo path never leaks into application code.
        VLLM_BASE_URL: Base URL of the vLLM container's OpenAI-compatible
            endpoint (default ``"http://vllm:8000/v1"``).
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
    FIRST_SUPERUSER_PASSWORD: str = "admin"

    # ---------------------------------------------------------------------------
    # OpenAI-compatible provider (OpenAI API or vLLM)
    #
    # When VLLM_ENABLED=false (default):
    #   uses OPENAI_BASE_URL  +  OPENAI_MODEL
    #
    # When VLLM_ENABLED=true:
    #   uses VLLM_BASE_URL  +  VLLM_MODEL  (the served name)
    #   vLLM loads the weights from VLLM_MODEL_HF_ID
    # ---------------------------------------------------------------------------
    OPENAI_API_KEY: str = "local-dev-key"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = OPENAI_CHAT_MODEL

    # vLLM — self-hosted OSS inference (profile: vllm in docker-compose.yml)
    VLLM_ENABLED: bool = False

    # HuggingFace repo the vLLM container downloads (--model flag).
    # Must be an AWQ-quantized variant to fit in 16 GB VRAM.
    # Recommended: "Qwen/Qwen2.5-14B-Instruct-AWQ"
    VLLM_MODEL_HF_ID: str = VLLM_CHAT_MODEL

    # Served model name advertised by the vLLM API (--served-model-name flag).
    # The backend always uses this value as the `model` parameter — the
    # actual HF repo path never appears in application code.
    VLLM_MODEL: str = VLLM_CHAT_MODEL

    VLLM_BASE_URL: str = "http://vllm:8000/v1"

    # ---------------------------------------------------------------------------
    # CORS
    # ---------------------------------------------------------------------------
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # ---------------------------------------------------------------------------
    # Computed properties
    # ---------------------------------------------------------------------------

    @property
    def active_model(self) -> str:
        """Return the model name that will be passed to the AI provider.

        When ``VLLM_ENABLED`` is ``True`` this returns ``VLLM_MODEL`` (the
        served name, e.g. ``"qwen2.5-14b"``).  When ``False`` it returns
        ``OPENAI_MODEL`` (e.g. ``"gpt-4o"``).

        Returns:
            The string passed as ``model=`` in every
            ``chat.completions.create`` call.
        """
        return self.VLLM_MODEL if self.VLLM_ENABLED else self.OPENAI_MODEL

    @property
    def active_base_url(self) -> str:
        """Return the base URL for the currently active AI provider.

        Returns:
            ``VLLM_BASE_URL`` when ``VLLM_ENABLED`` is ``True``, otherwise
            ``OPENAI_BASE_URL``.
        """
        return self.VLLM_BASE_URL if self.VLLM_ENABLED else self.OPENAI_BASE_URL


settings = Settings()
