"""Data-access layer for the Projects domain.

This module contains :class:`ProjectRepository`, the **only** place in the
application that issues SQL queries against the ``projects`` table.

Design rules enforced here:

- All methods are ``async`` — never use synchronous SQLAlchemy queries.
- The repository never raises domain exceptions for "not found" — it returns
  ``None`` and lets the service layer decide what to do.
- No business logic lives here: filtering, ordering, and embedding updates
  are considered data-access concerns; anything that involves rules or
  exception mapping belongs in :mod:`app.services.project_service`.

Typical usage::

    repo = ProjectRepository()
    project = await repo.get_by_slug(db, "my-portfolio-site")
    if project is None:
        ...  # service raises ProjectNotFoundError
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectRepository:
    """Handles all database queries for the :class:`~app.models.project.Project` model.

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
        published_only: bool = True,
        featured_only: bool = False,
    ) -> list[Project]:
        """Return a list of projects, with optional published / featured filters.

        Results are ordered by ``order`` ascending (lower numbers appear
        first), then by ``created_at`` descending (newest within the same
        order value appears first).

        Args:
            db: Active async database session.
            published_only: When ``True`` (default), only projects where
                ``published = TRUE`` are returned.
            featured_only: When ``True``, only projects where
                ``featured = TRUE`` are returned.  Can be combined with
                ``published_only``.

        Returns:
            A (possibly empty) list of :class:`~app.models.project.Project`
            ORM instances.
        """
        query = select(Project).order_by(Project.order, Project.created_at.desc())
        if published_only:
            query = query.where(Project.published.is_(True))
        if featured_only:
            query = query.where(Project.featured.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, db: AsyncSession, project_id: uuid.UUID) -> Project | None:
        """Look up a project by its UUID primary key.

        Args:
            db: Active async database session.
            project_id: The UUID of the project to retrieve.

        Returns:
            The matching :class:`~app.models.project.Project` instance, or
            ``None`` if no project with that ID exists.
        """
        result = await db.execute(select(Project).where(Project.id == project_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, db: AsyncSession, slug: str) -> Project | None:
        """Look up a project by its URL slug.

        Slugs are unique across the ``projects`` table (enforced by a
        database-level unique index), so at most one row is returned.

        Args:
            db: Active async database session.
            slug: The URL slug to search for (e.g. ``"my-portfolio-site"``).

        Returns:
            The matching :class:`~app.models.project.Project` instance, or
            ``None`` if no project with that slug exists.
        """
        result = await db.execute(select(Project).where(Project.slug == slug))
        return result.scalar_one_or_none()

    async def get_featured(self, db: AsyncSession) -> list[Project]:
        """Return all projects that are both published and featured.

        Convenience wrapper around :meth:`get_all` with both
        ``published_only=True`` and ``featured_only=True``.

        Args:
            db: Active async database session.

        Returns:
            A (possibly empty) list of featured, published
            :class:`~app.models.project.Project` instances.
        """
        return await self.get_all(db, published_only=True, featured_only=True)

    async def create(self, db: AsyncSession, data: ProjectCreate) -> Project:
        """Insert a new project row into the database.

        The slug is expected to be present on ``data`` — the
        :class:`~app.schemas.project.ProjectCreate` validator auto-generates
        one from the title if none was explicitly provided.

        Args:
            db: Active async database session.
            data: Validated creation payload from the API layer.

        Returns:
            The newly inserted :class:`~app.models.project.Project` instance
            with all server-generated fields (``id``, ``created_at``,
            ``updated_at``) populated via ``db.refresh()``.
        """
        project = Project(**data.model_dump())
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def update(self, db: AsyncSession, project: Project, data: ProjectUpdate) -> Project:
        """Apply a partial update to an existing project.

        Only fields that are explicitly set in ``data`` (i.e. present in
        ``model_dump(exclude_unset=True)``) are written to the database.
        Fields not included in the update payload are left unchanged.

        Args:
            db: Active async database session.
            project: The ORM instance to update.  Must already be attached
                to ``db`` (typically retrieved via :meth:`get_by_slug` or
                :meth:`get_by_id` in the same session).
            data: Partial update payload.  Only non-``None`` / explicitly
                set fields are applied.

        Returns:
            The updated :class:`~app.models.project.Project` instance with
            refreshed field values from the database.
        """
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(project, key, value)
        await db.commit()
        await db.refresh(project)
        return project

    async def delete(self, db: AsyncSession, project: Project) -> None:
        """Permanently delete a project from the database.

        Args:
            db: Active async database session.
            project: The ORM instance to delete.  Must already be attached
                to ``db``.
        """
        await db.delete(project)
        await db.commit()

    async def update_embedding(
        self,
        db: AsyncSession,
        project_id: uuid.UUID,
        embedding: list[float],
    ) -> None:
        """Persist a pgvector embedding on a project row.

        Called by the RAG service after generating a new embedding for the
        project's combined text content (title + description + content).
        If the project no longer exists (e.g. was deleted between the
        embedding call and this write), the operation is silently skipped.

        Args:
            db: Active async database session.
            project_id: UUID of the project to update.
            embedding: A list of floats of length
                :data:`~app.core.constants.EMBEDDING_DIMENSIONS` (1 536).
        """
        project = await self.get_by_id(db, project_id)
        if not project:
            return
        project.content_embedding = embedding
        await db.commit()
