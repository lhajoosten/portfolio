"""API routes for the Certifications domain.

Provides endpoints for creating, reading, updating, and deleting certification
records. Write operations are protected by superuser authentication.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_superuser
from app.db.session import get_db
from app.repositories.certification_repository import CertificationRepository
from app.schemas.auth import UserResponse
from app.schemas.certification import (
    CertificationCreate,
    CertificationResponse,
    CertificationUpdate,
)
from app.services.certification_service import CertificationService

router = APIRouter(prefix="/certifications", tags=["certifications"])


def get_certification_service(db: AsyncSession = Depends(get_db)) -> CertificationService:
    """Construct a CertificationService bound to the current database session."""
    _ = db
    return CertificationService(CertificationRepository())


@router.get("/", response_model=list[CertificationResponse])
async def get_certifications(
    featured_only: bool = False,
    db: AsyncSession = Depends(get_db),
    service: CertificationService = Depends(get_certification_service),
) -> list[CertificationResponse]:
    """Retrieve a list of certifications.

    Args:
        featured_only: If ``True``, returns only featured certifications.
            Defaults to ``False`` (return all certifications).
        db: Active async database session.
        service: Injected certification service.

    Returns:
        A list of :class:`~app.schemas.certification.CertificationResponse`
        objects ordered by ``issued_at`` descending (most recent first).
    """
    return await service.get_all(db, featured_only=featured_only)


@router.get("/{cert_id}", response_model=CertificationResponse)
async def get_certification(
    cert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    service: CertificationService = Depends(get_certification_service),
) -> CertificationResponse:
    """Retrieve a single certification by its UUID.

    Args:
        cert_id: The UUID primary key of the certification.
        db: Active async database session.
        service: Injected certification service.

    Returns:
        The requested :class:`~app.schemas.certification.CertificationResponse`.

    Raises:
        HTTPException: HTTP 404 if the certification is not found.
    """
    return await service.get_by_id(db, cert_id)


@router.post("/", response_model=CertificationResponse, status_code=201)
async def create_certification(
    data: CertificationCreate,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: CertificationService = Depends(get_certification_service),
) -> CertificationResponse:
    """Create a new certification record.

    Requires superuser privileges.

    Args:
        data: The certification creation payload.
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected certification service.

    Returns:
        The newly created :class:`~app.schemas.certification.CertificationResponse`.
    """
    return await service.create(db, data)


@router.patch("/{cert_id}", response_model=CertificationResponse)
async def update_certification(
    cert_id: uuid.UUID,
    data: CertificationUpdate,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: CertificationService = Depends(get_certification_service),
) -> CertificationResponse:
    """Update an existing certification record.

    Requires superuser privileges.

    Args:
        cert_id: The UUID of the certification to update.
        data: The certification update payload (partial).
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected certification service.

    Returns:
        The updated :class:`~app.schemas.certification.CertificationResponse`.

    Raises:
        HTTPException: HTTP 404 if the certification is not found.
    """
    return await service.update(db, cert_id, data)


@router.delete("/{cert_id}", status_code=204)
async def delete_certification(
    cert_id: uuid.UUID,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: CertificationService = Depends(get_certification_service),
) -> None:
    """Delete a certification record.

    Requires superuser privileges.

    Args:
        cert_id: The UUID of the certification to delete.
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected certification service.

    Raises:
        HTTPException: HTTP 404 if the certification is not found.
    """
    await service.delete(db, cert_id)
