"""Retrieval-Augmented Generation (RAG) service.

Provides :class:`RagService`, which handles two responsibilities:

1. **Embedding** — generate a ``vector(768)`` from any text string by calling
   the infinity-emb container (``BAAI/bge-base-en-v1.5``).

2. **Semantic search** — embed a query string and retrieve the closest
   matching content chunks across ``projects``, ``posts``, and
   ``certifications`` using pgvector's cosine-distance operator (``<=>``) .

Architecture
------------
The service is stateless; it accepts a pre-configured ``AsyncOpenAI`` embed
client on construction so it can be swapped out in tests without touching
global state.  The search method issues raw SQL via SQLAlchemy's ``text()``
helper so we can use the ``<=>`` pgvector operator that the ORM does not
natively expose.

Usage example::

    from app.services.ai.client import get_embed_client
    from app.services.ai.rag_service import RagService

    rag = RagService(get_embed_client())
    embedding = await rag.embed("FastAPI async SQLAlchemy patterns")
    results  = await rag.search(db, "RAG pipeline Python", limit=5)
"""

import logging

from openai import AsyncOpenAI, OpenAIError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.constants import EMBEDDING_DIMENSIONS, RAG_TOP_K, VLLM_EMBED_MODEL
from app.core.exceptions import AIServiceError
from app.schemas.ai import EmbedStatus, EmbedStatusItem, ReEmbedResult

logger = logging.getLogger(__name__)


