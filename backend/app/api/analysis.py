# API endpoint for analyzing the frames using Gemini
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.gemini import analyze_frames_with_gemini

router = APIRouter()

class AnalysisRequest(BaseModel):
    frame_paths: list[str]
    action_type: Optional[str] = None

@router.post("/analyze")
def analyze_frames(request: AnalysisRequest):
    if not request.frame_paths:
        raise HTTPException(status_code=400, detail="No frame paths provided")

    feedback = analyze_frames_with_gemini(request.frame_paths, request.action_type)

    return {
        "action_type": request.action_type,
        "frames_analyzed": len(request.frame_paths),
        "feedback": feedback,
    }
