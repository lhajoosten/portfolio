from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING

from openai import AsyncOpenAI, OpenAIError

from app.core.config import settings
from app.core.constants import WRITING_MAX_TOKENS
from app.core.exceptions import AIServiceError
from app.schemas.ai import WriteRequest
from app.services.ai.prompts import (
    IMPROVE_SYSTEM_PROMPT,
    SUMMARISE_SYSTEM_PROMPT,
    WRITE_SYSTEM_PROMPT,
)

if TYPE_CHECKING:
    from openai.types.chat import ChatCompletionMessageParam

PROMPT_MAP = {
    "write": WRITE_SYSTEM_PROMPT,
    "improve": IMPROVE_SYSTEM_PROMPT,
    "summarise": SUMMARISE_SYSTEM_PROMPT,
}


class WritingService:
    def __init__(self, client: AsyncOpenAI) -> None:
        self.client = client

    async def stream(self, request: WriteRequest) -> AsyncGenerator[str, None]:
        system_prompt = PROMPT_MAP[request.mode.value]
        messages: list[ChatCompletionMessageParam] = [{"role": "system", "content": system_prompt}]
        if request.context:
            messages.append(
                {
                    "role": "user",
                    "content": f"Context:\n{request.context}\n\nRequest:\n{request.prompt}",
                }
            )
        else:
            messages.append({"role": "user", "content": request.prompt})

        try:
            stream = await self.client.chat.completions.create(
                model=settings.active_model,
                messages=messages,
                max_tokens=WRITING_MAX_TOKENS,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except OpenAIError as exc:
            raise AIServiceError(f"AI stream failed: {exc}") from exc
