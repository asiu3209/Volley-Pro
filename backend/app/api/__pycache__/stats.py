from fastapi import APIRouter
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models.clip import Clip

router = APIRouter()

@router.get("/video/{video_id}")
def video_stats(video_id: str):
    """
    Return counts of each action type for a given video
    """
    db = SessionLocal()
    results = (
        db.query(Clip.action_type, func.count(Clip.id))
        .filter(Clip.video_id == video_id)
        .group_by(Clip.action_type)
        .all()
    )
    db.close()
    # Convert list of tuples to dictionary {action_type: count}
    return {action: count for action, count in results}
