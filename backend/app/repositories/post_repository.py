"""Data-access layer for the Posts / Blog domain.

This module contains :class:`PostRepository`, the **only** place in the
application that issues SQL queries against the ``posts`` table.

Design rules enforced here:

- All methods are ``async`` — never use synchronous SQLAlchemy queries.
- The repository never raises domain exceptions for "not found" — it returns
  ``None`` and lets the service layer decide what to do.
- No business logic lives here: filtering, ordering, and embedding updates
  are considered data-access concerns; anything that involves rules or
  exception mapping belongs in :mod:`app.services.post_service`.

Typical usage::

    repo = PostRepository()
    post = await repo.get_by_slug(db, "building-rag-pipeline-fastapi")
    if post is None:
        ...  # service raises PostNotFoundError
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post
from app.schemas.post import PostCreate, PostUpdate


class PostRepository:
    """Handles all database queries for the :class:`~app.models.post.Post` model.

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
    ) -> list[Post]:
        """Return a list of posts, with an optional published filter.

        Results are ordered by ``created_at`` descending (newest first).

        Args:
            db: Active async database session.
            published_only: When ``True`` (default), only posts where
                ``published = TRUE`` are returned.  Pass ``False`` for the
                admin CMS which must show drafts.

        Returns:
            A (possibly empty) list of :class:`~app.models.post.Post`
            ORM instances.
        """
        query = select(Post).order_by(Post.created_at.desc())
        if published_only:
            query = query.where(Post.published.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, db: AsyncSession, post_id: uuid.UUID) -> Post | None:
        """Look up a post by its UUID primary key.

        Args:
            db: Active async database session.
            post_id: The UUID of the post to retrieve.

        Returns:
            The matching :class:`~app.models.post.Post` instance, or
            ``None`` if no post with that ID exists.
        """
        result = await db.execute(select(Post).where(Post.id == post_id))
        return result.scalar_one_or_none()

    async def get_by_slug(self, db: AsyncSession, slug: str) -> Post | None:
        """Look up a post by its URL slug.

        Slugs are unique across the ``posts`` table (enforced by a
        database-level unique index), so at most one row is returned.

        Args:
            db: Active async database session.
            slug: The URL slug to search for
                (e.g. ``"building-rag-pipeline-fastapi"``).

        Returns:
            The matching :class:`~app.models.post.Post` instance, or
            ``None`` if no post with that slug exists.
        """
        result = await db.execute(select(Post).where(Post.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, data: PostCreate) -> Post:
        """Insert a new post row into the database.

        The slug is expected to be present on ``data`` — the
        :class:`~app.schemas.post.PostCreate` validator auto-generates
        one from the title if none was explicitly provided.

        Args:
            db: Active async database session.
            data: Validated creation payload from the API layer.

        Returns:
            The newly inserted :class:`~app.models.post.Post` instance
            with all server-generated fields (``id``, ``created_at``,
            ``updated_at``) populated via ``db.refresh()``.
        """
        post = Post(**data.model_dump())
        db.add(post)
        await db.commit()
        await db.refresh(post)
        return post

    async def update(self, db: AsyncSession, post: Post, data: PostUpdate) -> Post:
        """Apply a partial update to an existing post.

        Only fields that are explicitly set in ``data`` (i.e. present in
        ``model_dump(exclude_unset=True)``) are written to the database.
        Fields not included in the update payload are left unchanged.

        Args:
            db: Active async database session.
            post: The ORM instance to update.  Must already be attached
                to ``db`` (typically retrieved via :meth:`get_by_slug` or
                :meth:`get_by_id` in the same session).
            data: Partial update payload.  Only non-``None`` / explicitly
                set fields are applied.

        Returns:
            The updated :class:`~app.models.post.Post` instance with
            refreshed field values from the database.
        """
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(post, key, value)
        await db.commit()
        await db.refresh(post)
        return post

    async def delete(self, db: AsyncSession, post: Post) -> None:
        """Permanently delete a post from the database.

        Args:
            db: Active async database session.
            post: The ORM instance to delete.  Must already be attached
                to ``db``.
        """
        await db.delete(post)
        await db.commit()

    async def update_embedding(
        self,
        db: AsyncSession,
        post_id: uuid.UUID,
        embedding: list[float],
    ) -> None:
        """Persist a pgvector embedding on a post row.

        Called by the RAG service after generating a new embedding for the
        post's combined text content (title + excerpt + body).
        If the post no longer exists (e.g. was deleted between the
        embedding call and this write), the operation is silently skipped.

        Args:
            db: Active async database session.
            post_id: UUID of the post to update.
            embedding: A list of floats of length
                :data:`~app.core.constants.EMBEDDING_DIMENSIONS` (1 536).
        """
        post = await self.get_by_id(db, post_id)
        if not post:
            return
        post.content_embedding = embedding
        await db.commit()
