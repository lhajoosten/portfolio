import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    PortfolioError,
    ValidationError,
)
from app.core.middleware import RequestIDMiddleware

logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def register_middlewares(app: FastAPI) -> None:
    """Register all custom middleware. Order matters — outermost is registered last."""
    app.add_middleware(RequestIDMiddleware)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def handle_not_found(request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"detail": exc.message, "request_id": _request_id(request)},
        )

    @app.exception_handler(ConflictError)
    async def handle_conflict(request: Request, exc: ConflictError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"detail": exc.message, "request_id": _request_id(request)},
        )

    @app.exception_handler(ValidationError)
    async def handle_validation(request: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"detail": exc.message, "request_id": _request_id(request)},
        )

    @app.exception_handler(ExternalServiceError)
    async def handle_external_service(request: Request, exc: ExternalServiceError) -> JSONResponse:
        return JSONResponse(
            status_code=502,
            content={"detail": exc.message, "request_id": _request_id(request)},
        )

    @app.exception_handler(PortfolioError)
    async def handle_portfolio_error(request: Request, exc: PortfolioError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": exc.message, "request_id": _request_id(request)},
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "Unhandled application error [request_id=%s]: %s",
            _request_id(request),
            exc,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "request_id": _request_id(request),
            },
        )