class RagService:
    """Service layer for RAG embeddings and semantic search.

    All database access is delegated to raw SQL so that the pgvector
    ``<=>`` cosine-distance operator can be used directly.

    Args:
        client: A configured :class:`openai.AsyncOpenAI` instance pointed
            at the infinity-emb ``/v1`` endpoint.
    """

    def __init__(self, client: AsyncOpenAI) -> None:
        self.client = client

    # ------------------------------------------------------------------
    # Embedding
    # ------------------------------------------------------------------

    async def embed(self, text: str) -> list[float]:
        """Generate a vector embedding for the given text.

        Calls the infinity-emb ``/v1/embeddings`` endpoint with
        ``BAAI/bge-base-en-v1.5``.  The returned vector has
        :data:`~app.core.constants.EMBEDDING_DIMENSIONS` (768) dimensions
        and is normalised to unit length, making it suitable for cosine
        similarity queries with pgvector's ``<=>`` operator.

        Args:
            text: The input string to embed.  Long texts are automatically
                truncated by the model to its maximum token length (512 for
                bge-base-en-v1.5).

        Returns:
            A list of ``float`` values of length ``EMBEDDING_DIMENSIONS``.

        Raises:
            AIServiceError: If the infinity-emb container is unreachable or
                returns an error response.
        """
        if not text.strip():
            return [0.0] * EMBEDDING_DIMENSIONS

        try:
            response = await self.client.embeddings.create(
                model=settings.VLLM_EMBED_MODEL,
                input=text.strip(),
            )
            return response.data[0].embedding
        except OpenAIError as exc:
            raise AIServiceError(f"Embedding failed: {exc}") from exc
        except Exception as exc:
            raise AIServiceError(f"Embedding failed (unexpected): {exc}") from exc

    # ------------------------------------------------------------------
    # Semantic search
    # ------------------------------------------------------------------

    async def search(
        self, db: AsyncSession, query: str, limit: int = RAG_TOP_K
    ) -> list[dict[str, object]]:
        """Perform a semantic search across all embedded content.

        Embeds ``query`` and then finds the ``limit`` nearest rows across
        the ``projects``, ``posts``, and ``certifications`` tables using
        cosine distance (pgvector ``<=>``).  Rows with a ``NULL``
        ``content_embedding`` are excluded.

        The results are ranked globally across all three tables and
        returned sorted by ascending cosine distance (most similar first).

        Args:
            db: Active async database session.
            query: The search query string.  Short natural-language phrases
                work best with bge-base-en-v1.5.
            limit: Maximum number of results to return.  Defaults to
                :data:`~app.core.constants.RAG_TOP_K`.

        Returns:
            A list of result dicts, each containing:

            - ``id`` (``str``) — UUID of the matched row.
            - ``type`` (``str``) — one of ``"project"``, ``"post"``,
                ``"certification"``.
            - ``title`` (``str``) — display title of the content.
            - ``excerpt`` (``str``) — short description or excerpt.
            - ``slug`` (``str | None``) — URL slug (projects and posts only).
            - ``distance`` (``float``) — cosine distance (0 = identical,
                2 = opposite).

        Raises:
            AIServiceError: If the embedding call fails.
        """
        embedding = await self.embed(query)

        # Build a UNION query across all three tables.
        # pgvector's <=> operator computes cosine distance.
        # We cast the Python list to a postgres vector literal.
        vector_literal = f"'[{','.join(str(x) for x in embedding)}]'::vector"

        sql = text(
            f"""
            SELECT
                id::text,
                'project'       AS type,
                title,
                description     AS excerpt,
                slug,
                content_embedding <=> {vector_literal} AS distance
            FROM projects
            WHERE content_embedding IS NOT NULL

            UNION ALL

            SELECT
                id::text,
                'post'          AS type,
                title,
                excerpt,
                slug,
                content_embedding <=> {vector_literal} AS distance
            FROM posts
            WHERE content_embedding IS NOT NULL

            UNION ALL

            SELECT
                id::text,
                'certification' AS type,
                name            AS title,
                COALESCE(description, issuer) AS excerpt,
                NULL            AS slug,
                content_embedding <=> {vector_literal} AS distance
            FROM certifications
            WHERE content_embedding IS NOT NULL

            ORDER BY distance ASC
            LIMIT :limit
            """
        )

        try:
            result = await db.execute(sql, {"limit": limit})
            rows = result.mappings().all()
        except Exception as exc:
            logger.exception("RAG search query failed: %s", exc)
            return []

        return [
            {
                "id": row["id"],
                "type": row["type"],
                "title": row["title"],
                "excerpt": row["excerpt"],
                "slug": row["slug"],
                "distance": float(row["distance"]),
            }
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Indexing helpers
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # Embed status
    # ------------------------------------------------------------------

    async def get_embed_status(self, db: AsyncSession) -> EmbedStatus:
        """Return index counts (total vs embedded) for every content table.

        Args:
            db: Active async database session.

        Returns:
            :class:`~app.schemas.ai.EmbedStatus` with per-table counts and
            the active embedding model name and dimensionality.
        """
        sql = text(
            """
            SELECT
                (SELECT COUNT(*)                              FROM projects)             AS projects_total,
                (SELECT COUNT(*) FROM projects WHERE content_embedding IS NOT NULL)     AS projects_indexed,
                (SELECT COUNT(*)                              FROM posts)                AS posts_total,
                (SELECT COUNT(*) FROM posts    WHERE content_embedding IS NOT NULL)     AS posts_indexed,
                (SELECT COUNT(*)                              FROM certifications)       AS certs_total,
                (SELECT COUNT(*) FROM certifications WHERE content_embedding IS NOT NULL) AS certs_indexed
            """
        )
        row = (await db.execute(sql)).mappings().one()
        return EmbedStatus(
            model=VLLM_EMBED_MODEL,
            dims=EMBEDDING_DIMENSIONS,
            projects=EmbedStatusItem(total=row["projects_total"], indexed=row["projects_indexed"]),
            posts=EmbedStatusItem(total=row["posts_total"], indexed=row["posts_indexed"]),
            certifications=EmbedStatusItem(total=row["certs_total"], indexed=row["certs_indexed"]),
        )

    # ------------------------------------------------------------------
    # Re-embed all
    # ------------------------------------------------------------------

    async def re_embed_all(self, db: AsyncSession) -> ReEmbedResult:
        """Re-generate embeddings for every row in all content tables.

        Fetches every project, post, and certification from the database,
        builds a plain-text representation of each, and calls
        :meth:`index_text` to write the new vector back.  Rows that fail
        are counted in ``errors`` and logged; the process continues.

        Args:
            db: Active async database session.

        Returns:
            :class:`~app.schemas.ai.ReEmbedResult` with counts of
            successfully indexed rows and errors.
        """
        indexed = 0
        errors = 0

        # ── Projects ──────────────────────────────────────────────────
        project_rows = (
            (await db.execute(text("SELECT id::text, title, description, content FROM projects")))
            .mappings()
            .all()
        )

        for row in project_rows:
            content = " ".join(filter(None, [row["title"], row["description"], row["content"]]))
            try:
                await self.index_text(db, table="projects", row_id=row["id"], content=content)
                indexed += 1
            except Exception:
                logger.exception("re_embed_all: failed to index project %s", row["id"])
                errors += 1

        # ── Posts ─────────────────────────────────────────────────────
        post_rows = (
            (await db.execute(text("SELECT id::text, title, excerpt, body FROM posts")))
            .mappings()
            .all()
        )

        for row in post_rows:
            content = " ".join(filter(None, [row["title"], row["excerpt"], row["body"]]))
            try:
                await self.index_text(db, table="posts", row_id=row["id"], content=content)
                indexed += 1
            except Exception:
                logger.exception("re_embed_all: failed to index post %s", row["id"])
                errors += 1

        # ── Certifications ────────────────────────────────────────────
        cert_rows = (
            (
                await db.execute(
                    text("SELECT id::text, name, issuer, description FROM certifications")
                )
            )
            .mappings()
            .all()
        )

        for row in cert_rows:
            content = " ".join(filter(None, [row["name"], row["issuer"], row["description"]]))
            try:
                await self.index_text(db, table="certifications", row_id=row["id"], content=content)
                indexed += 1
            except Exception:
                logger.exception("re_embed_all: failed to index certification %s", row["id"])
                errors += 1

        logger.info("re_embed_all complete: indexed=%d errors=%d", indexed, errors)
        return ReEmbedResult(indexed=indexed, errors=errors)

    async def index_text(
        self,
        db: AsyncSession,
        *,
        table: str,
        row_id: str,
        content: str,
    ) -> None:
        """Generate an embedding for ``content`` and persist it to ``table``.

        This is the low-level primitive called by the indexing endpoints
        (e.g. "Re-embed" button in the admin CMS).  It writes directly via
        a parameterised UPDATE so no ORM model import is needed here.

        Only the tables that have a ``content_embedding vector(N)`` column
        are valid targets: ``projects``, ``posts``, ``certifications``.

        Args:
            db: Active async database session.
            table: Target table name — one of ``"projects"``, ``"posts"``,
                ``"certifications"``.
            row_id: UUID string of the row to update.
            content: The plain-text content to embed (title + body combined
                by the caller).

        Raises:
            ValueError: If ``table`` is not an allowed table name (prevents
                SQL injection via the table parameter).
            AIServiceError: If the embedding call fails.
        """
        allowed_tables = {"projects", "posts", "certifications"}
        if table not in allowed_tables:
            raise ValueError(f"Invalid table '{table}'. Must be one of: {allowed_tables}")

        embedding = await self.embed(content)
        vector_literal = f"'[{','.join(str(x) for x in embedding)}]'::vector"

        sql = text(f"UPDATE {table} SET content_embedding = {vector_literal} WHERE id = :row_id")

        try:
            await db.execute(sql, {"row_id": row_id})
            await db.commit()
            logger.info("Indexed %s/%s (%d dims)", table, row_id, len(embedding))
        except Exception as exc:
            await db.rollback()
            logger.exception("Failed to persist embedding for %s/%s: %s", table, row_id, exc)
            raise AIServiceError(f"Failed to store embedding: {exc}") from exc
