import os
import shutil
import cv2
import numpy as np
import mediapipe as mp

# Global model cache - initialized once at startup
_pose_detector = None

def get_pose_detector():
    """Get or initialize the shared MediaPipe Pose detector."""
    global _pose_detector
    if _pose_detector is None:
        mp_pose = mp.solutions.pose
        _pose_detector = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.35,
            min_tracking_confidence=0.35,
        )
    return _pose_detector


# ── Tuning ────────────────────────────────────────────────────────────────────
MIN_GAP_SECONDS = 0.4
CONTEXT_FRAMES = 3
STRIDE = 2

WRIST_IDS = {15, 16}
ELBOW_IDS = {13, 14}
SHOULDER_IDS = {11, 12}

W_WRIST = 0.50
W_ELBOW = 0.25
W_SHOULDER = 0.15
W_AIRTIME = 0.10


def enable_video_orientation(cap: cv2.VideoCapture) -> None:
    if hasattr(cv2, "CAP_PROP_ORIENTATION_AUTO"):
        cap.set(cv2.CAP_PROP_ORIENTATION_AUTO, 1)


# ── Helpers ──────────────────────────────────────────────────────────────────
def _blur_score(frame: np.ndarray) -> float:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _normalise(arr: np.ndarray) -> np.ndarray:
    rng = arr.max() - arr.min()
    return (arr - arr.min()) / rng if rng > 0 else np.zeros_like(arr)


def _landmark_velocity(prev_lm, curr_lm, ids: set, w: int, h: int) -> float:
    if prev_lm is None or curr_lm is None:
        return 0.0

    total = 0.0
    for idx in ids:
        try:
            p = prev_lm.landmark[idx]
            c = curr_lm.landmark[idx]
            dx = (c.x - p.x) * w
            dy = (c.y - p.y) * h
            total += (dx**2 + dy**2) ** 0.5
        except Exception:
            pass
    return total


def _hip_height_score(landmarks, frame_height: int) -> float:
    if landmarks is None:
        return 0.0

    ys = []
    for idx in [23, 24]:
        try:
            ys.append(landmarks.landmark[idx].y)
        except Exception:
            pass

    if not ys:
        return 0.0

    avg_y = sum(ys) / len(ys)
    return max(0.0, 1.0 - (avg_y / 0.6))


def _best_context_frame(
    video_path: str,
    strided: list[tuple[int, tuple[int, int, int, int] | None]],
    ctx_start: int,
    ctx_end: int,
) -> tuple[int | None, np.ndarray | None, tuple[int, int, int, int] | None]:
    wanted = {strided[i][0]: strided[i][1] for i in range(ctx_start, ctx_end + 1)}
    if not wanted:
        return None, None, None

    cap = cv2.VideoCapture(video_path)
    enable_video_orientation(cap)

    best_frame = None
    best_idx = None
    best_bbox = None
    best_blur = -1.0
    max_idx = max(wanted)
    raw_count = 0

    while raw_count <= max_idx:
        ret, frame = cap.read()
        if not ret:
            break

        if raw_count in wanted:
            blur = _blur_score(frame)
            if blur > best_blur:
                best_blur = blur
                best_frame = frame.copy()
                best_idx = raw_count
                best_bbox = wanted[raw_count]

        raw_count += 1

    cap.release()
    return best_idx, best_frame, best_bbox


