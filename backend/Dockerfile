FROM python:3.12-slim

WORKDIR /app

# Install uv from the official distroless image (no pip required)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies first — this layer is cached unless pyproject.toml changes
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen

# Copy application source
COPY . .

EXPOSE 8000

# Default: run migrations then start with hot-reload (dev).
# Production docker-compose overrides this CMD with a non-reload variant.
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
