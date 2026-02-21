"""AI writing assistant service.

This module provides the :class:`WritingService` which orchestrates calls
to the OpenAI-compatible API for generating, improving, and summarising text.
"""

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
    """Service layer for AI writing assistance."""

    def __init__(self, client: AsyncOpenAI) -> None:
        """Initialise the writing service.

        Args:
            client: The configured async OpenAI client.
        """
        self.client = client

    async def stream(self, request: WriteRequest) -> AsyncGenerator[str, None]:
        """Stream an AI response based on the requested mode and prompt.

        Constructs the appropriate system prompt and user messages, then
        streams the completion chunks back to the caller.

        Args:
            request: The :class:`~app.schemas.ai.WriteRequest` containing
                the mode, prompt, and optional context.

        Yields:
            String chunks of the generated text as they arrive from the API.

        Raises:
            AIServiceError: If the underlying API call fails.
        """
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
                model=settings.VLLM_CHAT_MODEL,
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
