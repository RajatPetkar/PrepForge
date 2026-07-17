from fastapi import APIRouter, HTTPException

from placement_api.api.deps import CurrentUser, SessionDep
from placement_api.models.study_plan import StudyPlan
from placement_api.schemas.planner import StudyPlanCreate, StudyPlanRead
from placement_api.services.planner import generate_study_plan
from sqlalchemy import select
from pydantic import BaseModel, Field
from typing import Any
from langchain_groq import ChatGroq
from placement_api.core.config import get_settings

class ProgressUpdate(BaseModel):
    progress: dict[str, Any]

class CodeEvaluationRequest(BaseModel):
    question: str
    code: str
    language: str

class CodeEvaluationResponse(BaseModel):
    is_correct: bool = Field(description="True if the code perfectly solves the question, False otherwise.")
    feedback: str = Field(description="Detailed feedback, edge cases, approach, and alternate approach. Format as Markdown.")

router = APIRouter(prefix="/planner", tags=["planner"])

@router.post("/generate", response_model=StudyPlanRead)
async def generate_plan_endpoint(
    request: StudyPlanCreate,
    current_user: CurrentUser,
    db: SessionDep
):
    try:
        plan_data = await generate_study_plan(request)
        
        db_plan = StudyPlan(
            user_id=current_user.id,
            target_company=request.target_company,
            available_days=request.available_days,
            skill_level=request.skill_level,
            plan=plan_data,
            progress={}
        )
        db.add(db_plan)
        await db.commit()
        await db.refresh(db_plan)
        
        return {
            "id": str(db_plan.id),
            "target_company": db_plan.target_company,
            "available_days": db_plan.available_days,
            "skill_level": db_plan.skill_level,
            "plan": db_plan.plan,
            "progress": db_plan.progress,
            "created_at": db_plan.created_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/", response_model=list[StudyPlanRead])
async def list_plans(current_user: CurrentUser, db: SessionDep):
    stmt = select(StudyPlan).where(StudyPlan.user_id == current_user.id).order_by(StudyPlan.created_at.desc())
    result = await db.execute(stmt)
    plans = result.scalars().all()
    
    return [
        {
            "id": str(p.id),
            "target_company": p.target_company,
            "available_days": p.available_days,
            "skill_level": p.skill_level,
            "plan": p.plan,
            "progress": p.progress,
            "created_at": p.created_at
        } for p in plans
    ]

@router.put("/{plan_id}/progress")
async def update_progress(
    plan_id: str,
    update_data: ProgressUpdate,
    current_user: CurrentUser,
    db: SessionDep
):
    import uuid
    from sqlalchemy.orm.attributes import flag_modified
    
    try:
        pid = uuid.UUID(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
        
    plan = await db.get(StudyPlan, pid)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    plan.progress = update_data.progress
    flag_modified(plan, "progress")
    
    await db.commit()
    return {"status": "success"}

@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: CurrentUser,
    db: SessionDep
):
    import uuid
    try:
        pid = uuid.UUID(plan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid plan ID")
        
    plan = await db.get(StudyPlan, pid)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    await db.delete(plan)
    await db.commit()
    return {"status": "success"}

@router.post("/evaluate", response_model=CodeEvaluationResponse)
async def evaluate_code(
    req: CodeEvaluationRequest,
    current_user: CurrentUser
):
    settings = get_settings()
    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.3-70b-versatile",
        temperature=0.1,
    )
    
    prompt = f"""You are an expert technical interviewer and software engineer.
Evaluate the user's code for the following question:
Question: {req.question}

Language: {req.language}
Code:
{req.code}

If the code correctly solves the problem (including edge cases), set `is_correct` to true.
If the code is incorrect or suboptimal, set `is_correct` to false and explain the mistakes, edge cases missed, and provide the correct approach and an alternate approach.

Return your response using ONLY the following XML-like tags:
<is_correct>true</is_correct> (or false)
<feedback>
Detailed feedback, edge cases, approach, and alternate approach. Format as Markdown.
</feedback>"""
    
    try:
        response_msg = await llm.ainvoke(prompt)
        content = response_msg.content.strip()
        
        # Parse XML-like tags
        import re
        is_correct_match = re.search(r"<is_correct>(.*?)</is_correct>", content, re.IGNORECASE)
        feedback_match = re.search(r"<feedback>(.*?)</feedback>", content, re.IGNORECASE | re.DOTALL)
        
        is_correct = False
        if is_correct_match:
            val = is_correct_match.group(1).strip().lower()
            if val == "true" or val == "1" or val == "yes":
                is_correct = True
                
        feedback = "No feedback provided."
        if feedback_match:
            feedback = feedback_match.group(1).strip()
            
        return CodeEvaluationResponse(is_correct=is_correct, feedback=feedback)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Evaluation Error: {str(e)}") from e
