import logging
import os
import uuid

import fitz  # PyMuPDF
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from sqlalchemy import select

from placement_api.api.deps import CurrentUser, SessionDep
from placement_api.core.qdrant import get_qdrant_client
from placement_api.db.enums import DocumentStatus
from placement_api.models.document import Chunk, Document, DocumentVersion
from placement_api.schemas.document import DocumentCreate, DocumentRead
from placement_api.services.document import (
    UPLOAD_DIR,
    create_document,
    get_documents_by_user,
    save_upload_file,
)
from placement_api.services.embedding import process_and_index_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])

_PDF_EXTENSIONS = {".pdf"}


def _read_text_from_file(path: str) -> str | None:
    """Try to read a file as UTF-8 text (fallback to latin-1). Returns None on complete failure."""
    for enc in ("utf-8", "latin-1"):
        try:
            with open(path, encoding=enc) as f:
                return f.read()
        except (UnicodeDecodeError, UnicodeError):
            continue
        except Exception:
            return None
    return None


def _extract_text_from_pdf(path: str) -> str | None:
    """Extract text from a PDF file using PyMuPDF. Returns None on failure."""
    try:
        text = ""
        with fitz.open(path) as doc:
            for page in doc:
                text += page.get_text()
        return text.strip() or None
    except Exception:
        logger.exception("Failed to extract text from PDF: %s", path)
        return None


def _extract_text(path: str, ext: str) -> str | None:
    """Extract text from a file — PDFs get special treatment, all others are read as text."""
    if ext in _PDF_EXTENSIONS:
        return _extract_text_from_pdf(path)
    return _read_text_from_file(path)


@router.post("/upload", response_model=DocumentRead)
async def upload_document(
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    source_type: str = Form("upload"),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    storage_filename = f"{file_id}{ext}"
    storage_path = os.path.join(UPLOAD_DIR, storage_filename)

    await save_upload_file(file, storage_path)

    document_in = DocumentCreate(
        title=file.filename,
        source_type=source_type,
        storage_path=storage_path,
        metadata_={},
    )

    document = await create_document(session, document_in, current_user.id)

    # --- Auto-index for supported file types ---------------------------
    text_content = _extract_text(storage_path, ext)
    if text_content:
        try:
            await process_and_index_document(
                session=session,
                document=document,
                text_content=text_content,
                metadata={"source": source_type, "filename": file.filename},
            )
            document.status = DocumentStatus.INDEXED
            await session.commit()
            logger.info("Auto-indexed document %s (%s)", document.id, file.filename)
        except Exception:
            logger.exception("Failed to auto-index document %s", document.id)
            document.status = DocumentStatus.FAILED
            await session.commit()
    else:
        logger.info("No text extracted from %s (ext=%s) – skipping index", file.filename, ext)

    await session.refresh(document)
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
    doc = await session.get(Document, document_id)
    if not doc or doc.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status == DocumentStatus.INDEXED:
        return {"status": "Already indexed"}

    ext = os.path.splitext(doc.storage_path)[1].lower()
    text_content = _extract_text(doc.storage_path, ext)
    if not text_content:
        doc.status = DocumentStatus.FAILED
        await session.commit()
        raise HTTPException(status_code=400, detail="Could not extract text from file")

    try:
        await process_and_index_document(
            session=session,
            document=doc,
            text_content=text_content,
            metadata={"source": doc.source_type, "filename": doc.title},
        )
        doc.status = DocumentStatus.INDEXED
        await session.commit()
    except Exception:
        logger.exception("Failed to index document %s", document_id)
        doc.status = DocumentStatus.FAILED
        await session.commit()
        raise HTTPException(status_code=500, detail="Indexing failed")

    return {"status": "success", "message": "Document indexed successfully"}


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
):
    doc = await session.get(Document, document_id)
    if not doc or doc.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Collect all Qdrant point IDs for this document
    stmt = (
        select(Chunk.qdrant_point_id)
        .join(DocumentVersion, Chunk.document_version_id == DocumentVersion.id)
        .where(DocumentVersion.document_id == document_id)
    )
    result = await session.execute(stmt)
    point_ids = [row[0] for row in result.all()]

    # 2. Delete points from Qdrant
    if point_ids:
        try:
            qdrant = get_qdrant_client()
            await qdrant.delete(
                collection_name="document_chunks",
                points_selector=point_ids,
            )
            logger.info("Deleted %d Qdrant points for document %s", len(point_ids), document_id)
        except Exception:
            logger.exception("Failed to delete Qdrant points for document %s", document_id)

    # 3. Delete file from disk
    if doc.storage_path and os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except OSError:
            logger.exception("Failed to delete file %s", doc.storage_path)

    # 4. Null out any resume_report FKs referencing this document
    from placement_api.models.resume import ResumeReport
    stmt_null = select(ResumeReport).where(ResumeReport.resume_document_id == document_id)
    res = await session.execute(stmt_null)
    for rr in res.scalars().all():
        rr.resume_document_id = None

    # 5. Delete document from DB (cascade removes versions → chunks)
    await session.delete(doc)
    await session.commit()

    return {"status": "success", "message": "Document deleted"}
