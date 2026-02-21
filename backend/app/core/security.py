"""Security utilities — password hashing and JWT token management.

Uses ``bcrypt`` directly (no passlib) for full compatibility with bcrypt 5.x.
``python-jose`` handles JWT signing and verification.
"""

from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def hash_password(plain: str) -> str:
    """Hash a plain-text password using bcrypt.

    Args:
        plain: The raw password string to hash.

    Returns:
        A bcrypt-hashed string suitable for storage.
    """
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash.

    Args:
        plain: The raw password to check.
        hashed: The stored bcrypt hash to check against.

    Returns:
        ``True`` if the password matches the hash, ``False`` otherwise.
    """
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token.

    Args:
        subject: The value stored in the ``sub`` claim — typically the user's ID.
        expires_delta: Override the default expiry window from settings.

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES))
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(UTC)}
    return str(jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM))


def decode_access_token(token: str) -> str:
    """Decode and verify a JWT access token.

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
