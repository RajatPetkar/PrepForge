import asyncio
import uuid
from typing import Any

from fastembed import TextEmbedding
from qdrant_client import models
from sqlalchemy.ext.asyncio import AsyncSession

from placement_api.core.qdrant import get_qdrant_client
from placement_api.models.document import Chunk, Document, DocumentVersion

# Load model lazily
_embedding_model = None
MODEL_NAME = "BAAI/bge-large-en-v1.5"

def get_embedding_model() -> TextEmbedding:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = TextEmbedding(model_name=MODEL_NAME)
    return _embedding_model

def simple_chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    # Very basic chunking for initial implementation
    # A robust system would use LlamaIndex or Langchain splitters
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap

    return chunks

def _embed_dense_batch(texts: list[str]) -> list:
    model = get_embedding_model()
    return list(model.embed(texts))

def _embed_sparse_batch(texts: list[str]) -> list:
    from placement_api.services.search import get_sparse_embedding_model
    model = get_sparse_embedding_model()
    return list(model.embed(texts))

async def process_and_index_document(
    session: AsyncSession,
    document: Document,
    text_content: str,
    metadata: dict[str, Any]
) -> DocumentVersion:
    # 1. Chunk text
    text_chunks = simple_chunk_text(text_content)

    # 2. Generate embeddings off the event loop so we don't block FastAPI
    embeddings, sparse_embeddings = await asyncio.gather(
        asyncio.to_thread(_embed_dense_batch, text_chunks),
        asyncio.to_thread(_embed_sparse_batch, text_chunks),
    )

    # 3. Build Qdrant points and DB rows (but don't commit to DB yet)
    qdrant = get_qdrant_client()
    doc_version_id = uuid.uuid4()
    points = []
    db_chunks = []

    for i, (chunk_text, embedding, sparse) in enumerate(zip(text_chunks, embeddings, sparse_embeddings, strict=False)):
        q_point_id = str(uuid.uuid4())

        db_chunks.append(Chunk(
            document_version_id=doc_version_id,
            qdrant_point_id=q_point_id,
            chunk_index=i,
            content=chunk_text,
            content_hash=str(hash(chunk_text)),
            metadata_=metadata,
        ))

        payload = {
            "document_id": str(document.id),
            "user_id": str(document.uploaded_by_id),
            "chunk_index": i,
            "text": chunk_text,
            **metadata
        }
        points.append(
            models.PointStruct(
                id=q_point_id,
                vector={
                    "": list(embedding),
                    "text-sparse": models.SparseVector(
                        indices=list(sparse.indices),
                        values=list(sparse.values)
                    )
                },
                payload=payload
            )
        )

    # 4. Upsert to Qdrant FIRST — if this fails, DB is untouched
    if points:
        await qdrant.upsert(
            collection_name="document_chunks",
            points=points
        )

    # 5. Now persist to PostgreSQL
    doc_version = DocumentVersion(
        id=doc_version_id,
        document_id=document.id,
        version=1,
        checksum=str(hash(text_content)),
        parser_version="v1",
        embedding_model=MODEL_NAME,
    )
    session.add(doc_version)
    for chunk in db_chunks:
        session.add(chunk)
    await session.commit()

    return doc_version
