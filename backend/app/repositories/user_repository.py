import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    async def get_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> User | None:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
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
        user.hashed_password = hashed_password
        await db.commit()
        await db.refresh(user)
        return user

    async def deactivate(self, db: AsyncSession, user: User) -> User:
        user.is_active = False
        await db.commit()
        await db.refresh(user)
        return user
