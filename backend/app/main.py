#Fast API
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.videos import router as videosRouter
from app.api.analysis import router as analysisRouter

#from app.api.videos import router as videos_router

app = FastAPI()

#Register Routes to be called from frontend
app.include_router(videosRouter, prefix="/videos")
#app.include_router(clips.router, prefix="/clips")
app.include_router(analysisRouter, prefix="/analysis")
app = FastAPI(title="Volley Pro API", version="1.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
allowed_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(videosRouter, prefix="/videos")

# ── Static files (frames + analysis subdirectories) ───────────────────────────
FRAMES_DIR = os.environ.get("FRAMES_DIR", "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

# html=False so FastAPI doesn't try to serve index.html for directories
app.mount("/frames", StaticFiles(directory=FRAMES_DIR, html=False), name="frames")


@app.get("/health")
def health():
    return {"status": "ok"}