import os
import tempfile
import shutil
import cv2
from app.db import supabase
import uuid
from datetime import datetime


from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.video_processing import extract_frames_for_player

router = APIRouter()

ALLOWED_MIME_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
MAX_FILE_SIZE      = 100 * 1024 * 1024
FRAMES_DIR         = os.environ.get("FRAMES_DIR", "frames")


class AnalyzeRequest(BaseModel):
    # Bounding box as fractions of video width/height (0.0 – 1.0)
    video_id: str   # added a video id to connect to the supabase DB
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    video_filename: str
    max_frames: int = 8


def _receive_upload(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported type: {file.content_type}")
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        shutil.copyfileobj(file.file, tmp)
        path = tmp.name
    if os.path.getsize(path) > MAX_FILE_SIZE:
        os.unlink(path)
        raise HTTPException(status_code=413, detail="File too large (max 100 MB).")
    return path


@router.post("/upload")
def upload_video(file: UploadFile = File(...)):
    """
    Step 1.  Receive the video, return the first frame for the
    player-selection UI plus a filename token for /analyze.
    """
    tmp_path = _receive_upload(file)

    try:
        cap = cv2.VideoCapture(tmp_path)
        ret, first_frame = cap.read()
        cap.release()

        if not ret:
            raise HTTPException(status_code=422, detail="Cannot read video.")

        os.makedirs(FRAMES_DIR, exist_ok=True)
        base         = os.path.basename(tmp_path)
        stored_path  = os.path.join(FRAMES_DIR, f"video_{base}")
        preview_name = f"preview_{base}.jpg"
        print("THIS THINGY: " + FRAMES_DIR)
        preview_path = os.path.join(FRAMES_DIR, preview_name)
        print("Preview Path: " + preview_path)
        shutil.move(tmp_path, stored_path)
        cv2.imwrite(preview_path, first_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])

        video_id = str(uuid.uuid4())

        supabase.table("video_submissions").insert({
            "id": video_id,
            "user_id": "88a249ab-3284-46bd-9b45-6d12e4e9b21d",  # replace later with auth
            "video_url": stored_path,
            "skill_type": "unknown",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "video_id": video_id,
            "video_filename": os.path.basename(stored_path),
            "preview_frame": preview_path
        }

    except HTTPException:
        raise
    except Exception as exc:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=422, detail=f"Upload failed: {exc}") from exc


@router.post("/analyze")
def analyze_video(req: AnalyzeRequest):
    video_path = os.path.join(FRAMES_DIR, req.video_filename)

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found. Please upload again.")

    try:
        import time
        start_time = time.time()

        cap = cv2.VideoCapture(video_path)
        vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        bbox_px = (
            int(req.bbox_x * vid_w),
            int(req.bbox_y * vid_h),
            int(req.bbox_w * vid_w),
            int(req.bbox_h * vid_h),
        )

        analysis_folder = f"analysis_{req.video_filename}"
        output_dir = os.path.join(FRAMES_DIR, analysis_folder)

        frames = extract_frames_for_player(
            video_path=video_path,
            output_dir=output_dir,
            player_bbox=bbox_px,
            max_frames=req.max_frames,
            public_folder=analysis_folder
        )

        processing_time = time.time() - start_time

        # ✅ Save AI run
        supabase.table("ai_analysis_runs").insert({
            "video_id": req.video_id,
            "model_used": "frame-extractor-v1",
            "processing_time": processing_time
        }).execute()

        # ✅ Update video
        score = 8.0  # mock score

        supabase.table("video_submissions").update({
            "ai_score": score,
            "feedback": {"note": "Auto-generated feedback"}
        }).eq("id", req.video_id).execute()

        # ✅ Update stats (NOW IT RUNS)
        user_id = "88a249ab-3284-46bd-9b45-6d12e4e9b21d"

        stats = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()

        if stats.data:
            current = stats.data[0]
            total = current["total_videos"] + 1
            avg = ((current["avg_score"] * current["total_videos"]) + score) / total

            supabase.table("user_stats").update({
                "total_videos": total,
                "avg_score": avg
            }).eq("user_id", user_id).execute()
        else:
            # create stats if not exist
            supabase.table("user_stats").insert({
                "user_id": user_id,
                "avg_score": score,
                "total_videos": 1
            }).execute()

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Analysis failed: {exc}") from exc

    return {
        "total_frames_extracted": len(frames),
        "frames": frames
    }