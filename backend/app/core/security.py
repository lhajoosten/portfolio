from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: The value stored in the ``sub`` claim — typically the user's ID.
        expires_delta: Override the default expiry window from settings.

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(UTC)}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    """
    Decode and verify a JWT access token.

    Args:
        token: The raw JWT string.

    Returns:
        The ``sub`` claim (user ID) if the token is valid.

    Raises:
        ValueError: If the token is invalid, expired, or missing the ``sub`` claim.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc

    subject: str | None = payload.get("sub")
    if subject is None:
        raise ValueError("Token is missing 'sub' claim")
    return subject
