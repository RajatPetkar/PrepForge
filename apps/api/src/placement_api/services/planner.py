from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from pydantic import BaseModel

from placement_api.core.config import get_settings
from placement_api.schemas.planner import StudyPlanCreate, StudyTask


class PlanResponse(BaseModel):
    tasks: list[StudyTask]

async def generate_study_plan(data: StudyPlanCreate) -> dict[str, Any]:
    """Generates a study plan timeline using LLM based on remaining days and target."""
    settings = get_settings()
    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=8000
    ).with_structured_output(PlanResponse)
    
    company = data.target_company or "General Tech Company"
    
    sys_prompt = f"""You are an expert DSA and Interview preparation coach.
Create a structured {data.available_days}-day study plan for a {data.skill_level} engineer preparing for {company}.

Be highly creative and make the plan extremely useful for a student. 
Instead of just a generic overview, dive deep into specific concepts.
For each day:
- `topic`: The main topic for the day.
- `description`: A motivating and clear description of what to achieve.
- `sub_topics`: List of 2-4 specific concepts to master that day, with an `understanding_goal` for each (e.g., "Understand how topological sort applies to dependency resolution"). You MUST provide at least 5 specific practice questions (as a list of strings) in the `questions` array for each sub_topic (e.g., "Implement a topological sort using DFS", "Course Schedule II on LeetCode", etc.).
- `resources`: Provide 2-3 specific source materials. These can be book names, LeetCode problem patterns, specific YouTube channels, or well-known articles.
- `estimated_hours`: The estimated time required (integer or float).

Distribute the topics efficiently, starting from fundamentals to advanced patterns. 
If available_days is greater than 20, do NOT generate a task for every single day. Instead, generate milestone tasks spread across the timeline (e.g., day 1, day 4, day 7...) up to a MAXIMUM of 20 tasks total to represent the entire plan.
IMPORTANT: You must return the output strictly in the requested JSON format."""
    
    response = await llm.ainvoke([
        SystemMessage(content=sys_prompt),
        HumanMessage(content="Generate the plan.")
    ])
    
    if isinstance(response, PlanResponse):
        tasks = [task.model_dump() for task in response.tasks]
    else:
        # Fallback dictionary conversion if using older langchain abstractions
        tasks = response.get("tasks", []) if hasattr(response, "get") else response.dict().get("tasks", [])
        
    return {"tasks": tasks}
