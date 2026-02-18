"""Business logic layer for the Projects domain.

This module contains :class:`ProjectService`, which sits between the API
route handlers and the :class:`~app.repositories.project_repository.ProjectRepository`.
All domain rules, validation beyond Pydantic, and exception mapping live here.

Route handlers must never access the repository directly — they go through
the service so that business rules are applied consistently regardless of
the caller.

Typical usage::

    service = ProjectService(ProjectRepository())
    projects = await service.get_all(db, published_only=True)
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ProjectNotFoundError, SlugConflictError
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate


class ProjectService:
    """Orchestrates all operations on the Projects domain.

    Depends on :class:`~app.repositories.project_repository.ProjectRepository`
    for all database access.  Raises typed domain exceptions (from
    ``app.core.exceptions``) on failure so that the global exception handlers
    in ``app.core.error_handlers`` can map them to the correct HTTP status
    codes without any try/except in the route layer.

    All public methods return Pydantic response schemas — never raw ORM
    objects — so the route layer never has to call ``model_validate``
    itself.

    Args:
        repo: The repository instance to delegate database queries to.
            Injected via :func:`~app.api.v1.routes.projects.get_project_service`.

    Example::

        service = ProjectService(ProjectRepository())
        response = await service.get_by_slug(db, "my-project")
    """

    def __init__(self, repo: ProjectRepository) -> None:
        self.repo = repo

    async def get_all(
        self, db: AsyncSession, *, published_only: bool = True
    ) -> list[ProjectResponse]:
        """Return all projects, optionally filtered to published ones only.

        Args:
            db: Active async database session.
            published_only: When ``True`` (default), only projects with
                ``published=True`` are returned.  Pass ``False`` for the
                admin CMS which must show drafts.

        Returns:
            A list of :class:`~app.schemas.project.ProjectResponse` objects
            ordered by ``order`` ascending, then ``created_at`` descending.
            Returns an empty list when no projects match the filter.
        """
        projects = await self.repo.get_all(db, published_only=published_only)
        return [ProjectResponse.model_validate(project) for project in projects]

    async def get_by_slug(self, db: AsyncSession, slug: str) -> ProjectResponse:
        """Return a single project identified by its URL slug.

        Args:
            db: Active async database session.
            slug: The unique URL slug of the project (e.g. ``"my-portfolio"``).

        Returns:
            The matching :class:`~app.schemas.project.ProjectResponse`.

        Raises:
            ProjectNotFoundError: If no project with the given slug exists.
        """
        project = await self.repo.get_by_slug(db, slug)
        if not project:
            raise ProjectNotFoundError(f"Project '{slug}' not found")
        return ProjectResponse.model_validate(project)

    async def get_featured(self, db: AsyncSession) -> list[ProjectResponse]:
        """Return all projects that are both featured and published.

        Args:
            db: Active async database session.

        Returns:
            A list of featured :class:`~app.schemas.project.ProjectResponse`
            objects.  Returns an empty list when none are marked featured.
        """
        projects = await self.repo.get_featured(db)
        return [ProjectResponse.model_validate(project) for project in projects]

    async def create(self, db: AsyncSession, data: ProjectCreate) -> ProjectResponse:
        """Create a new project and persist it to the database.

        If no ``slug`` is provided in ``data``, one is auto-generated from
        the project title by the :class:`~app.schemas.project.ProjectCreate`
        Pydantic validator before this method is called.

        Args:
            db: Active async database session.
            data: Validated creation payload.

        Returns:
            The newly created :class:`~app.schemas.project.ProjectResponse`
            with server-assigned ``id``, ``created_at``, and ``updated_at``.

        Raises:
            SlugConflictError: If a project with the same slug already exists.
        """
        slug = data.model_dump().get("slug")
        if isinstance(slug, str) and slug:
            existing = await self.repo.get_by_slug(db, slug)
            if existing:
                raise SlugConflictError(f"Project slug '{slug}' is already taken")
        project = await self.repo.create(db, data)
        return ProjectResponse.model_validate(project)

    async def update(self, db: AsyncSession, slug: str, data: ProjectUpdate) -> ProjectResponse:
        """Partially update an existing project identified by slug.

        Only fields present in ``data`` (i.e. not ``None`` / unset) are
        written to the database.  All other fields are left unchanged.

        Args:
            db: Active async database session.
            slug: URL slug identifying the project to update.
            data: Partial update payload — only provided fields are applied.

        Returns:
            The updated :class:`~app.schemas.project.ProjectResponse`.

        Raises:
            ProjectNotFoundError: If no project with the given slug exists.
        """
        project = await self.repo.get_by_slug(db, slug)
        if not project:
            raise ProjectNotFoundError(f"Project '{slug}' not found")
        updated = await self.repo.update(db, project, data)
        return ProjectResponse.model_validate(updated)

    async def delete(self, db: AsyncSession, slug: str) -> None:
        """Permanently delete a project from the database.

        Args:
            db: Active async database session.
            slug: URL slug identifying the project to delete.

        Raises:
            ProjectNotFoundError: If no project with the given slug exists.
        """
        project = await self.repo.get_by_slug(db, slug)
        if not project:
            raise ProjectNotFoundError(f"Project '{slug}' not found")
        await self.repo.delete(db, project)
