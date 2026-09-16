"""Pose-sequence feature engineering for volleyball skill models."""

from __future__ import annotations

import numpy as np

from app.ml import LM

# Ordered feature names — must match train + inference.
FEATURE_NAMES: list[str] = [
    "arm_elev_mean",
    "arm_elev_max",
    "arm_elev_std",
    "elbow_flex_mean",
    "elbow_flex_max",
    "elbow_flex_std",
    "knee_flex_mean",
    "knee_flex_max",
    "knee_flex_std",
    "trunk_lean_mean",
    "trunk_lean_max",
    "com_y_range",
    "com_y_std",
    "wrist_speed_mean",
    "wrist_speed_max",
    "ankle_speed_mean",
    "ankle_speed_max",
    "lr_arm_asym",
    "lr_knee_asym",
    "t_peak_arm",
    "t_peak_knee",
    "t_peak_wrist_speed",
    "t_peak_com_up",
    "arm_above_shoulder_frac",
    "deep_knee_frac",
    "n_frames_norm",
]


def _angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Interior angle at b (degrees) for points a-b-c."""
    ba = a - b
    bc = c - b
    nba = np.linalg.norm(ba)
    nbc = np.linalg.norm(bc)
    if nba < 1e-6 or nbc < 1e-6:
        return float("nan")
    cos = float(np.clip(np.dot(ba, bc) / (nba * nbc), -1.0, 1.0))
    return float(np.degrees(np.arccos(cos)))


def _safe_stats(arr: np.ndarray) -> tuple[float, float, float]:
    valid = arr[np.isfinite(arr)]
    if valid.size == 0:
        return 0.0, 0.0, 0.0
    return float(np.mean(valid)), float(np.max(valid)), float(np.std(valid))


def _peak_time(series: np.ndarray) -> float:
    valid = np.where(np.isfinite(series))[0]
    if valid.size == 0:
        return 0.5
    i = int(valid[np.argmax(series[valid])])
    n = max(len(series) - 1, 1)
    return float(i / n)


def landmarks_to_xy(frame_lms: np.ndarray) -> dict[str, np.ndarray]:
    """frame_lms: (33, 3) or (33, 4) → named (x, y) in image-normalized coords."""
    out: dict[str, np.ndarray] = {}
    for name, idx in LM.items():
        out[name] = frame_lms[idx, :2].astype(np.float64)
    return out


def frame_kinematics(xy: dict[str, np.ndarray]) -> dict[str, float]:
    """Per-frame scalar kinematics from landmark xy."""
    # Prefer right-side chain when both exist; average when both valid.
    def elbow_flex(side: str) -> float:
        return _angle(xy[f"{side}_shoulder"], xy[f"{side}_elbow"], xy[f"{side}_wrist"])

    def knee_flex(side: str) -> float:
        return _angle(xy[f"{side}_hip"], xy[f"{side}_knee"], xy[f"{side}_ankle"])

    def arm_elev(side: str) -> float:
        # Degrees above horizontal: wrist relative to shoulder (image y down).
        sh = xy[f"{side}_shoulder"]
        wr = xy[f"{side}_wrist"]
        dx = wr[0] - sh[0]
        dy = sh[1] - wr[1]  # up positive
        return float(np.degrees(np.arctan2(dy, abs(dx) + 1e-6)))

    le, re = elbow_flex("l"), elbow_flex("r")
    lk, rk = knee_flex("l"), knee_flex("r")
    la, ra = arm_elev("l"), arm_elev("r")

    mid_sh = 0.5 * (xy["l_shoulder"] + xy["r_shoulder"])
    mid_hip = 0.5 * (xy["l_hip"] + xy["r_hip"])
    trunk = float(
        np.degrees(np.arctan2(mid_hip[0] - mid_sh[0], mid_hip[1] - mid_sh[1] + 1e-6))
    )
    com_y = float(0.5 * (mid_sh[1] + mid_hip[1]))
    wrist_y = float(0.5 * (xy["l_wrist"][1] + xy["r_wrist"][1]))
    ankle_y = float(0.5 * (xy["l_ankle"][1] + xy["r_ankle"][1]))

    return {
        "arm_elev": float(np.nanmean([la, ra])),
        "elbow_flex": float(np.nanmean([le, re])),
        "knee_flex": float(np.nanmean([lk, rk])),
        "trunk_lean": trunk,
        "com_y": com_y,
        "wrist_y": wrist_y,
        "ankle_y": ankle_y,
        "lr_arm_asym": abs(la - ra) if np.isfinite(la) and np.isfinite(ra) else 0.0,
        "lr_knee_asym": abs(lk - rk) if np.isfinite(lk) and np.isfinite(rk) else 0.0,
        "arm_above": 1.0 if np.nanmean([la, ra]) > 45 else 0.0,
        "deep_knee": 1.0 if np.nanmean([lk, rk]) < 120 else 0.0,
    }


def sequence_feature_vector(
    pose_seq: np.ndarray,
    fps: float = 30.0,
) -> np.ndarray:
    """
    pose_seq: (T, 33, 3+) landmark array in normalized image coords.
    Returns 1D feature vector aligned with FEATURE_NAMES.
    """
    if pose_seq is None or len(pose_seq) < 2:
        return np.zeros(len(FEATURE_NAMES), dtype=np.float64)

    rows = [frame_kinematics(landmarks_to_xy(pose_seq[t])) for t in range(len(pose_seq))]
    keys = list(rows[0].keys())
    series = {k: np.array([r[k] for r in rows], dtype=np.float64) for k in keys}

    # Speeds from positional series (normalized units / sec).
    dt = 1.0 / max(fps, 1.0)
    wrist_speed = np.abs(np.gradient(series["wrist_y"], dt))
    ankle_speed = np.abs(np.gradient(series["ankle_y"], dt))
    com_up = -np.gradient(series["com_y"], dt)  # rising = positive

    arm_m, arm_x, arm_s = _safe_stats(series["arm_elev"])
    el_m, el_x, el_s = _safe_stats(series["elbow_flex"])
    kn_m, kn_x, kn_s = _safe_stats(series["knee_flex"])
    tr_m, tr_x, _ = _safe_stats(np.abs(series["trunk_lean"]))

    com = series["com_y"]
    com_valid = com[np.isfinite(com)]
    com_range = float(np.ptp(com_valid)) if com_valid.size else 0.0
    com_std = float(np.std(com_valid)) if com_valid.size else 0.0

    ws_m, ws_x, _ = _safe_stats(wrist_speed)
    as_m, as_x, _ = _safe_stats(ankle_speed)

    feats = {
        "arm_elev_mean": arm_m,
        "arm_elev_max": arm_x,
        "arm_elev_std": arm_s,
        "elbow_flex_mean": el_m,
        "elbow_flex_max": el_x,
        "elbow_flex_std": el_s,
        "knee_flex_mean": kn_m,
        "knee_flex_max": kn_x,
        "knee_flex_std": kn_s,
        "trunk_lean_mean": tr_m,
        "trunk_lean_max": tr_x,
        "com_y_range": com_range,
        "com_y_std": com_std,
        "wrist_speed_mean": ws_m,
        "wrist_speed_max": ws_x,
        "ankle_speed_mean": as_m,
        "ankle_speed_max": as_x,
        "lr_arm_asym": float(np.nanmean(series["lr_arm_asym"])),
        "lr_knee_asym": float(np.nanmean(series["lr_knee_asym"])),
        "t_peak_arm": _peak_time(series["arm_elev"]),
        "t_peak_knee": _peak_time(-series["knee_flex"]),  # deepest flexion
        "t_peak_wrist_speed": _peak_time(wrist_speed),
        "t_peak_com_up": _peak_time(com_up),
        "arm_above_shoulder_frac": float(np.nanmean(series["arm_above"])),
        "deep_knee_frac": float(np.nanmean(series["deep_knee"])),
        "n_frames_norm": min(len(pose_seq) / 90.0, 2.0),
    }
    return np.array([feats[n] for n in FEATURE_NAMES], dtype=np.float64)


def features_to_dict(vec: np.ndarray) -> dict[str, float]:
    return {n: float(vec[i]) for i, n in enumerate(FEATURE_NAMES)}
