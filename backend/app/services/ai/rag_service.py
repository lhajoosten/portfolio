"""Retrieval-Augmented Generation (RAG) service.

This module provides the :class:`RagService` which handles generating
embeddings for text and performing semantic search across the portfolio
content using pgvector.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import RAG_TOP_K


class RagService:
    """Service layer for RAG embeddings and semantic search."""

    async def embed(self, text: str) -> list[float]:
        """Generate a vector embedding for the given text.

        Args:
            text: The input string to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        _ = text
        return []

    async def search(
        self, db: AsyncSession, query: str, limit: int = RAG_TOP_K
    ) -> list[dict[str, object]]:
        """Perform a semantic search across all embedded content.

        Args:
            db: Active async database session.
            query: The search query string.
            limit: Maximum number of results to return.

        Returns:
            A list of dictionaries containing the matched content and metadata.
        """
        _ = (db, query, limit)
        return []
