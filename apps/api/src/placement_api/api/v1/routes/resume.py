from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from placement_api.api.deps import CurrentUser
from placement_api.schemas.resume import ResumeAnalysis
from placement_api.services.resume import analyze_resume, extract_text_from_pdf

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/analyze", response_model=ResumeAnalysis)
async def analyze_resume_endpoint(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    job_description: str = Form("General Software Engineering Role")
):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    try:
        content = await file.read()
        text = await extract_text_from_pdf(content)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. Ensure it is not a scanned image.")
            
        analysis = await analyze_resume(text, job_description)
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
