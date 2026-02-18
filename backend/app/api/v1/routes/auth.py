"""Authentication routes — login, current user, logout.

These are the only routes that touch the ``access_token`` httpOnly cookie.
All other protected routes read the cookie (or Bearer header) transparently
via the ``get_current_user`` dependency in ``app.core.deps``.

Cookie strategy
---------------
On a successful ``POST /auth/login`` the server sets an httpOnly, SameSite=Lax
cookie named ``access_token``.  The browser attaches it automatically to every
subsequent same-origin request.  The ``credentials: "include"`` setting in the
frontend Hey API client ensures cross-origin requests (dev proxy) also carry it.

The cookie is **not** accessible to JavaScript (``httpOnly=True``), so it cannot
be stolen by XSS attacks.

The ``POST /auth/logout`` endpoint clears the cookie server-side.  Because JWTs
are stateless there is no server-side session to invalidate — the client must
discard any in-memory copy of the token after calling this endpoint.

Secure flag
-----------
``secure=True`` is set in all non-development environments so the cookie is only
sent over HTTPS in production.  In development (``ENVIRONMENT="development"``)
it is omitted so localhost HTTP works without a self-signed certificate.

CORS note
---------
The ``SameSite=Lax`` policy is safe for the portfolio's same-origin use case.
If the frontend is ever served from a different domain the policy must be
changed to ``SameSite=None; Secure``.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import AuthenticationError, AuthService, InactiveUserError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# Cookie configuration
# ---------------------------------------------------------------------------

_COOKIE_NAME = "access_token"
_COOKIE_MAX_AGE = settings.JWT_EXPIRE_MINUTES * 60  # seconds
_COOKIE_SECURE = settings.ENVIRONMENT != "development"


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """Construct an :class:`~app.services.auth_service.AuthService` for a request.

    Args:
        db: Injected async database session.

    Returns:
        A fresh :class:`~app.services.auth_service.AuthService` bound to a new
        :class:`~app.repositories.user_repository.UserRepository`.
    """
    return AuthService(UserRepository())


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT access token",
)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Authenticate with email + password.

    On success the JWT access token is:

    1. Set as an httpOnly cookie (``access_token``) — used by the browser frontend.
    2. Returned in the response body — used by API clients, tests, and the
       OpenAPI ``/docs`` UI.

    Args:
        data: Login credentials — ``email`` and ``password``.
        response: FastAPI response object used to set the cookie.
        db: Active async database session.
        auth_service: Injected auth service.

    Returns:
        :class:`~app.schemas.auth.TokenResponse` containing the raw JWT and
        token type (``"bearer"``).

    Raises:
        HTTPException: HTTP 401 when the email is not found or the password
            is incorrect.  The error message is deliberately vague to avoid
            leaking whether the email exists.
        HTTPException: HTTP 403 when the account has been deactivated.

    Example::

        POST /api/v1/auth/login
        Content-Type: application/json

        {"email": "luc@example.com", "password": "supersecret"}

        → 200 OK
        Set-Cookie: access_token=<JWT>; HttpOnly; SameSite=Lax; Path=/
        {"access_token": "<JWT>", "token_type": "bearer"}
    """
    try:
        token_response = await auth_service.login(db, email=data.email, password=data.password)
    except AuthenticationError as exc:
        logger.warning("Failed login attempt for email=%s", data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=exc.message,
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InactiveUserError as exc:
        logger.warning("Inactive user login attempt for email=%s", data.email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=exc.message,
        ) from exc

    # Set httpOnly cookie for browser clients
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token_response.access_token,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )

    logger.info("Successful login for email=%s", data.email)
    return token_response


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
async def me(
    current_user: UserResponse = Depends(get_current_user),
) -> UserResponse:
    """Return the profile of the currently authenticated user.

    This endpoint is used by the frontend on app load to determine whether a
    valid session cookie exists and to populate the auth context.  It also
    serves as a liveness check for the auth system.

    Args:
        current_user: Resolved from the ``get_current_user`` dependency —
            reads the ``access_token`` cookie or the ``Authorization`` header.

    Returns:
        The :class:`~app.schemas.auth.UserResponse` for the authenticated user.
        The ``hashed_password`` field is never included in this response.

    Raises:
        HTTPException: HTTP 401 when no valid token is present.
        HTTPException: HTTP 403 when the account is inactive.

    Example::

        GET /api/v1/auth/me
        Cookie: access_token=<JWT>

        → 200 OK
        {
          "id": "...",
          "email": "luc@example.com",
          "is_active": true,
          "is_superuser": true,
          "created_at": "...",
          "updated_at": "..."
        }
    """
    return current_user


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Invalidate the current session",
)
async def logout(
    response: Response,
    _: UserResponse = Depends(get_current_user),
) -> None:
    """Log out the currently authenticated user.

    Clears the ``access_token`` httpOnly cookie so the browser stops sending
    it on subsequent requests.

    JWT tokens are stateless — there is no server-side session to invalidate.
    The token technically remains valid until its ``exp`` claim is reached.
    For the portfolio's use case (single owner, long-lived sessions) this is
    an acceptable trade-off.  If token revocation becomes a requirement,
    introduce a Redis-backed blocklist and check it in
    :func:`~app.core.deps.get_current_user`.

    Args:
        response: FastAPI response object used to delete the cookie.
        _: The authenticated user — required only to enforce that an active
            session exists before clearing it.  The value is intentionally
            discarded.

    Returns:
        ``None`` — HTTP 204 No Content.

    Raises:
        HTTPException: HTTP 401 when no valid token is present.

    Example::

        POST /api/v1/auth/logout
        Cookie: access_token=<JWT>

        → 204 No Content
        Set-Cookie: access_token=; Max-Age=0; Path=/
    """
    response.delete_cookie(
        key=_COOKIE_NAME,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
