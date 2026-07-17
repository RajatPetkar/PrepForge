import logging

from qdrant_client import AsyncQdrantClient, models

from placement_api.core.config import get_settings

logger = logging.getLogger(__name__)

# Qdrant client instance
qdrant_client: AsyncQdrantClient | None = None

def get_qdrant_client() -> AsyncQdrantClient:
    global qdrant_client
    if qdrant_client is None:
        settings = get_settings()
        # Create client. We use AsyncQdrantClient for async FastAPI.
        qdrant_client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )
    return qdrant_client

async def init_qdrant_schema() -> None:
    """Initialize Qdrant collections and indexes."""
    client = get_qdrant_client()
    
    collection_name = "document_chunks"
    
    # 1024 dimension is typical for BAAI/bge-large-en-v1.5
    vector_size = 1024
    
    try:
        collections_response = await client.get_collections()
        collection_names = [c.name for c in collections_response.collections]
        
        if collection_name not in collection_names:
            logger.info(f"Creating Qdrant collection: {collection_name}")
            await client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                ),
                sparse_vectors_config={
                    "text-sparse": models.SparseVectorParams(
                        modifier=models.Modifier.IDF
                    )
                }
            )
            
            # Create payload indexes for filtering metadata efficiently
            await client.create_payload_index(
                collection_name=collection_name,
                field_name="document_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            await client.create_payload_index(
                collection_name=collection_name,
                field_name="user_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
        else:
            logger.info(f"Qdrant collection {collection_name} already exists.")
    except Exception as e:
        logger.error(f"Error initializing Qdrant schema: {e}")
        # In a real app we might re-raise, but for startup we might just log
        raise e
