"""Pydantic schemas for the Certifications domain.

These schemas define the request and response shapes for the certification API
endpoints, handling validation and serialisation.
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class CertificationBase(BaseModel):
    """Base schema containing common fields for a certification."""

    name: str
    issuer: str
    description: str | None = None
    issued_at: date
    expires_at: date | None = None
    credential_id: str | None = None
    credential_url: str | None = None
    badge_image_url: str | None = None
    featured: bool = False


class CertificationCreate(CertificationBase):
    """Schema for creating a new certification record."""


class CertificationUpdate(BaseModel):
    """Schema for updating an existing certification record.

    All fields are optional. Only provided fields will be updated.
    """

    name: str | None = None
    issuer: str | None = None
    description: str | None = None
    issued_at: date | None = None
    expires_at: date | None = None
    credential_id: str | None = None
    credential_url: str | None = None
    badge_image_url: str | None = None
    featured: bool | None = None


class CertificationResponse(CertificationBase):
    """Schema for returning a certification in API responses.

    Includes database-generated fields like ``id`` and timestamps.
    """

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
