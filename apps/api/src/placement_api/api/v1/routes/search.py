
from fastapi import APIRouter

from placement_api.api.deps import CurrentUser
from placement_api.schemas.search import SearchQuery, SearchResult
from placement_api.services.search import hybrid_search

router = APIRouter(prefix="/search", tags=["search"])

@router.post("/", response_model=list[SearchResult])
async def search_documents(
    query: SearchQuery,
    current_user: CurrentUser,
):
    results = await hybrid_search(
        query=query.query,
        user_id=current_user.id,
        document_id=query.document_id,
        limit=query.limit
    )
    return results
