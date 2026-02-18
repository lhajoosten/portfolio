from enum import StrEnum

from pydantic import BaseModel


class WriteMode(StrEnum):
    WRITE = "write"
    IMPROVE = "improve"
    SUMMARISE = "summarise"


class WriteRequest(BaseModel):
    prompt: str
    mode: WriteMode
    context: str | None = None
