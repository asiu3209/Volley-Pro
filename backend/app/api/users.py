from fastapi import APIRouter
from app.db import supabase

router = APIRouter()


@router.post("/users")
def create_user(email: str):
    res = supabase.table("users").insert({"email": email}).execute()

    return res.data
