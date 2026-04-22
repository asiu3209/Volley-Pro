#Fast API
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api.videos import router as videosRouter
from app.api.analysis import router as analysisRouter

#Create API Server
app = FastAPI(title="Volley Pro API")

#Register Routes to be called from frontend
app.include_router(videosRouter, prefix="/videos")
#app.include_router(clips.router, prefix="/clips")
app.include_router(analysisRouter, prefix="/analysis")

#Serve frames as static images/files
app.mount("/frames", StaticFiles(directory="frames"), name="frames")
