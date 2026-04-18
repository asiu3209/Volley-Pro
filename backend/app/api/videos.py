import os
import tempfile
import shutil
import cv2


from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.services.video_processing import extract_frames_for_player

router = APIRouter()

ALLOWED_MIME_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
MAX_FILE_SIZE      = 100 * 1024 * 1024
FRAMES_DIR         = os.environ.get("FRAMES_DIR", "frames")


class AnalyzeRequest(BaseModel):
    # Bounding box as fractions of video width/height (0.0 – 1.0)
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

        return {
            "video_filename": os.path.basename(stored_path),
            "preview_frame":  preview_path,
        }

    except HTTPException:
        raise
    except Exception as exc:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=422, detail=f"Upload failed: {exc}") from exc


@router.post("/analyze")
def analyze_video(req: AnalyzeRequest):
    """
    Step 2.  Run player-tracked frame extraction using the bounding
    box (expressed as fractions 0–1) the user drew in the UI.
    """
    video_path = os.path.join(FRAMES_DIR, req.video_filename)
    print("Video Path!!!!!!!!!!!!!!: " + video_path)
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found. Please upload again.")

    try:
        cap   = cv2.VideoCapture(video_path)
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
        print("OUTPUT DIRREEEEEE" + output_dir)
        frames = extract_frames_for_player(
            video_path  = video_path,
            output_dir  = output_dir,
            player_bbox = bbox_px,
            max_frames  = req.max_frames,
            public_folder=analysis_folder
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(exc)
        raise HTTPException(status_code=422, detail=f"Analysis failed: {exc}") from exc
    print(frames)
    return {"total_frames_extracted": len(frames), "frames": frames}