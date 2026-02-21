"""Pydantic schemas for authentication and user management.

These schemas define the request and response shapes for the auth API
endpoints, handling validation and serialisation.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Schema for login credentials."""

    email: str
    password: str


class TokenResponse(BaseModel):
    """Schema for returning a JWT access token."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Schema for returning a user profile.

    The ``hashed_password`` field is deliberately excluded from this schema
    so it is never accidentally leaked in API responses.
    """

    id: UUID
    email: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
