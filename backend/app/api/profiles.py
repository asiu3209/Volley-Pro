from fastapi import APIRouter, Query

from app.db import supabase

router = APIRouter()


@router.get("/me")
def get_profile(user_id: str = Query(...)):
    """
    Load profile by auth user id (profiles.id must equal auth.users.id).
    Uses service-role client — not subject to browser RLS.
    """
    uid = str(user_id).strip()
    if not uid:
        return {"profile": None}

    res = (
        supabase.table("profiles")
        .select("*")
        .eq("id", uid)
        .limit(1)
        .execute()
    )
    if res.data:
        return {"profile": res.data[0]}

    handle = f"u_{uid.replace('-', '')}"[:30]
    upsert = supabase.table("profiles").upsert(
        {
            "id": uid,
            "full_name": "VolleyPro player",
            "username": handle,
        },
    ).execute()
    if upsert.data:
        return {"profile": upsert.data[0]}
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