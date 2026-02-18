"""SQLAlchemy declarative base and shared model mixins.

This module defines the single ``Base`` class that every ORM model inherits
from, plus two re-usable mixins that standardise the primary-key and
timestamp columns across all tables.

Typical usage::

    from app.db.base import Base, TimestampMixin, UUIDMixin

    class MyModel(Base, UUIDMixin, TimestampMixin):
        __tablename__ = "my_table"
        ...
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base class for all SQLAlchemy ORM models.

    All application models must inherit from this class (in addition to the
    mixins below) so that Alembic autogenerate can detect them and
    ``Base.metadata`` always contains the full schema.
    """


class UUIDMixin:
    """Mixin that adds a UUID v4 primary key column named ``id``.

    The UUID is generated in Python (not by the database) so that the value
    is available immediately after instantiation, before the row is committed
    to the database — useful for building relationships in memory.

    Attributes:
        id: UUID primary key, auto-generated via :func:`uuid.uuid4`.

    Example::

        class Project(Base, UUIDMixin, TimestampMixin):
            __tablename__ = "projects"
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )


class TimestampMixin:
    """Mixin that adds ``created_at`` and ``updated_at`` audit columns.

    Both columns are timezone-aware and default to the current database
    time via ``server_default=func.now()``.  ``updated_at`` is refreshed
    automatically on every UPDATE via ``onupdate=func.now()``.

    Attributes:
        created_at: Timestamp set once when the row is first inserted.
        updated_at: Timestamp refreshed on every update to the row.

    Note:
        The timestamps are produced by the *database server*, not by Python,
        so they are unaffected by application-server clock skew.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
