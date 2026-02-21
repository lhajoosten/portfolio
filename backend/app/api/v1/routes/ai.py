import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_superuser
from app.core.exceptions import AIServiceError
from app.db.session import get_db
from app.schemas.ai import EmbedStatus, ReEmbedResult, WriteRequest
from app.schemas.auth import UserResponse
from app.services.ai.client import get_chat_client, get_embed_client
from app.services.ai.rag_service import RagService
from app.services.ai.writing_service import WritingService

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

writing_service = WritingService(get_chat_client())
rag_service = RagService(get_embed_client())


async def stream_response(request: WriteRequest) -> AsyncGenerator[str, None]:
    try:
        async for chunk in writing_service.stream(request):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"
    except AIServiceError as exc:
        logger.exception("AI stream error: %s", exc.message)
        yield f"event: error\ndata: {exc.message}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/write")
async def ai_write(request: WriteRequest) -> StreamingResponse:
    if not request.prompt.strip():
        raise HTTPException(status_code=422, detail="Prompt must not be empty")
    return StreamingResponse(
        stream_response(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/embed-status")
async def ai_embed_status(
    db: AsyncSession = Depends(get_db),
    _: UserResponse = Depends(get_current_superuser),
) -> EmbedStatus:
    """Return index counts for every content table.

    Protected: superuser only.
    """
    return await rag_service.get_embed_status(db)


@router.post("/re-embed")
async def ai_re_embed(
    db: AsyncSession = Depends(get_db),
    _: UserResponse = Depends(get_current_superuser),
) -> ReEmbedResult:
    """Re-generate embeddings for every project, post, and certification.

    Protected: superuser only.  Long-running — may take several minutes
    depending on the number of rows and the speed of the embedding model.
    """
    return await rag_service.re_embed_all(db)
