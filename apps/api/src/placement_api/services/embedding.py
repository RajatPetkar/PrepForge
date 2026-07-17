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

async def process_and_index_document(
    session: AsyncSession,
    document: Document,
    text_content: str,
    metadata: dict[str, Any]
) -> DocumentVersion:
    # 1. Create a DocumentVersion
    doc_version = DocumentVersion(
        document_id=document.id,
        version=1,
        checksum=str(hash(text_content)),
        parser_version="v1",
        embedding_model=MODEL_NAME,
    )
    session.add(doc_version)
    await session.commit()
    await session.refresh(doc_version)
    
    # 2. Chunk text
    text_chunks = simple_chunk_text(text_content)
    
    # 3. Generate embeddings
    embed_model = get_embedding_model()
    embeddings = list(embed_model.embed(text_chunks))
    
    from placement_api.services.search import get_sparse_embedding_model
    sparse_model = get_sparse_embedding_model()
    sparse_embeddings = list(sparse_model.embed(text_chunks))
    
    # 4. Store in Qdrant and Postgres
    qdrant = get_qdrant_client()
    points = []
    
    for i, (chunk_text, embedding, sparse) in enumerate(zip(text_chunks, embeddings, sparse_embeddings, strict=False)):
        q_point_id = str(uuid.uuid4())
        
        # Save to DB
        db_chunk = Chunk(
            document_version_id=doc_version.id,
            qdrant_point_id=q_point_id,
            chunk_index=i,
            content=chunk_text,
            content_hash=str(hash(chunk_text)),
            metadata_=metadata
        )
        session.add(db_chunk)
        
        # Qdrant Point
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
        
    await session.commit()
    
    # Upload to Qdrant
    if points:
        await qdrant.upsert(
            collection_name="document_chunks",
            points=points
        )
        
    return doc_version
