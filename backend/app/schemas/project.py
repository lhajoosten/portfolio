from pydantic import BaseModel, field_validator
from datetime import datetime
from uuid import UUID
import re


class ProjectBase(BaseModel):
    title: str
    description: str
    content: str | None = None
    tags: list[str] = []
    tech_stack: list[str] = []
    live_url: str | None = None
    repo_url: str | None = None
    image_url: str | None = None
    featured: bool = False
    published: bool = False
    order: int = 0


class ProjectCreate(ProjectBase):
    slug: str | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def generate_slug(cls, v, info):
        if v:
            return v
        title = info.data.get("title", "")
        return re.sub(r"[^a-z0-9-]", "-", title.lower()).strip("-")


class ProjectUpdate(ProjectBase):
    title: str | None = None
    description: str | None = None


class ProjectResponse(ProjectBase):
    id: UUID
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
