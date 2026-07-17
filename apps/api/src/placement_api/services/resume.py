import fitz  # PyMuPDF
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from placement_api.core.config import get_settings
from placement_api.schemas.resume import ResumeAnalysis


async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a given PDF byte stream using PyMuPDF."""
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()


async def analyze_resume(text: str, job_description: str = "General Software Engineering Role") -> ResumeAnalysis:
    """Analyzes the extracted resume text against a job description using Groq."""
    settings = get_settings()

    # Truncate resume text to avoid token limits
    resume_excerpt = text[:4000] if len(text) > 4000 else text

    llm = ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.1-8b-instant",
        temperature=0.1,
    ).with_structured_output(ResumeAnalysis)

    sys_prompt = """You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter.
Evaluate the resume against the provided job description and return ONLY the JSON schema requested.
Be specific, practical, and concise in each field. Do not include any extra text outside the JSON."""

    human_prompt = f"""Job Description: {job_description}

Resume Text:
{resume_excerpt}

Return a JSON with:
- ats_score: {{ overall_score: int(0-100), keyword_match: int(0-100), formatting_score: int(0-100), impact_score: int(0-100) }}
- strengths: list of 3-5 specific strengths found in the resume
- weaknesses: list of 3-5 specific gaps or weaknesses
- recommendations: list of 3-5 actionable improvement suggestions"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=sys_prompt),
            HumanMessage(content=human_prompt),
        ])

        if isinstance(response, ResumeAnalysis):
            return response

        # Fallback if structured output doesn't map cleanly
        data = response if isinstance(response, dict) else vars(response)
        return ResumeAnalysis(**data)

    except Exception as e:
        # Return a safe fallback response on errors
        raise RuntimeError(f"Resume analysis failed: {e}") from e
