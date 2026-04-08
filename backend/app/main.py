#Fast API 
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api import videos, clips, stats

#Create API Server
app = FastAPI(title="Volley Pro API")

#Register Routes to be called from frontend
app.include_router(videos.router, prefix="/videos")
app.include_router(clips.router, prefix="/clips")
app.include_router(stats.router, prefix="/stats")

#Serve frames as static images/files
app.mount("/frames", StaticFiles(directory="frames"), name="frames")
