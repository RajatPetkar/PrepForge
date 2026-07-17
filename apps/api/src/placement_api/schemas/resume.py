from pydantic import BaseModel


class ATSScore(BaseModel):
    overall_score: int
    keyword_match: int
    formatting_score: int
    impact_score: int

class ResumeAnalysis(BaseModel):
    ats_score: ATSScore
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    extracted_text: str | None = None
