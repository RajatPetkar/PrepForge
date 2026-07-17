import shutil
import uuid

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from placement_api.db.enums import DocumentStatus
from placement_api.models.document import Document
from placement_api.schemas.document import DocumentCreate

UPLOAD_DIR = "/home/rajat/ai-placement-assistant/storage/uploads"

async def create_document(session: AsyncSession, document_in: DocumentCreate, user_id: uuid.UUID) -> Document:
    document = Document(
        title=document_in.title,
        source_type=document_in.source_type,
        storage_path=document_in.storage_path,
        uploaded_by_id=user_id,
        status=DocumentStatus.UPLOADED,
        metadata_=document_in.metadata_,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document

async def save_upload_file(upload_file: UploadFile, destination: str) -> None:
    try:
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    finally:
        upload_file.file.close()

async def get_documents_by_user(session: AsyncSession, user_id: uuid.UUID) -> list[Document]:
    stmt = select(Document).where(Document.uploaded_by_id == user_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())
