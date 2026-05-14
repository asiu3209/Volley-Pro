import gc
import json
import os
import re
import shutil
import tempfile
import threading
import time
import uuid

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from typing import Optional
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
FRAMES_DIR = os.environ.get("FRAMES_DIR", "frames")
_READ_CHUNK = 1024 * 1024  # 1 MiB — stream to disk without one huge read()

_ANALYSIS_CACHE_LOCK = threading.Lock()
# key -> (expires_at_unix, feedback_text, score_norm)
_ANALYSIS_CACHE: dict[str, tuple[float, str, float | None]] = {}
_ANALYSIS_CACHE_TTL_SEC = float(os.environ.get("VOLLEY_ANALYZE_CACHE_TTL_SEC", "900"))
_ANALYSIS_CACHE_MAX = max(8, int(os.environ.get("VOLLEY_ANALYZE_CACHE_MAX", "128")))

_EXT_TO_MIME = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".qt": "video/quicktime",
    ".avi": "video/x-msvideo",
}


def _normalize_content_type(content_type: str | None) -> str | None:
    if not content_type:
        return None
    return content_type.split(";", 1)[0].strip().lower()


def _effective_video_mime(filename: str | None, content_type: str | None) -> str | None:
    """
    Browsers sometimes send application/octet-stream or MIME with parameters.
    Fall back to filename extension so OpenCV gets a sensible on-disk container name.
    """
    normalized = _normalize_content_type(content_type)
    if normalized in ALLOWED_MIME_TYPES:
        return normalized
    if normalized == "application/octet-stream":
        name = (filename or "").lower()
        for ext, mime in _EXT_TO_MIME.items():
            if name.endswith(ext):
                return mime
    name = (filename or "").lower()
    for ext, mime in _EXT_TO_MIME.items():
        if name.endswith(ext):
            return mime
    return normalized


def _suffix_for_container(mime: str | None) -> str:
    if not mime:
        return ".mp4"
    if "webm" in mime:
        return ".webm"
    if "quicktime" in mime:
        return ".mov"
    if "msvideo" in mime or mime.endswith("/avi"):
        return ".avi"
    return ".mp4"


def _max_upload_bytes() -> int:
    """Default 48 MiB: keeps headroom on 1 GB Railway instances (Python + OpenCV + SDK)."""
    mb = float(os.environ.get("VOLLEY_MAX_UPLOAD_MB", "48"))
    return max(1, int(mb * 1024 * 1024))


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
    del tint
    del roi
    img[y1:y2, x1:x2] = blended
    del blended
    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

    os.makedirs(FRAMES_DIR, exist_ok=True)
    out_name = f"preview_marked_{uuid.uuid4().hex[:12]}.jpg"
    out_path = os.path.abspath(os.path.join(FRAMES_DIR, out_name))
    if not cv2.imwrite(out_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90]):
        raise ValueError("Failed to write marked preview JPEG.")
    del img
    return out_path


def _receive_upload(file: UploadFile) -> str:
    effective = _effective_video_mime(file.filename, file.content_type)
    if effective not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported type: {file.content_type!r} (effective {effective!r}). "
            "Use MP4, WebM, MOV, or AVI.",
        )
    suffix = _suffix_for_container(effective)
    max_b = _max_upload_bytes()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        total = 0
        while True:
            chunk = file.file.read(_READ_CHUNK)
            if not chunk:
                break
            total += len(chunk)
            if total > max_b:
                tmp.close()
                os.unlink(tmp.name)
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large (max {max_b // (1024 * 1024)} MiB).",
                )
            tmp.write(chunk)
        path = tmp.name
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


def _analyze_cache_key(
    video_fs: str,
    bbox: tuple[float, float, float, float],
    action_norm: str | None,
) -> str:
    st = os.stat(video_fs)
    bx = tuple(round(float(x), 4) for x in bbox)
    return f"v1:{st.st_size}:{int(st.st_mtime_ns)}:{bx}:{action_norm or ''}"


def _cache_get_analysis(key: str) -> tuple[str, float | None] | None:
    now = time.time()
    with _ANALYSIS_CACHE_LOCK:
        row = _ANALYSIS_CACHE.get(key)
        if not row:
            return None
        exp, feedback, score = row
        if now > exp:
            del _ANALYSIS_CACHE[key]
            return None
        return feedback, score


def _cache_put_analysis(key: str, feedback_text: str, score_norm: float | None) -> None:
    exp = time.time() + _ANALYSIS_CACHE_TTL_SEC
    with _ANALYSIS_CACHE_LOCK:
        while len(_ANALYSIS_CACHE) >= _ANALYSIS_CACHE_MAX:
            try:
                del _ANALYSIS_CACHE[next(iter(_ANALYSIS_CACHE))]
            except StopIteration:
                break
        _ANALYSIS_CACHE[key] = (exp, feedback_text, score_norm)


def _ensure_profile_row(user_id: str) -> None:
    """video_submissions / user_stats may FK to profiles.id — ensure a row exists."""
    uid = str(user_id).strip()
    if not uid:
        return
    handle = f"u_{uid.replace('-', '')}"[:30]
    try:
        supabase.table("profiles").upsert(
            {
                "id": uid,
                "full_name": "VolleyPro player",
                "username": handle,
            },
        ).execute()
    except Exception:
        pass


def _update_user_stats_row(user_id: str, score_for_stats: float) -> None:
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
def upload_video(file: UploadFile = File(...), x_user_id: Optional[str] = Header(None)):
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
            raise HTTPException(
                status_code=422,
                detail="Cannot read video — try re-encoding to H.264 MP4, or a different clip.",
            )

        os.makedirs(FRAMES_DIR, exist_ok=True)
        base = os.path.basename(tmp_path)
        stored_path = os.path.join(FRAMES_DIR, f"video_{base}")
        preview_name = f"preview_{base}.jpg"
        preview_path = os.path.join(FRAMES_DIR, preview_name)
        shutil.move(tmp_path, stored_path)
        cv2.imwrite(preview_path, first_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        del first_frame

        video_id = str(uuid.uuid4())

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
def analyze_video(req: AnalyzeRequest, x_user_id: Optional[str] = Header(None)):
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

    cache_key = _analyze_cache_key(video_fs, bbox, action_norm)
    hit = _cache_get_analysis(cache_key)
    marked_preview: str | None = None
    used_cache = hit is not None
    feedback_text: str
    score_norm: float | None

    try:
        if hit:
            feedback_text, score_norm = hit
        else:
            try:
                marked_preview = _write_preview_with_selection_box(preview_fs, bbox)
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc
            feedback_text = analyze_video_with_gemini(
                video_path=video_fs,
                preview_image_path=marked_preview,
                action_type=action_norm,
            )
            score_norm = _overall_score_normalized_0_to_10(feedback_text)
            _cache_put_analysis(cache_key, feedback_text, score_norm)

        score_for_stats = score_norm if score_norm is not None else 8.0

        if not used_cache:
            uid = (x_user_id or "").strip() or None
            if uid:
                try:
                    _ensure_profile_row(uid)
                    _update_user_stats_row(uid, score_for_stats)
                except Exception:
                    pass

        gc.collect()

    except HTTPException:
        raise
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Analysis failed: {exc}") from exc
    finally:
        for path in (marked_preview, video_fs, preview_fs):
            if path and os.path.isfile(path):
                try:
                    os.unlink(path)
                except OSError:
                    pass

    return {
        "action_type": action_norm,
        "action_label": action_type_label(action_norm),
        "gemini_feedback": feedback_text,
        "overall_score_0_to_10": score_norm,
        "cached": used_cache,
    }
