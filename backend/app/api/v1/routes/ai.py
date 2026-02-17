from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class WriteRequest(BaseModel):
    prompt: str
    context: str | None = None
    mode: str = "write"  # write | improve | summarise


SYSTEM_PROMPTS = {
    "write": "You are a helpful writing assistant for a developer portfolio. Write clear, professional, engaging content. Keep it concise and avoid buzzwords.",
    "improve": "You are an editor. Improve the provided text to be more clear, concise and professional. Return only the improved text.",
    "summarise": "Summarise the provided text into 2-3 clear sentences. Return only the summary.",
}


async def stream_response(prompt: str, context: str | None, mode: str):
    system = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["write"])
    messages = [{"role": "system", "content": system}]
    if context:
        messages.append({"role": "user", "content": f"Context:\n{context}\n\nRequest:\n{prompt}"})
    else:
        messages.append({"role": "user", "content": prompt})

    async with client.chat.completions.stream(
        model=settings.OPENAI_MODEL,
        messages=messages,
        max_tokens=1000,
    ) as stream:
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {delta}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/write")
async def ai_write(request: WriteRequest):
    return StreamingResponse(
        stream_response(request.prompt, request.context, request.mode),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
