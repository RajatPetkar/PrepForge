import uuid
from typing import Any

from pydantic import BaseModel


class SearchResult(BaseModel):
    id: str
    score: float
    payload: dict[str, Any]
    citation: str

class SearchQuery(BaseModel):
    query: str
    document_id: uuid.UUID | None = None
    limit: int = 5
