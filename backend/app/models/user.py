"""ORM model for the Users domain.

Represents an admin user in the ``users`` table.  The portfolio has a single
owner (superuser) who can manage all content via the CMS.  This model is
intentionally minimal — there is no public registration flow, no profile
picture, no display name.  Authentication is handled by
:mod:`app.core.security` and :mod:`app.services.auth_service`.

Example::

    user = User(
        email="luc@example.com",
        hashed_password=hash_password("supersecret"),
        is_superuser=True,
    )
    db.add(user)
    await db.commit()
"""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    """SQLAlchemy ORM model representing an admin user.

    Inherits a UUID primary key from :class:`~app.db.base.UUIDMixin` and
    ``created_at`` / ``updated_at`` audit columns from
    :class:`~app.db.base.TimestampMixin`.

    Passwords are **never** stored in plain text.  The
    :func:`~app.core.security.hash_password` utility must be used to produce
    the ``hashed_password`` value before persisting the record.

    Attributes:
        email: Unique email address used as the login identifier.
            Indexed for fast lookup during authentication.
        hashed_password: bcrypt hash of the user's password.  Never
            expose this field in API responses.
        is_active: When ``False`` the user cannot log in even if they
            present valid credentials.  Use this to suspend accounts
            without deleting them.
        is_superuser: When ``True`` the user has full CMS access to all
            write endpoints.  Regular (non-super) users can only read
            public content.

    Note:
        The ``UserResponse`` Pydantic schema (in :mod:`app.schemas.auth`)
        intentionally omits ``hashed_password`` — never add it back.
    """

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
