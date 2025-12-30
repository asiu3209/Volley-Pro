from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base
import uuid

class Clip(Base):
    __tablename__ = "clips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) 
    video_id = Column(UUID(as_uuid=True),ForeignKey("videos.id")) #Reference to Video
    action_type = Column(String)
    start_time = Column(Float) #Starting time from video in seconds
    end_time = Column(Float) # Ending time of clip in seconds
    