import os
import shutil
import cv2
import numpy as np

try:
    import mediapipe as mp
    _MP_AVAILABLE = True
except ImportError:
    _MP_AVAILABLE = False


# ── Tuning ────────────────────────────────────────────────────────────────────
MIN_GAP_SECONDS = 0.4
CONTEXT_FRAMES  = 3
STRIDE          = 2

WRIST_IDS    = {15, 16}
ELBOW_IDS    = {13, 14}
SHOULDER_IDS = {11, 12}

W_WRIST    = 0.50
W_ELBOW    = 0.25
W_SHOULDER = 0.15
W_AIRTIME  = 0.10


def _blur_score(frame: np.ndarray) -> float:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


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
            total += (dx ** 2 + dy ** 2) ** 0.5
        except IndexError:
            pass
    return total


def _hip_height_score(landmarks, frame_height: int) -> float:
    """High hips relative to frame → player is in the air."""
    if landmarks is None:
        return 0.0
    ys = []
    for idx in [23, 24]:   # left hip, right hip
        try:
            ys.append(landmarks.landmark[idx].y)
        except IndexError:
            pass
    if not ys:
        return 0.0
    avg_y = sum(ys) / len(ys)
    # y=0 is top of frame; reward when hips are in the upper 60%
    return max(0.0, 1.0 - (avg_y / 0.6))


def _normalise(arr: np.ndarray) -> np.ndarray:
    rng = arr.max() - arr.min()
    return (arr - arr.min()) / rng if rng > 0 else np.zeros_like(arr)


