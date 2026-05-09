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
# Limb blend vs short “burst” from wrist/elbow deltas (captures impacts not only global max velocity).
IMPACT_BURST_WEIGHT = 0.26

# Re-check each saved frame: tracker box can lag so the court looks “empty” inside the green rect.
POSE_CHECK_IDX = frozenset({11, 12, 13, 14, 15, 16, 23, 24, 25, 26})
MIN_VISIBLE_POSE = 5
LANDMARK_VIS_CUTOFF = 0.35
REFINE_PAD_PX = 22
SEARCH_EXPAND_FACTOR = 1.68


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


def _robust_unit(arr: np.ndarray, lo_pct: float = 10.0, hi_pct: float = 92.0) -> np.ndarray:
    """
    Map values into ~[0,1] using inner percentiles so one wild outlier frame
    does not flatten everything else — matches “several peaks matter” UX.
    """
    a = np.asarray(arr, dtype=np.float64)
    if a.size == 0:
        return np.zeros_like(a, dtype=np.float64)
    lo = float(np.percentile(a, lo_pct))
    hi = float(np.percentile(a, hi_pct))
    if hi <= lo:
        return _normalise(a)
    out = np.clip((a - lo) / (hi - lo), 0.0, 1.0)
    return out


def _wrist_elbow_burst_signal(wrist_s: list[float], elbow_s: list[float]) -> np.ndarray:
    rw = np.asarray(wrist_s, dtype=np.float64)
    ew = np.asarray(elbow_s, dtype=np.float64)
    fused = rw + ew
    n = len(fused)
    jerk = np.zeros(n, dtype=np.float64)
    if n >= 2:
        jerk[1:] = np.abs(np.diff(fused))
    snap = np.zeros(n, dtype=np.float64)
    if n >= 3:
        snap[2:] = np.abs(fused[:-2] - 2 * fused[1:-1] + fused[2:])
    jb = _robust_unit(jerk)
    sb = _robust_unit(snap)
    return 0.55 * jb + 0.45 * sb


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


def _clip_xywh_frame(
    x: int, y: int, w: int, h: int, fw: int, fh: int,
) -> tuple[int, int, int, int]:
    x = max(0, min(x, fw - 1))
    y = max(0, min(y, fh - 1))
    w = max(8, min(w, fw - x))
    h = max(8, min(h, fh - y))
    return x, y, w, h


def _expand_search_bbox(
    bbox: tuple[int, int, int, int], fw: int, fh: int,
) -> tuple[int, int, int, int]:
    bx, by, bw, bh = bbox
    cx, cy = bx + bw * 0.5, by + bh * 0.5
    nw = min(fw, max(int(bw * SEARCH_EXPAND_FACTOR), bw + 48))
    nh = min(fh, max(int(bh * SEARCH_EXPAND_FACTOR), bh + 48))
    nx = int(cx - nw * 0.5)
    ny = int(cy - nh * 0.5)
    return _clip_xywh_frame(nx, ny, nw, nh, fw, fh)


def _tight_bbox_from_landmarks_global(
    lm,
    roi_off_x: int,
    roi_off_y: int,
    roi_w: int,
    roi_h: int,
    frame_w: int,
    frame_h: int,
) -> tuple[int, int, int, int] | None:
    xs: list[float] = []
    ys: list[float] = []
    for idx in POSE_CHECK_IDX:
        try:
            p = lm.landmark[idx]
            if p.visibility < LANDMARK_VIS_CUTOFF:
                continue
            gx = roi_off_x + p.x * roi_w
            gy = roi_off_y + p.y * roi_h
            xs.append(gx)
            ys.append(gy)
        except (IndexError, AttributeError):
            pass

    if len(xs) < MIN_VISIBLE_POSE:
        return None

    x1 = int(min(xs) - REFINE_PAD_PX)
    y1 = int(min(ys) - REFINE_PAD_PX)
    x2 = int(max(xs) + REFINE_PAD_PX)
    y2 = int(max(ys) + REFINE_PAD_PX)
    bw = x2 - x1
    bh = y2 - y1
    if bw < 36 or bh < 36:
        return None
    return _clip_xywh_frame(x1, y1, bw, bh, frame_w, frame_h)


