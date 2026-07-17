import asyncio
import uuid
from typing import Any

from fastembed import SparseTextEmbedding
from qdrant_client import models

from placement_api.core.qdrant import get_qdrant_client
from placement_api.services.embedding import get_embedding_model

# Load sparse model lazily
_sparse_model = None

def get_sparse_embedding_model() -> SparseTextEmbedding:
    global _sparse_model
    if _sparse_model is None:
        _sparse_model = SparseTextEmbedding(model_name="prithivida/Splade_PP_en_v1")
    return _sparse_model


def _embed_dense(query: str) -> list[float]:
    dense_model = get_embedding_model()
    dense_vector = list(dense_model.embed([query]))[0]
    return dense_vector.tolist() if hasattr(dense_vector, "tolist") else list(dense_vector)


def _embed_sparse(query: str) -> models.SparseVector:
    sparse_model = get_sparse_embedding_model()
    sparse_result = list(sparse_model.embed([query]))[0]
    return models.SparseVector(
        indices=list(sparse_result.indices),
        values=list(sparse_result.values),
    )


async def hybrid_search(
    query: str,
    user_id: uuid.UUID | None = None,
    document_id: uuid.UUID | None = None,
    limit: int = 5
) -> list[dict[str, Any]]:
    qdrant = get_qdrant_client()
    
    # Model loading, embedding, and reranking are synchronous and may download
    # large files on first use. Keep them off the FastAPI event loop.
    dense_vector, sparse_vector = await asyncio.gather(
        asyncio.to_thread(_embed_dense, query),
        asyncio.to_thread(_embed_sparse, query),
    )
    
    # Setup Filters
    must_conditions = []
    if user_id:
        must_conditions.append(
            models.FieldCondition(
                key="user_id",
                match=models.MatchValue(value=str(user_id))
            )
        )
    if document_id:
        must_conditions.append(
            models.FieldCondition(
                key="document_id",
                match=models.MatchValue(value=str(document_id))
            )
        )
        
    query_filter = models.Filter(must=must_conditions) if must_conditions else None
    
    # Generate Sparse Vector
    sparse_model = get_sparse_embedding_model()
    sparse_result = list(sparse_model.embed([query]))[0]
    # fastembed returns SparseEmbedding objects: .indices and .values
    
    # Perform Search using Qdrant's prefetch functionality for RRF hybrid search
    prefetch = [
        models.Prefetch(
            query=dense_vector,
            filter=query_filter,
            limit=limit * 2
        ),
        models.Prefetch(
            query=sparse_vector,
            using="text-sparse",
            filter=query_filter,
            limit=limit * 2
        )
    ]

    results = await qdrant.query_points(
        collection_name="document_chunks",
        prefetch=prefetch,
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=limit,
        with_payload=True
    )
    
    if not results.points:
        return []
    
    reranked_points = []
    for point in results.points:
        reranked_points.append({
            "id": point.id,
            "score": point.score,
            "payload": point.payload,
            "citation": f"Source: {point.payload.get('source', 'Unknown')} - Chunk: {point.payload.get('chunk_index', 'N/A')}"
        })
        
    # Return top K after reranking
    return reranked_points
