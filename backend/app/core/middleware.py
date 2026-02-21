import logging
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Stamps every request with a unique X-Request-ID header.

    - If the client sends an X-Request-ID header it is preserved (useful for
      tracing across services / from the frontend).
    - Otherwise a new UUID4 is generated.
    - The ID is always echoed back in the response headers so the client can
      correlate logs.
    - The request ID is injected into the log context for the duration of the
      request via a LogRecord filter so all log lines within a request carry it.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())

        # Make the request ID available downstream via request.state
        request.state.request_id = request_id

        # Add request ID to log context for this request
        _filter = _RequestIDFilter(request_id)
        logging.getLogger().addFilter(_filter)

        try:
            response = await call_next(request)
        finally:
            logging.getLogger().removeFilter(_filter)

        response.headers[REQUEST_ID_HEADER] = request_id
        return response


class _RequestIDFilter(logging.Filter):
    """Injects ``request_id`` into every LogRecord while active."""

    def __init__(self, request_id: str) -> None:
        super().__init__()
        self.request_id = request_id

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = self.request_id
        return True
