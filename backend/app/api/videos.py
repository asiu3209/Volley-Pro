import json
import os
import re
import shutil
import tempfile
import uuid
from datetime import datetime

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.db import supabase
from app.services.gemini import (
    action_type_label,
    action_types_public,
    analyze_video_with_gemini,
    normalize_action_type,
)
from app.services.video_processing import enable_video_orientation

router = APIRouter()

ALLOWED_MIME_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
MAX_FILE_SIZE = 100 * 1024 * 1024
FRAMES_DIR = os.environ.get("FRAMES_DIR", "frames")


class AnalyzeRequest(BaseModel):
    video_id: str
    video_filename: str
    preview_frame: str  # path under FRAMES_DIR or basename-only (unmarked JPEG)
    # Bounding box as fractions of preview width/height (0.0 – 1.0); echoed on preview for Gemini.
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    action_type: str | None = None


def _validate_bbox_frac(x: float, y: float, w: float, h: float) -> None:
    for name, v in (
        ("bbox_x", x),
        ("bbox_y", y),
        ("bbox_w", w),
        ("bbox_h", h),
    ):
        if v < 0.0 - 1e-6 or v > 1.0 + 1e-6:
            raise HTTPException(
                status_code=422,
                detail=f"{name} must be a fraction between 0 and 1.",
            )
    if w < 0.01 or h < 0.01:
        raise HTTPException(
            status_code=422,
            detail="Selection box too small — drag a larger rectangle around the player.",
        )
    if x + w > 1.0 + 1e-6 or y + h > 1.0 + 1e-6:
        raise HTTPException(
            status_code=422,
            detail="Selection box extends outside the preview frame.",
        )


def _write_preview_with_selection_box(
    preview_fs: str,
    bbox: tuple[float, float, float, float],
) -> str:
    """
    Render the same highlight (tint + green border) as the UI onto full-resolution preview JPEG.
    """
    img = cv2.imread(preview_fs)
    if img is None:
        raise ValueError(f"Cannot read preview: {preview_fs}")

    hh, ww = img.shape[:2]
    x, y, bw, bh = bbox
    x1 = max(0, min(ww - 1, int(round(x * ww))))
    y1 = max(0, min(hh - 1, int(round(y * hh))))
    x2 = max(0, min(ww - 1, int(round((x + bw) * ww))))
    y2 = max(0, min(hh - 1, int(round((y + bh) * hh))))
    if x2 <= x1:
        x2 = min(ww - 1, x1 + 2)
    if y2 <= y1:
        y2 = min(hh - 1, y1 + 2)

    roi = img[y1:y2, x1:x2]
    if roi.size == 0:
        raise ValueError("Invalid selection rectangle for preview overlay.")
    tint = np.zeros_like(roi)
    tint[:] = (0, 255, 0)
    blended = cv2.addWeighted(roi, 0.82, tint, 0.18, 0)
    img[y1:y2, x1:x2] = blended
    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

    os.makedirs(FRAMES_DIR, exist_ok=True)
    out_name = f"preview_marked_{uuid.uuid4().hex[:12]}.jpg"
    out_path = os.path.abspath(os.path.join(FRAMES_DIR, out_name))
    if not cv2.imwrite(out_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90]):
        raise ValueError("Failed to write marked preview JPEG.")
    return out_path


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


def _resolve_frames_path(candidate: str) -> str | None:
    if not candidate.strip():
        return None
    p = candidate
    if os.path.isfile(p):
        return os.path.abspath(p)
    bn = os.path.basename(candidate.strip())
    p2 = os.path.join(FRAMES_DIR, bn)
    if os.path.isfile(p2):
        return os.path.abspath(p2)
    p3 = os.path.join(os.getcwd(), FRAMES_DIR, bn)
    if os.path.isfile(p3):
        return os.path.abspath(p3)
    return None


def _strip_code_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t, flags=re.IGNORECASE)
        t = re.sub(r"\s*```\s*$", "", t)
    return t.strip()


def _overall_score_normalized_0_to_10(gemini_text: str) -> float | None:
    try:
        data = json.loads(_strip_code_fences(gemini_text))
    except json.JSONDecodeError:
        return None
    raw = data.get("overall_score")
    if raw is None:
        return None
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return None
    return max(0.0, min(10.0, v / 10.0))


