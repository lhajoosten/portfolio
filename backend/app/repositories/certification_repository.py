"""Data-access layer for the Certifications domain.

This module contains :class:`CertificationRepository`, the **only** place in
the application that issues SQL queries against the ``certifications`` table.

Design rules enforced here:

- All methods are ``async`` — never use synchronous SQLAlchemy queries.
- The repository never raises domain exceptions for "not found" — it returns
  ``None`` and lets the service layer decide what to do.
- No business logic lives here: filtering, ordering, and embedding updates
  are considered data-access concerns; anything that involves rules or
  exception mapping belongs in :mod:`app.services.certification_service`.

Typical usage::

    repo = CertificationRepository()
    cert = await repo.get_by_id(db, cert_id)
    if cert is None:
        ...  # service raises CertificationNotFoundError
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.certification import Certification
from app.schemas.certification import CertificationCreate, CertificationUpdate


class CertificationRepository:
    """Handles all database queries for the :class:`~app.models.certification.Certification` model.

    Every method accepts an :class:`~sqlalchemy.ext.asyncio.AsyncSession` as
    its first argument so that the caller (typically a service or a test
    fixture) controls the transaction boundary.

    Methods that look up a single row return ``None`` when no row is found
    rather than raising an exception — the service layer is responsible for
    deciding whether a missing row is an error.
    """

    async def get_all(
        self,
        db: AsyncSession,
        *,
        featured_only: bool = False,
    ) -> list[Certification]:
        """Return a list of certifications, with an optional featured filter.

        Results are ordered by ``issued_at`` descending (most recently issued
        certifications appear first).

        Args:
            db: Active async database session.
            featured_only: When ``True``, only certifications where
                ``featured = TRUE`` are returned.

        Returns:
            A (possibly empty) list of
            :class:`~app.models.certification.Certification` ORM instances.
        """
        query = select(Certification).order_by(Certification.issued_at.desc())
        if featured_only:
            query = query.where(Certification.featured.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, db: AsyncSession, cert_id: uuid.UUID) -> Certification | None:
        """Look up a certification by its UUID primary key.

        Args:
            db: Active async database session.
            cert_id: The UUID of the certification to retrieve.

        Returns:
            The matching :class:`~app.models.certification.Certification`
            instance, or ``None`` if no certification with that ID exists.
        """
        result = await db.execute(select(Certification).where(Certification.id == cert_id))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, data: CertificationCreate) -> Certification:
        """Insert a new certification row into the database.

        Args:
            db: Active async database session.
            data: Validated creation payload from the API layer.

        Returns:
            The newly inserted :class:`~app.models.certification.Certification`
            instance with all server-generated fields (``id``, ``created_at``,
            ``updated_at``) populated via ``db.refresh()``.
        """
        cert = Certification(**data.model_dump())
        db.add(cert)
        await db.commit()
        await db.refresh(cert)
        return cert

    async def update(
        self,
        db: AsyncSession,
        cert: Certification,
        data: CertificationUpdate,
    ) -> Certification:
        """Apply a partial update to an existing certification.

        Only fields that are explicitly set in ``data`` (i.e. present in
        ``model_dump(exclude_unset=True)``) are written to the database.
        Fields not included in the update payload are left unchanged.

        Args:
            db: Active async database session.
            cert: The ORM instance to update.  Must already be attached
                to ``db`` (typically retrieved via :meth:`get_by_id` in the
                same session).
            data: Partial update payload.  Only non-``None`` / explicitly
                set fields are applied.

        Returns:
            The updated :class:`~app.models.certification.Certification`
            instance with refreshed field values from the database.
        """
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(cert, key, value)
        await db.commit()
        await db.refresh(cert)
        return cert

    async def delete(self, db: AsyncSession, cert: Certification) -> None:
        """Permanently delete a certification from the database.

        Args:
            db: Active async database session.
            cert: The ORM instance to delete.  Must already be attached
                to ``db``.
        """
        await db.delete(cert)
        await db.commit()

    async def update_embedding(
        self,
        db: AsyncSession,
        cert_id: uuid.UUID,
        embedding: list[float],
    ) -> None:
        """Persist a pgvector embedding on a certification row.

        Called by the RAG service after generating a new embedding for the
        certification's combined text content (name + issuer + description).
        If the certification no longer exists (e.g. was deleted between the
        embedding call and this write), the operation is silently skipped.

        Args:
            db: Active async database session.
            cert_id: UUID of the certification to update.
            embedding: A list of floats of length
                :data:`~app.core.constants.EMBEDDING_DIMENSIONS` (1 536).
        """
        cert = await self.get_by_id(db, cert_id)
        if not cert:
            return
        cert.content_embedding = embedding
        await db.commit()
