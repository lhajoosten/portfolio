# Auth & Security

This guide covers the authentication and security implementation in the portfolio backend — JWT tokens, httpOnly cookies, password hashing, and role-based access control.

For the high-level overview, see [Architecture](architecture.md).

---

## Overview

| Mechanism | Technology | Notes |
|---|---|---|
| Token format | JWT (HS256) | Signed with `SECRET_KEY` from settings |
| Token transport | `httpOnly` cookie | Never exposed to JavaScript — immune to XSS |
| Password hashing | bcrypt | Cost factor 12 |
| Session lifetime | Configurable | `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 30) |
| Authorisation | Superuser flag | `User.is_superuser` — simple RBAC for admin CMS |

---

## Login flow

```
POST /api/v1/auth/login  {email, password}
  → AuthService.login()
    → UserRepository.get_by_email()          — fetch user row
      → security.verify_password()           — bcrypt verify
        → security.create_access_token()     — sign JWT
          → Set-Cookie: access_token=<JWT>;
                        HttpOnly;
                        SameSite=Lax;
                        Path=/
```

On success the response sets an `httpOnly` cookie. The frontend never reads
the token value directly — the browser attaches it automatically to every
subsequent request (`credentials: 'include'` on the fetch client).

---

## JWT structure

```json
{
  "sub": "<user-uuid>",
  "exp": <unix-timestamp>
}
```

The `sub` claim holds the user's UUID. No other user data is embedded in the
token — the user row is fetched from the database on every authenticated request.

---

## Dependencies — `app.core.deps`

FastAPI dependency functions inject the authenticated user into route handlers:

```python
# Any authenticated user
async def get_current_user(
    token: str = Depends(get_token_from_cookie),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = security.decode_access_token(token)
    user = await user_repo.get(db, UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise InvalidCredentialsError
    return user


# Superuser only — use this for all admin CMS endpoints
async def require_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise InsufficientPermissionsError
    return current_user
```

Usage in a route:

```python
@router.get("/projects/", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
    project_service: ProjectService = Depends(get_project_service),
) -> list[ProjectResponse]:
    return await project_service.list(db, published_only=False)
```

---

## Password hashing — `app.core.security`

Passwords are hashed with bcrypt at cost factor 12:

```python
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())
```

Plain-text passwords are **never** stored or logged anywhere in the codebase.

---

## Token creation and verification

```python
def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, str]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError as exc:
        raise InvalidCredentialsError from exc
```

To invalidate **all** active sessions (e.g. after a security incident), rotate
`SECRET_KEY` in `.env` and restart the backend — all existing tokens will fail
verification immediately.

---

## Cookie configuration

The auth cookie is set with these attributes:

| Attribute | Value | Purpose |
|---|---|---|
| `HttpOnly` | `true` | JavaScript cannot read the token — prevents XSS token theft |
| `SameSite` | `Lax` | Sent on same-site navigations + top-level GET requests — prevents CSRF on mutations |
| `Secure` | `true` in production | Cookie only sent over HTTPS |
| `Path` | `/` | Cookie sent to all backend routes |
| `Max-Age` | `ACCESS_TOKEN_EXPIRE_MINUTES * 60` | Browser discards the cookie after expiry |

For local development `Secure` is `false` (HTTP only). Set `ENVIRONMENT=production`
to enable the `Secure` flag.

---

## Logout

```
POST /api/v1/auth/logout
  → Set-Cookie: access_token=; Max-Age=0; HttpOnly; Path=/
```

The logout endpoint clears the cookie by setting `Max-Age=0`. No server-side
token invalidation is performed — stateless JWT design. If you need immediate
revocation (e.g. for a compromised account), rotate `SECRET_KEY`.

---

## First superuser

On startup, the application checks whether any users exist. If the database is
empty, it creates an initial superuser using the credentials from `.env`:

```dotenv
FIRST_SUPERUSER_EMAIL=admin@example.com
FIRST_SUPERUSER_PASSWORD=changeme
```

**Change the password immediately after the first login in a deployed environment.**

---

## CORS

Cross-origin requests are controlled by the `BACKEND_CORS_ORIGINS` setting:

```dotenv
# Local development — allow the Vite dev server
BACKEND_CORS_ORIGINS=["http://localhost:5173"]

# Production — allow only the deployed frontend domain
BACKEND_CORS_ORIGINS=["https://lhajoosten.dev"]
```

The CORS middleware is configured with `allow_credentials=True` so that the
auth cookie is forwarded on cross-origin requests. This requires the frontend
to set `credentials: 'include'` on every fetch (handled automatically by the
Hey API client configuration in `lib/api-client.ts`).

---

## Security checklist

!!! warning "Before going to production"
    - [ ] Generate a strong `SECRET_KEY`: `openssl rand -hex 32`
    - [ ] Set `ENVIRONMENT=production` to enable `Secure` cookie flag
    - [ ] Update `BACKEND_CORS_ORIGINS` to your actual frontend domain
    - [ ] Change `FIRST_SUPERUSER_PASSWORD` and verify login works
    - [ ] Enable HTTPS (Nginx + Let's Encrypt or Cloudflare proxy)
    - [ ] Review `ACCESS_TOKEN_EXPIRE_MINUTES` — shorter = more secure, longer = less friction