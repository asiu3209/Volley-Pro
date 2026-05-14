import os

from fastapi import APIRouter, Query
from app.db import supabase

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
        return {
            "total_videos": row.get("total_videos", 0),
            "avg_score": row.get("avg_score", 0.0),
        }
    return {"total_videos": 0, "avg_score": 0.0}


@router.get("/videos")
def get_videos(user_id: str = Query(...)):
    res = (
        supabase.table(_VIDEO_ANALYSES)
        .select("id, skill_type, ai_score, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return {"videos": res.data or []}


@router.get("/skill-stats")
def get_skill_stats(user_id: str = Query(...)):
    table = _VIDEO_ANALYSES
    res = (
        supabase.table(table)
        .select("skill_type, ai_score")
        .eq("user_id", user_id)
        .not_.is_("ai_score", "null")
        .execute()
    )
    rows = res.data or []
    grouped: dict[str, list[float]] = {}
    for row in rows:
        skill = row.get("skill_type") or "unknown"
        score = row.get("ai_score")
        if score is not None:
            grouped.setdefault(skill, []).append(float(score))

    stats = []
    for skill, scores in grouped.items():
        stats.append({
            "skill": skill,
            "attempts": len(scores),
            "avg_score": round(sum(scores) / len(scores), 1),
        })
    return {"skill_stats": stats}
