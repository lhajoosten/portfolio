"""API routes for the Projects domain.

Provides endpoints for creating, reading, updating, and deleting portfolio
projects. Write operations are protected by superuser authentication.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_superuser
from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.schemas.auth import UserResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    """Construct a ProjectService bound to the current database session."""
    _ = db
    return ProjectService(ProjectRepository())


@router.get("/", response_model=list[ProjectResponse])
async def get_projects(
    published_only: bool = True,
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectResponse]:
    """Retrieve a list of projects.

    Args:
        published_only: If ``True``, returns only published projects.
            Defaults to ``True``.
        db: Active async database session.
        service: Injected project service.

    Returns:
        A list of :class:`~app.schemas.project.ProjectResponse` objects.
    """
    return await service.get_all(db, published_only=published_only)


@router.get("/featured", response_model=list[ProjectResponse])
async def get_featured_projects(
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectResponse]:
    """Retrieve a list of featured, published projects.

    Args:
        db: Active async database session.
        service: Injected project service.

    Returns:
        A list of :class:`~app.schemas.project.ProjectResponse` objects.
    """
    return await service.get_featured(db)


@router.get("/{slug}", response_model=ProjectResponse)
async def get_project(
    slug: str,
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Retrieve a single project by its slug.

    Args:
        slug: The unique URL slug of the project.
        db: Active async database session.
        service: Injected project service.

    Returns:
        The requested :class:`~app.schemas.project.ProjectResponse`.

    Raises:
        HTTPException: HTTP 404 if the project is not found.
    """
    return await service.get_by_slug(db, slug)


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Create a new project.

    Requires superuser privileges.

    Args:
        data: The project creation payload.
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected project service.

    Returns:
        The newly created :class:`~app.schemas.project.ProjectResponse`.

    Raises:
        HTTPException: HTTP 409 if a project with the same slug already exists.
    """
    return await service.create(db, data)


@router.patch("/{slug}", response_model=ProjectResponse)
async def update_project(
    slug: str,
    data: ProjectUpdate,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Update an existing project.

    Requires superuser privileges.

    Args:
        slug: The unique URL slug of the project to update.
        data: The project update payload (partial).
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected project service.

    Returns:
        The updated :class:`~app.schemas.project.ProjectResponse`.

    Raises:
        HTTPException: HTTP 404 if the project is not found.
        HTTPException: HTTP 409 if updating the slug causes a collision.
    """
    return await service.update(db, slug, data)


@router.delete("/{slug}", status_code=204)
async def delete_project(
    slug: str,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> None:
    """Delete a project.

    Requires superuser privileges.

    Args:
        slug: The unique URL slug of the project to delete.
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected project service.

    Raises:
        HTTPException: HTTP 404 if the project is not found.
    """
    await service.delete(db, slug)
