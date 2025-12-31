from fastapi import APIRouter
from pydantic import BaseModel
import uuid
from sqlalchemy.orm import Session
from app.services.s3 import generate_presigned_upload_url
from app.db.session import SessionLocal
from app.models.video import Video

# Create router

router = APIRouter()

@router.post("/presign") #POST API Route
def presign_video():
    video_id = str(uuid.uuid4())
    s3_key = f"videos/{video_id}.mp4"
    upload_url = generate_presigned_upload_url(s3_key) #Get Presigned URL from S3 Service
    #Return JSON Data
    return {
        "video_id" : video_id,
        "s3_key" : s3_key,
        "upload_url" : upload_url,
    } 

class VideoCreate(BaseModel):
    """
    Define the data the frontend will send to save video info
    """
    video_id: str
    s3_url: str
    duration: float | None = None

@router.post("/save") #POST API Route
def save_video(video: VideoCreate):
    """
    Save video info to PostgreSQL after frontend uploads video to S3
    """
    db: Session = SessionLocal()  # Start database session

    # Create Video object made in SQL Models
    db_video = Video(
        id=video.video_id,
        s3_url=video.s3_url,
        duration=video.duration,
    )

    db.add(db_video)  # Add to session
    db.commit()       # Commit to database
    db.refresh(db_video)  # Refresh to get DB-generated fields
    db.close()        # Close session

    return db_video