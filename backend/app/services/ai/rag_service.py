from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import RAG_TOP_K


class RagService:
    async def embed(self, text: str) -> list[float]:
        _ = text
        return []

    async def search(
        self, db: AsyncSession, query: str, limit: int = RAG_TOP_K
    ) -> list[dict[str, object]]:
        _ = (db, query, limit)
        return []
