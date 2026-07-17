from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from placement_api.api.deps import SessionDep, get_current_admin
from placement_api.models.document import Document
from placement_api.models.study_plan import StudyPlan
from placement_api.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
async def get_system_stats(
    current_admin: User = Depends(get_current_admin),
    db: SessionDep = None
) -> dict[str, Any]:
    # In a real app we would cache these stats or run them asynchronously
    user_count = await db.scalar(select(func.count()).select_from(User))
    doc_count = await db.scalar(select(func.count()).select_from(Document))
    plan_count = await db.scalar(select(func.count()).select_from(StudyPlan))
    
    return {
        "total_users": user_count or 0,
        "total_documents": doc_count or 0,
        "total_study_plans": plan_count or 0,
        "active_sessions": (user_count or 0) // 2  # mock value
    }
