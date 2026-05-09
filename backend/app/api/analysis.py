# API endpoint for analyzing the frames using Gemini
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.gemini import analyze_frames_with_gemini, normalize_action_type

router = APIRouter()


# =========================
# Request schema
# =========================
class AnalysisRequest(BaseModel):
    frame_paths: list[str]
    action_type: Optional[str] = None


# =========================
# AI ANALYSIS ROUTE
# =========================
@router.post("/analyze-ai")
def analyze_frames(request: AnalysisRequest):
    action_type = normalize_action_type(request.action_type)

    # validate input
    if not request.frame_paths:
        raise HTTPException(
            status_code=400,
            detail="No frame paths provided"
        )

    try:
        # call Gemini service
        feedback = analyze_frames_with_gemini(
            request.frame_paths,
            action_type
        )

        return {
            "action_type": action_type,
            "frames_analyzed": len(request.frame_paths),
            "feedback": feedback,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )
