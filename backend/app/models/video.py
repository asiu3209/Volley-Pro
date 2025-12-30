from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base import Base

#Video Class taking in the Base 
class Video(Base):
    __tablename__ = "videos" #Table name is PostGre
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) #Unique ID
    s3_url = Column(String, nullable=False) #Cloud link for S3 video
    duration = Column(Float, nullable=True) #How long the video is in seconds
    uploaded_at = Column(DateTime, server_default=func.now()) #When video was uploaded
