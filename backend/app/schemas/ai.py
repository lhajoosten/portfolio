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


# ---------------------------------------------------------------------------
# Embedding status
# ---------------------------------------------------------------------------


class EmbedStatusItem(BaseModel):
    """Index counts for a single content table."""

    total: int
    indexed: int


class EmbedStatus(BaseModel):
    """Embedding index state returned by GET /ai/embed-status."""

    model: str
    dims: int
    projects: EmbedStatusItem
    posts: EmbedStatusItem
    certifications: EmbedStatusItem


class ReEmbedResult(BaseModel):
    """Result summary returned by POST /ai/re-embed."""

    indexed: int
    errors: int
