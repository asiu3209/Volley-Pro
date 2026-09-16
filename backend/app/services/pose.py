"""MediaPipe pose extraction for the athlete inside a fractional bbox."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass

import cv2
import numpy as np

from app.services.video_processing import enable_video_orientation

logger = logging.getLogger(__name__)

# Sample at most this many frames for latency.
_MAX_POSE_FRAMES = int(os.environ.get("POSE_MAX_FRAMES", "48"))


@dataclass
class PoseExtractionResult:
    pose_seq: np.ndarray | None  # (T, 33, 4) x,y,z,visibility
    fps: float
    n_frames_read: int
    n_frames_posed: int
    tracking_ok: bool
    notes: list[str]


def _expand_bbox(
    x: float, y: float, w: float, h: float, pad: float = 0.12
) -> tuple[float, float, float, float]:
    nx = max(0.0, x - pad * w)
    ny = max(0.0, y - pad * h)
    nw = min(1.0 - nx, w * (1 + 2 * pad))
    nh = min(1.0 - ny, h * (1 + 2 * pad))
    return nx, ny, nw, nh


def extract_pose_sequence(
    video_path: str,
    bbox: tuple[float, float, float, float],
) -> PoseExtractionResult:
    """
    Run MediaPipe Pose on frames, preferring the person inside the user bbox.
    Returns normalized landmark sequences (image coords 0–1).
    """
    notes: list[str] = []
    try:
        import mediapipe as mp
    except ImportError:
        notes.append("mediapipe_not_installed")
        return PoseExtractionResult(None, 30.0, 0, 0, False, notes)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        notes.append("video_open_failed")
        return PoseExtractionResult(None, 30.0, 0, 0, False, notes)

    enable_video_orientation(cap)
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    if fps < 1:
        fps = 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    stride = max(1, total // _MAX_POSE_FRAMES) if total > _MAX_POSE_FRAMES else 1
    stride = max(stride, 1)

    roi = _expand_bbox(*bbox)
    posed: list[np.ndarray] = []
    n_read = 0

    mp_pose = mp.solutions.pose
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        min_detection_confidence=0.4,
        min_tracking_confidence=0.4,
    ) as pose:
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            n_read += 1
            if idx % stride != 0:
                idx += 1
                continue
            idx += 1
            if len(posed) >= _MAX_POSE_FRAMES:
                break

            h, w = frame.shape[:2]
            # Crop loosely to ROI for speed / focus, then map landmarks back.
            x0 = int(roi[0] * w)
            y0 = int(roi[1] * h)
            x1 = int((roi[0] + roi[2]) * w)
            y1 = int((roi[1] + roi[3]) * h)
            x0, y0 = max(0, x0), max(0, y0)
            x1, y1 = min(w, max(x0 + 1, x1)), min(h, max(y0 + 1, y1))
            crop = frame[y0:y1, x0:x1]
            if crop.size == 0:
                continue

            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            if not result.pose_landmarks:
                continue

            # Remap crop-normalized landmarks to full-frame normalized coords.
            cw, ch = (x1 - x0), (y1 - y0)
            pts = np.zeros((33, 4), dtype=np.float64)
            for i, lm in enumerate(result.pose_landmarks.landmark):
                abs_x = (x0 + lm.x * cw) / w
                abs_y = (y0 + lm.y * ch) / h
                pts[i] = [abs_x, abs_y, lm.z, getattr(lm, "visibility", 1.0)]
            posed.append(pts)

    cap.release()

    if len(posed) < 3:
        notes.append("insufficient_pose_frames")
        return PoseExtractionResult(
            None, fps, n_read, len(posed), False, notes
        )

    seq = np.stack(posed, axis=0)
    notes.append(f"posed_frames={len(posed)}")
    notes.append(f"stride={stride}")
    return PoseExtractionResult(seq, fps, n_read, len(posed), True, notes)
