from typing import Any

from pydantic import BaseModel


class SubTopic(BaseModel):
    concept: str
    understanding_goal: str
    questions: list[str]

class StudyTask(BaseModel):
    day: int
    topic: str
    description: str
    sub_topics: list[SubTopic]
    resources: list[str]
    estimated_hours: float

class StudyPlanCreate(BaseModel):
    target_company: str | None = None
    available_days: int
    skill_level: str

class StudyPlanRead(StudyPlanCreate):
    id: str
    plan: dict[str, Any]
    progress: dict[str, Any]
    created_at: Any | None = None
