from fastapi import APIRouter
from app.db import supabase

router = APIRouter()

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