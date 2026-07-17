import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from placement_api.db.enums import DocumentStatus


class DocumentBase(BaseModel):
    title: str
    source_type: str
    metadata_: dict[str, Any] = {}

class DocumentCreate(DocumentBase):
    storage_path: str

class DocumentRead(DocumentBase):
    id: uuid.UUID
    uploaded_by_id: uuid.UUID
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
