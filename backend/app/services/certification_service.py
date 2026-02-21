"""Business logic layer for the Certifications domain.

This module contains :class:`CertificationService`, which sits between the API
route handlers and the :class:`~app.repositories.certification_repository.CertificationRepository`.
All domain rules, validation beyond Pydantic, and exception mapping live here.

Route handlers must never access the repository directly — they go through
the service so that business rules are applied consistently regardless of
the caller.

Typical usage::

    service = CertificationService(CertificationRepository())
    certs = await service.get_all(db)
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import CertificationNotFoundError
from app.repositories.certification_repository import CertificationRepository
from app.schemas.certification import (
    CertificationCreate,
    CertificationResponse,
    CertificationUpdate,
)


class CertificationService:
    """Orchestrates all operations on the Certifications domain.

    Depends on :class:`~app.repositories.certification_repository.CertificationRepository`
    for all database access.  Raises typed domain exceptions (from
    ``app.core.exceptions``) on failure so that the global exception handlers
    in ``app.core.error_handlers`` can map them to the correct HTTP status
    codes without any try/except in the route layer.

    All public methods return Pydantic response schemas — never raw ORM
    objects — so the route layer never has to call ``model_validate``
    itself.

    Args:
        repo: The repository instance to delegate database queries to.
            Injected via
            :func:`~app.api.v1.routes.certifications.get_certification_service`.

    Example::

        service = CertificationService(CertificationRepository())
        response = await service.get_by_id(db, cert_id)
    """

    def __init__(self, repo: CertificationRepository) -> None:
        self.repo = repo

    async def get_all(
        self,
        db: AsyncSession,
        *,
        featured_only: bool = False,
    ) -> list[CertificationResponse]:
        """Return all certifications, optionally filtered to featured ones only.

        Args:
            db: Active async database session.
            featured_only: When ``True``, only certifications with
                ``featured=True`` are returned.  Defaults to ``False``
                (return all certifications).

        Returns:
            A list of :class:`~app.schemas.certification.CertificationResponse`
            objects ordered by ``issued_at`` descending (most recent first).
            Returns an empty list when no certifications match the filter.
        """
        certs = await self.repo.get_all(db, featured_only=featured_only)
        return [CertificationResponse.model_validate(cert) for cert in certs]

    async def get_by_id(self, db: AsyncSession, cert_id: uuid.UUID) -> CertificationResponse:
        """Return a single certification identified by its UUID.

        Args:
            db: Active async database session.
            cert_id: The UUID primary key of the certification to retrieve.

        Returns:
            The matching :class:`~app.schemas.certification.CertificationResponse`.

        Raises:
            CertificationNotFoundError: If no certification with the given ID
                exists.
        """
        cert = await self.repo.get_by_id(db, cert_id)
        if not cert:
            raise CertificationNotFoundError(f"Certification '{cert_id}' not found")
        return CertificationResponse.model_validate(cert)

    async def create(
        self,
        db: AsyncSession,
        data: CertificationCreate,
    ) -> CertificationResponse:
        """Create a new certification record and persist it to the database.

        Args:
            db: Active async database session.
            data: Validated creation payload.

        Returns:
            The newly created
            :class:`~app.schemas.certification.CertificationResponse`
            with server-assigned ``id``, ``created_at``, and ``updated_at``.
        """
        cert = await self.repo.create(db, data)
        return CertificationResponse.model_validate(cert)

    async def update(
        self,
        db: AsyncSession,
        cert_id: uuid.UUID,
        data: CertificationUpdate,
    ) -> CertificationResponse:
        """Partially update an existing certification identified by UUID.

        Only fields present in ``data`` (i.e. not ``None`` / unset) are
        written to the database.  All other fields are left unchanged.

        Args:
            db: Active async database session.
            cert_id: UUID identifying the certification to update.
            data: Partial update payload — only provided fields are applied.

        Returns:
            The updated :class:`~app.schemas.certification.CertificationResponse`.

        Raises:
            CertificationNotFoundError: If no certification with the given ID
                exists.
        """
        cert = await self.repo.get_by_id(db, cert_id)
        if not cert:
            raise CertificationNotFoundError(f"Certification '{cert_id}' not found")
        updated = await self.repo.update(db, cert, data)
        return CertificationResponse.model_validate(updated)

    async def delete(self, db: AsyncSession, cert_id: uuid.UUID) -> None:
        """Permanently delete a certification from the database.

        Args:
            db: Active async database session.
            cert_id: UUID identifying the certification to delete.

        Raises:
            CertificationNotFoundError: If no certification with the given ID
                exists.
        """
        cert = await self.repo.get_by_id(db, cert_id)
        if not cert:
            raise CertificationNotFoundError(f"Certification '{cert_id}' not found")
        await self.repo.delete(db, cert)
