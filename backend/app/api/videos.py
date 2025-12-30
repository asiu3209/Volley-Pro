from fastapi import APIRouter

print("VIDEOS.PY LOADED")

router = APIRouter()

@router.get("/test")
def test():
    return {"ok": True}
