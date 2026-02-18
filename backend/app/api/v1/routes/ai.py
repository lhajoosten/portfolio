import logging
from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.exceptions import AIServiceError
from app.schemas.ai import WriteRequest
from app.services.ai.client import get_openai_client
from app.services.ai.writing_service import WritingService

router = APIRouter(prefix="/ai", tags=["ai"])
logger = logging.getLogger(__name__)

writing_service = WritingService(get_openai_client())


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
