import os
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from placement_api.api.deps import CurrentUser, SessionDep
from placement_api.db.enums import DocumentStatus
from placement_api.models.document import Document
from placement_api.schemas.document import DocumentCreate, DocumentRead
from placement_api.services.document import (
    UPLOAD_DIR,
    create_document,
    get_documents_by_user,
    save_upload_file,
)
from placement_api.services.embedding import process_and_index_document

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentRead)
async def upload_document(
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    source_type: str = Form(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    storage_filename = f"{file_id}{ext}"
    storage_path = os.path.join(UPLOAD_DIR, storage_filename)
    
    await save_upload_file(file, storage_path)
    
    document_in = DocumentCreate(
        title=file.filename,
        source_type=source_type,
        storage_path=storage_path,
        metadata_={}
    )
    
    document = await create_document(session, document_in, current_user.id)
    return document

@router.get("/", response_model=list[DocumentRead])
async def list_documents(
    session: SessionDep,
    current_user: CurrentUser,
):
    return await get_documents_by_user(session, current_user.id)

@router.post("/{document_id}/index")
async def index_document(
    document_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    # Fetch document
    doc = await session.get(Document, document_id)
    if not doc or doc.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.status == DocumentStatus.INDEXED:
        return {"status": "Already indexed"}
        
    # Read text content (simplistic approach for TXT/MD files for now)
    try:
        with open(doc.storage_path, encoding="utf-8") as f:
            text_content = f.read()
    except Exception as e:
        doc.status = DocumentStatus.FAILED
        await session.commit()
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}") from e
        
    # Index it
    await process_and_index_document(
        session=session,
        document=doc,
        text_content=text_content,
        metadata={"source": doc.source_type}
    )
    
    doc.status = DocumentStatus.INDEXED
    await session.commit()
    
    return {"status": "success", "message": "Document indexed successfully"}
