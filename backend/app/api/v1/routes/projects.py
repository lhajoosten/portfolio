from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.project_repository import ProjectRepository
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_service(db: AsyncSession = Depends(get_db)) -> ProjectService:
    _ = db
    return ProjectService(ProjectRepository())


@router.get("/", response_model=list[ProjectResponse])
async def get_projects(
    published_only: bool = True,
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectResponse]:
    return await service.get_all(db, published_only=published_only)


@router.get("/featured", response_model=list[ProjectResponse])
async def get_featured_projects(
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectResponse]:
    return await service.get_featured(db)


@router.get("/{slug}", response_model=ProjectResponse)
async def get_project(
    slug: str,
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return await service.get_by_slug(db, slug)


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return await service.create(db, data)


@router.patch("/{slug}", response_model=ProjectResponse)
async def update_project(
    slug: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return await service.update(db, slug, data)


@router.delete("/{slug}", status_code=204)
async def delete_project(
    slug: str,
    db: AsyncSession = Depends(get_db),
    service: ProjectService = Depends(get_project_service),
) -> None:
    await service.delete(db, slug)