def extract_frames_for_player(
    video_path: str,
    public_folder: str,
    output_dir: str,
    player_bbox: tuple[int, int, int, int] | None = None,
    max_frames: int = 8,
    stride: int = STRIDE,
) -> list[dict]:
    """
    Extract impactful frames for a specific player.

    Parameters
    ----------
    video_path   : path to the uploaded video file
    output_dir   : where to write extracted JPEG frames
    player_bbox  : (x, y, w, h) of the bounding box the user drew around the
                   player in the first frame.  None = analyse full frame.
    max_frames   : maximum number of keyframes to return
    stride       : analyse every Nth frame (speed vs. accuracy trade-off)
    """

    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    fps        = cap.get(cv2.CAP_PROP_FPS) or 30.0
    vid_w      = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    vid_h      = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    min_gap_fr = int(MIN_GAP_SECONDS * fps)

    # ── CSRT tracker ──────────────────────────────────────────────────────────
    tracker = None
    current_bbox = player_bbox

    if player_bbox is not None:
        ret, first_frame = cap.read()
        if not ret:
            cap.release()
            return []
        tracker = cv2.legacy.TrackerCSRT_create()
        tracker.init(first_frame, player_bbox)
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    # ── MediaPipe pose ─────────────────────────────────────────────────────────
    pose_detector = None
    if _MP_AVAILABLE:
        mp_pose = mp.solutions.pose
        pose_detector = mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.35,
            min_tracking_confidence=0.35,
        )

    # ── Pass 1: read frames + compute per-frame scores ─────────────────────────
    # Each entry: (raw_frame_index, full_frame, bbox_used_for_crop)
    strided: list[tuple[int, np.ndarray, tuple | None]] = []
    wrist_s: list[float]    = []
    elbow_s: list[float]    = []
    shoulder_s: list[float] = []
    air_s: list[float]      = []

    prev_landmarks  = None
    raw_count       = 0
    tracker_misses  = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if raw_count % stride != 0:
            raw_count += 1
            continue

        # ── Update tracker ───────────────────────────────────────────────────
        bbox_this_frame: tuple | None = None

        if tracker is not None:
            ok, box = tracker.update(frame)
            if ok:
                tracker_misses = 0
                x, y, w, h = [int(v) for v in box]
                # Pad 30 % so raised arms / jump apex stay in crop
                px = int(w * 0.30)
                py = int(h * 0.30)
                x1 = max(0, x - px)
                y1 = max(0, y - py)
                x2 = min(vid_w, x + w + px)
                y2 = min(vid_h, y + h + py)
                bbox_this_frame = (x1, y1, x2 - x1, y2 - y1)
                current_bbox = bbox_this_frame
            else:
                tracker_misses += 1
                # Keep last known box for up to 10 strided frames
                if tracker_misses <= 10 and current_bbox is not None:
                    bbox_this_frame = current_bbox

        # ── Crop to player ROI ───────────────────────────────────────────────
        if bbox_this_frame is not None:
            bx, by, bw, bh = bbox_this_frame
            roi = frame[by : by + bh, bx : bx + bw]
        else:
            roi = frame

        if roi.size == 0:
            raw_count += 1
            continue

        roi_h, roi_w = roi.shape[:2]

        # ── Pose inside ROI ──────────────────────────────────────────────────
        curr_landmarks = None
        wv = ev = sv = av = 0.0

        if pose_detector is not None:
            rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
            res = pose_detector.process(rgb)
            curr_landmarks = res.pose_landmarks

            wv = _landmark_velocity(prev_landmarks, curr_landmarks, WRIST_IDS,    roi_w, roi_h)
            ev = _landmark_velocity(prev_landmarks, curr_landmarks, ELBOW_IDS,    roi_w, roi_h)
            sv = _landmark_velocity(prev_landmarks, curr_landmarks, SHOULDER_IDS, roi_w, roi_h)
            av = _hip_height_score(curr_landmarks, roi_h)

        wrist_s.append(wv)
        elbow_s.append(ev)
        shoulder_s.append(sv)
        air_s.append(av)
        strided.append((raw_count, frame.copy(), bbox_this_frame))

        prev_landmarks = curr_landmarks
        raw_count += 1

    cap.release()
    if pose_detector:
        pose_detector.close()

    if not strided:
        return []

    n = len(strided)

    # ── Combine + normalise scores ─────────────────────────────────────────────
    combined = (
        W_WRIST    * _normalise(np.array(wrist_s))
        + W_ELBOW    * _normalise(np.array(elbow_s))
        + W_SHOULDER * _normalise(np.array(shoulder_s))
        + W_AIRTIME  * _normalise(np.array(air_s))
    )

    # ── Find local peaks ───────────────────────────────────────────────────────
    peaks: list[int] = [
        i for i in range(1, n - 1)
        if combined[i] > combined[i - 1] and combined[i] > combined[i + 1]
    ]
    if not peaks:
        peaks = list(np.argsort(combined)[::-1][:max_frames])

    peaks.sort(key=lambda i: combined[i], reverse=True)

    # ── Select frames ──────────────────────────────────────────────────────────
    metadata: list[dict] = []
    last_saved = -(min_gap_fr + 1)

    for pi in peaks:
        if len(metadata) >= max_frames:
            break

        ctx_start = max(0, pi - CONTEXT_FRAMES)
        ctx_end   = min(n - 1, pi + CONTEXT_FRAMES)

        best_raw_idx = best_blur = None
        best_frame = best_bbox = None

        for si in range(ctx_start, ctx_end + 1):
            raw_idx, frm, bbox = strided[si]
            b = _blur_score(frm)
            if best_blur is None or b > best_blur:
                best_blur    = b
                best_frame   = frm
                best_raw_idx = raw_idx
                best_bbox    = bbox

        if best_raw_idx is None or best_raw_idx - last_saved < min_gap_fr:
            continue

        # Draw bounding box on the saved frame
        out_frame = best_frame.copy()
        if best_bbox is not None:
            bx, by, bw, bh = best_bbox
            cv2.rectangle(out_frame, (bx, by), (bx + bw, by + bh), (0, 255, 0), 2)
            cv2.putText(
                out_frame, "Player",
                (bx, max(by - 8, 0)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2,
            )

        fname = f"frame_{len(metadata)}.jpg"
        frame_path = os.path.join(output_dir, fname)
        print("FRAME PATH: " + frame_path)

        cv2.imwrite(frame_path, out_frame, [cv2.IMWRITE_JPEG_QUALITY, 92])

        metadata.append({
            "frame_index":  best_raw_idx,
            "timestamp":    round(best_raw_idx / fps, 2),
            "path":         f"/{public_folder}/{fname}",
            "motion_score": round(float(combined[pi]), 4),
            "tracked_bbox": best_bbox,
        })
        last_saved = best_raw_idx

    metadata.sort(key=lambda m: m["timestamp"])
    return metadata


# ── Legacy wrapper (keeps the old API working) ────────────────────────────────
def extract_frames(
    video_path: str,
    output_dir: str,
    every_n_frames: int = 5,
) -> list[dict]:
    """Backwards-compatible shim — no player bbox, full-frame analysis."""
    return extract_frames_for_player(
        video_path=video_path,
        output_dir=output_dir,
        player_bbox=None,
        max_frames=8,
        stride=every_n_frames,
    )