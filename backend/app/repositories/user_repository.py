"""Database access layer for User models.

This module provides the :class:`UserRepository` which encapsulates all
SQLAlchemy queries related to the :class:`~app.models.user.User` model.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Repository for managing User records in the database."""

    async def get_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> User | None:
        """Retrieve a user by their UUID.

        Args:
            db: Active async database session.
            user_id: The UUID of the user to retrieve.

        Returns:
            The :class:`~app.models.user.User` instance if found, else ``None``.
        """
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        """Retrieve a user by their email address.

        Args:
            db: Active async database session.
            email: The email address to search for.

        Returns:
            The :class:`~app.models.user.User` instance if found, else ``None``.
        """
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        *,
        email: str,
        hashed_password: str,
        is_superuser: bool = False,
    ) -> User:
        """Create a new user record.

        Args:
            db: Active async database session.
            email: The user's email address.
            hashed_password: The bcrypt-hashed password.
            is_superuser: Whether the user has superuser privileges.

        Returns:
            The newly created and persisted :class:`~app.models.user.User` instance.
        """
        user = User(
            email=email,
            hashed_password=hashed_password,
            is_superuser=is_superuser,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    async def update_password(self, db: AsyncSession, user: User, hashed_password: str) -> User:
        """Update a user's password.

        Args:
            db: Active async database session.
            user: The user instance to update.
            hashed_password: The new bcrypt-hashed password.

        Returns:
            The updated :class:`~app.models.user.User` instance.
        """
        user.hashed_password = hashed_password
        await db.commit()
        await db.refresh(user)
        return user

    async def deactivate(self, db: AsyncSession, user: User) -> User:
        """Deactivate a user account.

        Sets ``is_active=False`` on the user record.

        Args:
            db: Active async database session.
            user: The user instance to deactivate.

        Returns:
            The updated :class:`~app.models.user.User` instance.
        """
        user.is_active = False
        await db.commit()
        await db.refresh(user)
        return user
