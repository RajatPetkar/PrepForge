from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select
from placement_api.api.deps import SessionDep
from placement_api.models.user import User
from placement_api.models.study_plan import StudyPlan
from placement_api.services.user import get_user_by_username
import uuid

router = APIRouter(prefix="/profile", tags=["profile"])

class ProfileStudyPlan(BaseModel):
    id: str
    target_company: str
    available_days: int
    skill_level: str
    created_at: str
    
class UserProfile(BaseModel):
    id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[str] = None
    target_company: Optional[str] = None
    current_cgpa: Optional[str] = None
    study_plans: List[ProfileStudyPlan] = []

@router.get("/{identifier}", response_model=UserProfile)
async def get_public_profile(identifier: str, db: SessionDep):
    try:
        uid = uuid.UUID(identifier)
        user = await db.get(User, uid)
    except ValueError:
        user = await get_user_by_username(db, identifier)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch study plans
    stmt = select(StudyPlan).where(StudyPlan.user_id == user.id).order_by(StudyPlan.created_at.desc())
    result = await db.execute(stmt)
    plans = result.scalars().all()

    profile_plans = []
    for p in plans:
        profile_plans.append(ProfileStudyPlan(
            id=str(p.id),
            target_company=p.target_company or "General Tech",
            available_days=p.available_days or 30,
            skill_level=p.skill_level or "Beginner",
            created_at=str(p.created_at)
        ))

    return UserProfile(
        id=str(user.id),
        username=user.username,
        full_name=user.full_name,
        college=user.college,
        degree=user.degree,
        graduation_year=user.graduation_year,
        target_company=user.target_company,
        current_cgpa=user.current_cgpa,
        study_plans=profile_plans
    )
