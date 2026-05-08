# FastAPI core
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Routers
from app.api.videos import router as videosRouter
from app.api.analysis import router as analysisRouter
from app.api.users import router as users_router
from app.api.profiles import router as profiles_router

# Services
from app.services.video_processing import get_pose_detector


# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────
app = FastAPI(title="Volley Pro API", version="1.0.0")


# ─────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Pre-load MediaPipe model at startup to avoid cold-start delays."""
    get_pose_detector()


# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
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


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
app.include_router(videosRouter, prefix="/videos", tags=["Videos"])
app.include_router(analysisRouter, prefix="/videos", tags=["AI Analysis"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(profiles_router, prefix="/profiles", tags=["Profiles"])


# ─────────────────────────────────────────────
# Static files
# ─────────────────────────────────────────────
FRAMES_DIR = os.environ.get("FRAMES_DIR", "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

app.mount(
    "/frames",
    StaticFiles(directory=FRAMES_DIR, html=False),
    name="frames"
)


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}