def _refine_person_bbox(
    frame_bgr: np.ndarray,
    bbox: tuple[int, int, int, int],
    pose,
) -> tuple[int, int, int, int] | None:
    """Return a tight body box from Mediapipe, or None if no credible person in search areas."""
    fh, fw = frame_bgr.shape[:2]
    candidates = [_clip_xywh_frame(*bbox, fw, fh), _expand_search_bbox(bbox, fw, fh)]
    tried: set[tuple[int, int, int, int]] = set()
    for bx, by, bw, bh in candidates:
        if (bx, by, bw, bh) in tried:
            continue
        tried.add((bx, by, bw, bh))
        roi = frame_bgr[by:by + bh, bx:bx + bw]
        if roi.size == 0:
            continue
        rh, rw = roi.shape[:2]
        rgb = cv2.cvtColor(roi, cv2.COLOR_BGR2RGB)
        res = pose.process(rgb)
        if not res.pose_landmarks:
            continue
        tight = _tight_bbox_from_landmarks_global(
            res.pose_landmarks, bx, by, rw, rh, fw, fh,
        )
        if tight is not None:
            return tight
    return None


def _refine_full_frame_bbox(
    frame_bgr: np.ndarray,
    pose,
) -> tuple[int, int, int, int] | None:
    fh, fw = frame_bgr.shape[:2]
    return _refine_person_bbox(frame_bgr, (0, 0, fw, fh), pose)


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

    # Robust limb channels + fused burst scores — secondary contacts stay competitive.
    limb_score = (
        W_WRIST * _robust_unit(np.array(wrist_s)) +
        W_ELBOW * _robust_unit(np.array(elbow_s)) +
        W_SHOULDER * _robust_unit(np.array(shoulder_s)) +
        W_AIRTIME * _robust_unit(np.array(air_s))
    )
    burst_score = _wrist_elbow_burst_signal(wrist_s, elbow_s)
    bw = IMPACT_BURST_WEIGHT
    combined = np.clip((1.0 - bw) * limb_score + bw * burst_score, 0.0, 1.0)

    peaks = [
        i for i in range(1, n - 1)
        if combined[i] > combined[i - 1] and combined[i] > combined[i + 1]
    ]

    if not peaks:
        peaks = list(np.argsort(combined)[::-1][:max_frames])

    peaks.sort(key=lambda i: combined[i], reverse=True)

    mp_pose_sol = mp.solutions.pose
    pose_refine = mp_pose_sol.Pose(
        static_image_mode=True,
        model_complexity=1,
        min_detection_confidence=0.45,
        min_tracking_confidence=0.45,
    )

    metadata = []
    last_saved = -999

    try:
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

            if (
                best_idx is None
                or best_frame is None
                or best_idx - last_saved < min_gap_fr
            ):
                continue

            out = best_frame.copy()

            draw_bbox = None
            if best_bbox is not None:
                draw_bbox = _refine_person_bbox(best_frame, best_bbox, pose_refine)
            else:
                draw_bbox = _refine_full_frame_bbox(best_frame, pose_refine)

            if draw_bbox is None:
                continue

            bx, by, bw, bh = draw_bbox
            cv2.rectangle(out, (bx, by), (bx + bw, by + bh), (0, 255, 0), 2)

            fname = f"frame_{len(metadata)}.jpg"
            path = os.path.join(output_dir, fname)

            cv2.imwrite(path, out, [cv2.IMWRITE_JPEG_QUALITY, 92])

            metadata.append({
                "frame_index": best_idx,
                "timestamp": round(best_idx / fps, 2),
                "path": f"{public_folder}/{fname}",
                "motion_score": float(combined[pi]),
                "tracked_bbox": draw_bbox,
            })

            last_saved = best_idx
    finally:
        pose_refine.close()

    metadata.sort(key=lambda x: x["timestamp"])
    return metadata
