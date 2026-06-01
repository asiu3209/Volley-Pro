from fastapi import APIRouter, Query

from app.db import supabase

router = APIRouter()


@router.get("/me")
def get_profile(user_id: str = Query(...)):
    res = (
        supabase.table("profiles")
        .select("*")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if res.data:
        return {"profile": res.data[0]}
    return {"profile": None}


@router.post("/profiles")
def create_profile(
    user_id: str,
    full_name: str,
    username: str,
    position: str = None,
    skill_level: int = None
):
    res = supabase.table("profiles").insert({
        "id": user_id,
        "full_name": full_name,
        "username": username,
        "position": position,
        "skill_level": skill_level
    }).execute()

    return res.data