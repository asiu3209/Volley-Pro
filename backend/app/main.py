import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.profiles import router as profiles_router
from app.api.users import router as users_router
from app.api.videos import router as videosRouter


app = FastAPI(title="Volley Pro API", version="1.0.0")

allowed_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videosRouter, prefix="/videos", tags=["Videos"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(profiles_router, prefix="/profiles", tags=["Profiles"])

FRAMES_DIR = os.environ.get("FRAMES_DIR", "frames")
os.makedirs(FRAMES_DIR, exist_ok=True)

app.mount(
    "/frames",
    StaticFiles(directory=FRAMES_DIR, html=False),
    name="frames",
)


@app.get("/health")
def health():
    return {"status": "ok"}
