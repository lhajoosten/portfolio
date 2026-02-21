"""API routes for the Posts / Blog domain.

Provides endpoints for creating, reading, updating, and deleting blog posts.
Write operations are protected by superuser authentication.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_superuser
from app.db.session import get_db
from app.repositories.post_repository import PostRepository
from app.schemas.auth import UserResponse
from app.schemas.post import PostCreate, PostResponse, PostUpdate
from app.services.post_service import PostService

router = APIRouter(prefix="/posts", tags=["posts"])


def get_post_service(db: AsyncSession = Depends(get_db)) -> PostService:
    """Construct a PostService bound to the current database session."""
    _ = db
    return PostService(PostRepository())


@router.get("/", response_model=list[PostResponse])
async def get_posts(
    published_only: bool = True,
    db: AsyncSession = Depends(get_db),
    service: PostService = Depends(get_post_service),
) -> list[PostResponse]:
    """Retrieve a list of blog posts.

    Args:
        published_only: If ``True``, returns only published posts.
            Defaults to ``True``.
        db: Active async database session.
        service: Injected post service.

    Returns:
        A list of :class:`~app.schemas.post.PostResponse` objects ordered
        by ``created_at`` descending (newest first).
    """
    return await service.get_all(db, published_only=published_only)


@router.get("/{slug}", response_model=PostResponse)
async def get_post(
    slug: str,
    db: AsyncSession = Depends(get_db),
    service: PostService = Depends(get_post_service),
) -> PostResponse:
    """Retrieve a single blog post by its slug.

    Args:
        slug: The unique URL slug of the post.
        db: Active async database session.
        service: Injected post service.

    Returns:
        The requested :class:`~app.schemas.post.PostResponse`.

    Raises:
        HTTPException: HTTP 404 if the post is not found.
    """
    return await service.get_by_slug(db, slug)


@router.post("/", response_model=PostResponse, status_code=201)
async def create_post(
    data: PostCreate,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: PostService = Depends(get_post_service),
) -> PostResponse:
    """Create a new blog post.

    Requires superuser privileges.

    Args:
        data: The post creation payload.
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected post service.

    Returns:
        The newly created :class:`~app.schemas.post.PostResponse`.

    Raises:
        HTTPException: HTTP 409 if a post with the same slug already exists.
    """
    return await service.create(db, data)


@router.patch("/{slug}", response_model=PostResponse)
async def update_post(
    slug: str,
    data: PostUpdate,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: PostService = Depends(get_post_service),
) -> PostResponse:
    """Update an existing blog post.

    Requires superuser privileges.

    Args:
        slug: The unique URL slug of the post to update.
        data: The post update payload (partial).
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected post service.

    Returns:
        The updated :class:`~app.schemas.post.PostResponse`.

    Raises:
        HTTPException: HTTP 404 if the post is not found.
    """
    return await service.update(db, slug, data)


@router.delete("/{slug}", status_code=204)
async def delete_post(
    slug: str,
    _: UserResponse = Depends(get_current_superuser),
    db: AsyncSession = Depends(get_db),
    service: PostService = Depends(get_post_service),
) -> None:
    """Delete a blog post.

    Requires superuser privileges.

    Args:
        slug: The unique URL slug of the post to delete.
        _: Superuser dependency guard.
        db: Active async database session.
        service: Injected post service.

    Raises:
        HTTPException: HTTP 404 if the post is not found.
    """
    await service.delete(db, slug)
