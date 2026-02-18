"""FastAPI dependency functions for authentication and authorisation.

This module provides the ``get_current_user`` and ``get_current_superuser``
dependencies that protect write endpoints.

Authentication strategy
-----------------------
The backend supports **two token delivery mechanisms** so both browser clients
and API clients (curl, tests, Swagger UI) work without any changes:

1. **httpOnly cookie** (``access_token``) — set by ``POST /auth/login``.
   The browser sends it automatically on every request.  This is the
   preferred channel for the portfolio frontend because the token is
   inaccessible to JavaScript, eliminating XSS token-theft.

2. **Bearer header** (``Authorization: Bearer <token>``) — the fallback used
   by API clients, automated tests, and the OpenAPI ``/docs`` UI.

The cookie is checked first.  If absent, the ``Authorization`` header is
inspected.  If neither is present, HTTP 401 is returned.

Usage::

    from app.core.deps import get_current_user, get_current_superuser

    @router.get("/admin/something")
    async def admin_endpoint(
        current_user: UserResponse = Depends(get_current_superuser),
    ) -> ...:
        ...
"""

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_db
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse
from app.services.auth_service import AuthService, InactiveUserError

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """Construct an :class:`~app.services.auth_service.AuthService` instance.

    This is a private helper used only within this module.  External callers
    should depend on :func:`get_current_user` or :func:`get_current_superuser`
    instead.

    Args:
        db: Injected async database session.

    Returns:
        A fresh :class:`~app.services.auth_service.AuthService` bound to a
        new :class:`~app.repositories.user_repository.UserRepository`.
    """
    return AuthService(UserRepository())


async def _extract_token(
    request: Request,
    access_token: str | None = Cookie(default=None),
) -> str:
    """Extract the JWT from the request — cookie first, then Bearer header.

    Implements the dual-channel strategy described in the module docstring.

    Args:
        request: The current FastAPI request, used to read the
            ``Authorization`` header when no cookie is present.
        access_token: Value of the ``access_token`` httpOnly cookie, injected
            by FastAPI's ``Cookie`` dependency.  ``None`` when absent.

    Returns:
        The raw JWT string.

    Raises:
        HTTPException: HTTP 401 when no token is found in either channel.
    """
    # 1. httpOnly cookie — preferred for browser clients
    if access_token:
        return access_token

    # 2. Bearer header — fallback for API clients / tests
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[len("Bearer ") :]

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# Public dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    token: str = Depends(_extract_token),
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(_get_auth_service),
) -> UserResponse:
    """Resolve the authenticated user from a JWT token.

    Reads the token via :func:`_extract_token` (cookie → Bearer header),
    decodes and verifies it with :func:`~app.core.security.decode_access_token`,
    then fetches the user record from the database.

    Args:
        token: Raw JWT string extracted from cookie or header.
        db: Active async database session.
        auth_service: Auth service for user resolution.

    Returns:
        The authenticated :class:`~app.schemas.auth.UserResponse`.

    Raises:
        HTTPException: HTTP 401 when the token is invalid or expired.
        HTTPException: HTTP 403 when the account is inactive.

    Example::

        @router.get("/admin/me")
        async def admin_me(
            current_user: UserResponse = Depends(get_current_user),
        ) -> UserResponse:
            return current_user
    """
    try:
        user_id = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    try:
        return await auth_service.get_current_user(db, user_id=user_id)
    except InactiveUserError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=exc.message,
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_superuser(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Extend :func:`get_current_user` to enforce superuser privileges.

    Use this dependency on any CMS / admin endpoint that only the portfolio
    owner should access.  Regular authenticated users (``is_superuser=False``)
    are rejected with HTTP 403.

    Args:
        current_user: Resolved from :func:`get_current_user`.

    Returns:
        The authenticated superuser :class:`~app.schemas.auth.UserResponse`.

    Raises:
        HTTPException: HTTP 403 when the authenticated user is not a
            superuser.

    Example::

        @router.post("/projects/")
        async def create_project(
            data: ProjectCreate,
            _: UserResponse = Depends(get_current_superuser),
            db: AsyncSession = Depends(get_db),
            service: ProjectService = Depends(get_project_service),
        ) -> ProjectResponse:
            return await service.create(db, data)
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return current_user