@router.post("/upload")
def upload_video(file: UploadFile = File(...)):
    """
    Receive video, persist it, generate first-frame JPEG for athlete identification UI.
    """
    tmp_path = _receive_upload(file)

    try:
        cap = cv2.VideoCapture(tmp_path)
        enable_video_orientation(cap)
        ret, first_frame = cap.read()
        cap.release()

        if not ret:
            raise HTTPException(status_code=422, detail="Cannot read video.")

        os.makedirs(FRAMES_DIR, exist_ok=True)
        base = os.path.basename(tmp_path)
        stored_path = os.path.join(FRAMES_DIR, f"video_{base}")
        preview_name = f"preview_{base}.jpg"
        preview_path = os.path.join(FRAMES_DIR, preview_name)
        shutil.move(tmp_path, stored_path)
        cv2.imwrite(preview_path, first_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])

        video_id = str(uuid.uuid4())

        supabase.table("video_submissions").insert({
            "id": video_id,
            "user_id": "88a249ab-3284-46bd-9b45-6d12e4e9b21d",
            "video_url": stored_path,
            "skill_type": "unknown",
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "video_id": video_id,
            "video_filename": os.path.basename(stored_path),
            "preview_frame": preview_path,
        }

    except HTTPException:
        raise
    except Exception as exc:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=422, detail=f"Upload failed: {exc}") from exc


@router.get("/action-types")
def list_action_types():
    return {"action_types": action_types_public()}


@router.post("/analyze")
def analyze_video(req: AnalyzeRequest):
    video_fs = os.path.join(FRAMES_DIR, req.video_filename)
    if not os.path.isfile(video_fs):
        raise HTTPException(status_code=404, detail="Video not found. Please upload again.")

    preview_fs = _resolve_frames_path(req.preview_frame)
    if preview_fs is None:
        raise HTTPException(
            status_code=404,
            detail="Preview frame not found. Re-upload so the API can save the JPEG.",
        )

    action_norm = normalize_action_type(req.action_type)
    if req.action_type and req.action_type.strip() and action_norm is None:
        raise HTTPException(
            status_code=422,
            detail="Invalid action_type. Use GET /videos/action-types.",
        )

    _validate_bbox_frac(req.bbox_x, req.bbox_y, req.bbox_w, req.bbox_h)
    bbox = (req.bbox_x, req.bbox_y, req.bbox_w, req.bbox_h)

    marked_preview: str | None = None
    try:
        marked_preview = _write_preview_with_selection_box(preview_fs, bbox)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        import time as _time
        start_time = _time.time()

        feedback_text = analyze_video_with_gemini(
            video_path=video_fs,
            preview_image_path=marked_preview,
            action_type=action_norm,
        )

        processing_time = _time.time() - start_time
        score_norm = _overall_score_normalized_0_to_10(feedback_text)

        supabase.table("ai_analysis_runs").insert({
            "video_id": req.video_id,
            "model_used": "gemini-video-full-clip",
            "processing_time": processing_time,
        }).execute()

        score_for_stats = score_norm if score_norm is not None else 8.0

        supabase.table("video_submissions").update({
            "ai_score": score_for_stats,
            "feedback": {
                "gemini_raw": feedback_text,
                "model": "gemini-video-full-clip",
                "overall_score_normalized_0_to_10": score_norm,
            },
            "skill_type": action_norm or "unknown",
        }).eq("id", req.video_id).execute()

        user_id = "88a249ab-3284-46bd-9b45-6d12e4e9b21d"

        stats = supabase.table("user_stats").select("*").eq("user_id", user_id).execute()

        if stats.data:
            current = stats.data[0]
            total = current["total_videos"] + 1
            avg = ((current["avg_score"] * current["total_videos"]) + score_for_stats) / total

            supabase.table("user_stats").update({
                "total_videos": total,
                "avg_score": avg,
            }).eq("user_id", user_id).execute()
        else:
            supabase.table("user_stats").insert({
                "user_id": user_id,
                "avg_score": score_for_stats,
                "total_videos": 1,
            }).execute()

    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Analysis failed: {exc}") from exc
    finally:
        if marked_preview and os.path.isfile(marked_preview):
            try:
                os.unlink(marked_preview)
            except OSError:
                pass

    return {
        "action_type": action_norm,
        "action_label": action_type_label(action_norm),
        "gemini_feedback": feedback_text,
        "overall_score_0_to_10": score_norm,
    }
