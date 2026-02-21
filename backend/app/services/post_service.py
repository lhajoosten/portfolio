"""Business logic layer for the Posts / Blog domain.

This module contains :class:`PostService`, which sits between the API
route handlers and the :class:`~app.repositories.post_repository.PostRepository`.
All domain rules, validation beyond Pydantic, and exception mapping live here.

Route handlers must never access the repository directly — they go through
the service so that business rules are applied consistently regardless of
the caller.

Typical usage::

    service = PostService(PostRepository())
    posts = await service.get_all(db, published_only=True)
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import PostNotFoundError, SlugConflictError
from app.repositories.post_repository import PostRepository
from app.schemas.post import PostCreate, PostResponse, PostUpdate


class PostService:
    """Orchestrates all operations on the Posts / Blog domain.

    Depends on :class:`~app.repositories.post_repository.PostRepository`
    for all database access.  Raises typed domain exceptions (from
    ``app.core.exceptions``) on failure so that the global exception handlers
    in ``app.core.error_handlers`` can map them to the correct HTTP status
    codes without any try/except in the route layer.

    All public methods return Pydantic response schemas — never raw ORM
    objects — so the route layer never has to call ``model_validate``
    itself.

    Args:
        repo: The repository instance to delegate database queries to.
            Injected via :func:`~app.api.v1.routes.posts.get_post_service`.

    Example::

        service = PostService(PostRepository())
        response = await service.get_by_slug(db, "building-rag-pipeline-fastapi")
    """

    def __init__(self, repo: PostRepository) -> None:
        self.repo = repo

    async def get_all(self, db: AsyncSession, *, published_only: bool = True) -> list[PostResponse]:
        """Return all posts, optionally filtered to published ones only.

        Args:
            db: Active async database session.
            published_only: When ``True`` (default), only posts with
                ``published=True`` are returned.  Pass ``False`` for the
                admin CMS which must show drafts.

        Returns:
            A list of :class:`~app.schemas.post.PostResponse` objects
            ordered by ``created_at`` descending (newest first).
            Returns an empty list when no posts match the filter.
        """
        posts = await self.repo.get_all(db, published_only=published_only)
        return [PostResponse.model_validate(post) for post in posts]

    async def get_by_slug(self, db: AsyncSession, slug: str) -> PostResponse:
        """Return a single post identified by its URL slug.

        Args:
            db: Active async database session.
            slug: The unique URL slug of the post
                (e.g. ``"building-rag-pipeline-fastapi"``).

        Returns:
            The matching :class:`~app.schemas.post.PostResponse`.

        Raises:
            PostNotFoundError: If no post with the given slug exists.
        """
        post = await self.repo.get_by_slug(db, slug)
        if not post:
            raise PostNotFoundError(f"Post '{slug}' not found")
        return PostResponse.model_validate(post)

    async def create(self, db: AsyncSession, data: PostCreate) -> PostResponse:
        """Create a new blog post and persist it to the database.

        If no ``slug`` is provided in ``data``, one is auto-generated from
        the post title by the :class:`~app.schemas.post.PostCreate`
        Pydantic validator before this method is called.

        Args:
            db: Active async database session.
            data: Validated creation payload.

        Returns:
            The newly created :class:`~app.schemas.post.PostResponse`
            with server-assigned ``id``, ``created_at``, and ``updated_at``.

        Raises:
            SlugConflictError: If a post with the same slug already exists.
        """
        slug = data.model_dump().get("slug")
        if isinstance(slug, str) and slug:
            existing = await self.repo.get_by_slug(db, slug)
            if existing:
                raise SlugConflictError(f"Post slug '{slug}' is already taken")
        post = await self.repo.create(db, data)
        return PostResponse.model_validate(post)

    async def update(self, db: AsyncSession, slug: str, data: PostUpdate) -> PostResponse:
        """Partially update an existing post identified by slug.

        Only fields present in ``data`` (i.e. not ``None`` / unset) are
        written to the database.  All other fields are left unchanged.

        Args:
            db: Active async database session.
            slug: URL slug identifying the post to update.
            data: Partial update payload — only provided fields are applied.

        Returns:
            The updated :class:`~app.schemas.post.PostResponse`.

        Raises:
            PostNotFoundError: If no post with the given slug exists.
        """
        post = await self.repo.get_by_slug(db, slug)
        if not post:
            raise PostNotFoundError(f"Post '{slug}' not found")
        updated = await self.repo.update(db, post, data)
        return PostResponse.model_validate(updated)

    async def delete(self, db: AsyncSession, slug: str) -> None:
        """Permanently delete a post from the database.

        Args:
            db: Active async database session.
            slug: URL slug identifying the post to delete.

        Raises:
            PostNotFoundError: If no post with the given slug exists.
        """
        post = await self.repo.get_by_slug(db, slug)
        if not post:
            raise PostNotFoundError(f"Post '{slug}' not found")
        await self.repo.delete(db, post)
