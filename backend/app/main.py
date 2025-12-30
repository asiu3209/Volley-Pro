#Fast API 
from fastapi import FastAPI
from app.api import videos, clips, stats

#Create API Server
app = FastAPI(title="Volley Pro API")

#Register Routes
app.include_router(videos.router, prefix="/videos")
app.include_router(clips.router, prefix="/clips")
app.include_router(stats.router, prefix="/stats")
