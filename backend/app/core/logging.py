"""Structured logging configuration.

Provides JSON logging in production and readable console logging in
development. The `request_id` is injected into log records by the
`RequestIDMiddleware`.
"""

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """Formatter that outputs JSON strings for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record as a JSON string."""
        log_record: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }

        request_id = getattr(record, "request_id", None)
        if request_id:
            log_record["request_id"] = request_id

        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


class ConsoleFormatter(logging.Formatter):
    """Formatter that outputs readable text for local development."""

    def format(self, record: logging.LogRecord) -> str:
        """Format the log record as a readable string."""
        timestamp = datetime.fromtimestamp(record.created, tz=UTC).strftime("%Y-%m-%d %H:%M:%S")
        req_id = getattr(record, "request_id", None)
        req_id_str = f" [{req_id}]" if req_id else ""

        msg = f"{timestamp} | {record.levelname:<8} | {record.name}{req_id_str} - {record.getMessage()}"
        if record.exc_info:
            msg += f"\n{self.formatException(record.exc_info)}"
        return msg


def setup_logging() -> None:
    """Configure the Python logging system.

    Sets up the root logger with the appropriate formatter based on the
    current environment (JSON for production, text for development).
    """
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)

    # Remove existing handlers to avoid duplicate logs
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)

    if settings.ENVIRONMENT == "development":
        handler.setFormatter(ConsoleFormatter())
    else:
        handler.setFormatter(JSONFormatter())

    logger.addHandler(handler)

    # Intercept uvicorn and fastapi logs
    for logger_name in ("uvicorn", "uvicorn.access", "fastapi"):
        ext_logger = logging.getLogger(logger_name)
        ext_logger.handlers = [handler]
        ext_logger.propagate = False
