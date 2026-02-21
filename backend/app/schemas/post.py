"""Pydantic schemas for the Posts / Blog domain.

These schemas define the request and response shapes for the post API
endpoints, handling validation and serialisation.
"""

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ValidationInfo, field_validator


class PostBase(BaseModel):
    """Base schema containing common fields for a blog post."""

    title: str
    excerpt: str
    body: str | None = None
    tags: list[str] = []
    cover_image_url: str | None = None
    published: bool = False
    reading_time_minutes: int | None = None


class PostCreate(PostBase):
    """Schema for creating a new blog post.

    If a ``slug`` is not provided, one is automatically generated from the
    ``title`` field.
    """

    slug: str | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def generate_slug(cls, v: str | None, info: ValidationInfo) -> str:
        """Generate a URL-friendly slug from the title if none is provided."""
        if v:
            return v
        title = info.data.get("title", "")
        return re.sub(r"[^a-z0-9-]", "-", title.lower()).strip("-")


class PostUpdate(BaseModel):
    """Schema for updating an existing blog post.

    All fields are optional. Only provided fields will be updated.
    """

    title: str | None = None
    slug: str | None = None
    excerpt: str | None = None
    body: str | None = None
    tags: list[str] | None = None
    cover_image_url: str | None = None
    published: bool | None = None
    reading_time_minutes: int | None = None


class PostResponse(PostBase):
    """Schema for returning a blog post in API responses.

    Includes database-generated fields like ``id``, ``slug``, and timestamps.
    """

    id: UUID
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
