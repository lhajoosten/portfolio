#!/usr/bin/env python3
"""Seed the database with an initial superuser."""

import asyncio
import logging
import sys
from pathlib import Path

# Ensure the 'app' module can be imported when running as a script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.repositories.user_repository import UserRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed() -> None:
    """Create the initial superuser if it doesn't exist."""
    logger.info("Seeding initial superuser...")

    if not settings.FIRST_SUPERUSER_EMAIL or not settings.FIRST_SUPERUSER_PASSWORD:
        logger.error("FIRST_SUPERUSER_EMAIL and FIRST_SUPERUSER_PASSWORD must be set.")
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        repo = UserRepository()
        user = await repo.get_by_email(db, email=settings.FIRST_SUPERUSER_EMAIL)

        if user:
            logger.info(f"Superuser {settings.FIRST_SUPERUSER_EMAIL} already exists.")
            return

        hashed_pw = hash_password(settings.FIRST_SUPERUSER_PASSWORD)

        # We use the model directly here to bypass any Pydantic schema requirements
        # that might be specific to the repository's create method.
        new_user = User(
            email=settings.FIRST_SUPERUSER_EMAIL,
            hashed_password=hashed_pw,
            is_superuser=True,
            is_active=True,
        )
        db.add(new_user)
        await db.commit()

        logger.info(f"Superuser {settings.FIRST_SUPERUSER_EMAIL} created successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