# ── MAIN FUNCTION ────────────────────────────────────────────────────────────
def extract_frames_for_player(
    video_path: str,
    public_folder: str,
    output_dir: str,
    player_bbox: tuple[int, int, int, int] | None = None,
    max_frames: int = 8,
    stride: int = STRIDE,
) -> list[dict]:

    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    enable_video_orientation(cap)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    min_gap_fr = int(MIN_GAP_SECONDS * fps)

    # ── Tracker ──────────────────────────────────────────────────────────────
    tracker = None
    current_bbox = player_bbox

    if player_bbox is not None:
        ret, first_frame = cap.read()
        if not ret:
            cap.release()
            return []

        vid_h, vid_w = first_frame.shape[:2]
        tracker = cv2.legacy.TrackerCSRT_create()
        tracker.init(first_frame, player_bbox)
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    else:
        ret, first_frame = cap.read()
        if not ret:
            cap.release()
            return []
        vid_h, vid_w = first_frame.shape[:2]
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    # ── MediaPipe (cached globally to avoid memory overhead) ────────────
    pose_detector = get_pose_detector()

    # ── Storage ───────────────────────────────────────────────────────────────
    strided = []
    wrist_s, elbow_s, shoulder_s, air_s = [], [], [], []

    prev_landmarks = None
    raw_count = 0
    tracker_misses = 0

    # ── Frame loop ───────────────────────────────────────────────────────────
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if raw_count % stride != 0:
            raw_count += 1
            continue

        bbox_this_frame = None

        # Tracker update
        if tracker is not None:
            ok, box = tracker.update(frame)

            if ok:
                tracker_misses = 0
                x, y, w, h = [int(v) for v in box]

                px, py = int(w * 0.3), int(h * 0.3)

                x1 = max(0, x - px)
                y1 = max(0, y - py)
                x2 = min(vid_w, x + w + px)
                y2 = min(vid_h, y + h + py)

                bbox_this_frame = (x1, y1, x2 - x1, y2 - y1)
                current_bbox = bbox_this_frame

            else:
                tracker_misses += 1
                if tracker_misses <= 10:
                    bbox_this_frame = current_bbox

        # Crop
        if bbox_this_frame:
            bx, by, bw, bh = bbox_this_frame
            roi = frame[by:by + bh, bx:bx + bw]
        else:
            roi = frame

        if roi.size == 0:
            raw_count += 1
            continue

        roi_h, roi_w = roi.shape[:2]

        # Pose detection
        rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
        res = pose_detector.process(rgb)
        curr_landmarks = res.pose_landmarks

        wv = _landmark_velocity(prev_landmarks, curr_landmarks, WRIST_IDS, roi_w, roi_h)
        ev = _landmark_velocity(prev_landmarks, curr_landmarks, ELBOW_IDS, roi_w, roi_h)
        sv = _landmark_velocity(prev_landmarks, curr_landmarks, SHOULDER_IDS, roi_w, roi_h)
        av = _hip_height_score(curr_landmarks, roi_h)

        wrist_s.append(wv)
        elbow_s.append(ev)
        shoulder_s.append(sv)
        air_s.append(av)

        strided.append((raw_count, bbox_this_frame))

        prev_landmarks = curr_landmarks
        raw_count += 1

    cap.release()

    if not strided:
        return []

    n = len(strided)

    # Scores
    combined = (
        W_WRIST * _normalise(np.array(wrist_s)) +
        W_ELBOW * _normalise(np.array(elbow_s)) +
        W_SHOULDER * _normalise(np.array(shoulder_s)) +
        W_AIRTIME * _normalise(np.array(air_s))
    )

    peaks = [
        i for i in range(1, n - 1)
        if combined[i] > combined[i - 1] and combined[i] > combined[i + 1]
    ]

    if not peaks:
        peaks = list(np.argsort(combined)[::-1][:max_frames])

    peaks.sort(key=lambda i: combined[i], reverse=True)

    metadata = []
    last_saved = -999

    for pi in peaks:
        if len(metadata) >= max_frames:
            break

        ctx_start = max(0, pi - CONTEXT_FRAMES)
        ctx_end = min(n - 1, pi + CONTEXT_FRAMES)

        best_idx, best_frame, best_bbox = _best_context_frame(
            video_path=video_path,
            strided=strided,
            ctx_start=ctx_start,
            ctx_end=ctx_end,
        )

        if best_idx is None or best_frame is None or best_idx - last_saved < min_gap_fr:
            continue

        out = best_frame.copy()

        if best_bbox:
            bx, by, bw, bh = best_bbox
            cv2.rectangle(out, (bx, by), (bx + bw, by + bh), (0, 255, 0), 2)

        fname = f"frame_{len(metadata)}.jpg"
        path = os.path.join(output_dir, fname)

        cv2.imwrite(path, out, [cv2.IMWRITE_JPEG_QUALITY, 92])

        metadata.append({
            "frame_index": best_idx,
            "timestamp": round(best_idx / fps, 2),
            "path": f"{public_folder}/{fname}",
            "motion_score": float(combined[pi]),
            "tracked_bbox": best_bbox,
        })

        last_saved = best_idx

    metadata.sort(key=lambda x: x["timestamp"])
    return metadata
