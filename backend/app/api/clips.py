from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.clip import Clip

router = APIRouter()

# Define request data structure
class ClipCreate(BaseModel):
    video_id: str       # Parent video ID
    action_type: str    # e.g., serve, kill
    start_time: float   # Start of clip in seconds
    end_time: float     # End of clip in seconds

@router.post("/")
def create_clip(clip: ClipCreate):
    """
    Save a clip (segment of a video) to the database
    """
    db: Session = SessionLocal()
    db_clip = Clip(
        video_id=clip.video_id,
        action_type=clip.action_type,
        start_time=clip.start_time,
        end_time=clip.end_time,
    )
    db.add(db_clip)
    db.commit()
    db.refresh(db_clip)
    db.close()
    return db_clip
