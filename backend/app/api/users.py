import json
import os

from fastapi import APIRouter, Query

from app.db import supabase
from app.services.gemini import action_type_label
from app.services.stats import SKILL_SCORE_COLUMNS, skill_stats_from_rows

router = APIRouter()

_VIDEO_ANALYSES = os.environ.get("VIDEO_ANALYSES_TABLE", "video_analyses")


@router.post("/users")
def create_user(email: str):
    res = supabase.table("users").insert({"email": email}).execute()
    return res.data


@router.get("/stats")
def get_stats(user_id: str = Query(...)):
    res = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()
    if res.data:
        row = res.data[0]
        out = {
            "total_videos": row.get("total_videos", 0),
            "avg_score": row.get("avg_score", 0.0),
        }
        for col in SKILL_SCORE_COLUMNS:
            if col in row and row[col] is not None:
                out[col] = row[col]
        return out
    return {"total_videos": 0, "avg_score": 0.0}


def _feedback_to_gemini_feedback_string(feedback: object) -> str:
    """Match VideoEntry.gemini_feedback: JSON string for DoneCoachingSummary, or raw text."""
    if feedback is None:
        return ""
    if isinstance(feedback, str):
        return feedback
    if isinstance(feedback, dict):
        return json.dumps(feedback, ensure_ascii=False)
    return str(feedback)


@router.get("/videos")
def get_videos(user_id: str = Query(...)):
    res = (
        supabase.table(_VIDEO_ANALYSES)
        .select("id, skill_type, ai_score, created_at, feedback")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    rows = res.data or []
    videos: list[dict] = []
    for row in rows:
        skill = row.get("skill_type")
        videos.append({
            "id": row.get("id"),
            "skill_type": skill,
            "ai_score": row.get("ai_score"),
            "created_at": row.get("created_at"),
            "gemini_feedback": _feedback_to_gemini_feedback_string(row.get("feedback")),
            "action_label": action_type_label(skill if isinstance(skill, str) else None),
            "preview_frame": None,
        })
    return {"videos": videos}


@router.get("/skill-stats")
def get_skill_stats(user_id: str = Query(...)):
    res = (
        supabase.table(_VIDEO_ANALYSES)
        .select("skill_type, ai_score")
        .eq("user_id", user_id)
        .execute()
    )
    return {"skill_stats": skill_stats_from_rows(res.data or [])}
