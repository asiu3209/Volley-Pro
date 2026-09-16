"""Biomechanics-inspired synthetic pose sequences for volleyball skills.

Generates labeled training data when real athlete clips are not retained.
Sequences mimic MediaPipe landmark layout (33, 3) in normalized image coords.
"""

from __future__ import annotations

import numpy as np

from app.ml import LM, SKILL_LABELS
from app.ml.features import sequence_feature_vector

# Quality dimensions aligned with Gemini score_breakdown keys (0–100).
QUALITY_KEYS = (
    "body_positioning_posture",
    "footwork_balance",
    "arm_hand_technique",
    "timing_coordination",
    "overall_execution",
)


def _base_pose(rng: np.random.Generator, facing: float = 1.0) -> np.ndarray:
    """Neutral standing pose, x mirrored by facing (+1 right-dominant)."""
    lm = np.zeros((33, 3), dtype=np.float64)
    # Rough upright stick figure centered in frame.
    cx, cy = 0.5, 0.55
    lm[LM["l_shoulder"]] = [cx - 0.06 * facing, cy - 0.18, 0.9]
    lm[LM["r_shoulder"]] = [cx + 0.06 * facing, cy - 0.18, 0.9]
    lm[LM["l_elbow"]] = [cx - 0.10 * facing, cy - 0.05, 0.9]
    lm[LM["r_elbow"]] = [cx + 0.10 * facing, cy - 0.05, 0.9]
    lm[LM["l_wrist"]] = [cx - 0.12 * facing, cy + 0.05, 0.9]
    lm[LM["r_wrist"]] = [cx + 0.12 * facing, cy + 0.05, 0.9]
    lm[LM["l_hip"]] = [cx - 0.05 * facing, cy + 0.05, 0.9]
    lm[LM["r_hip"]] = [cx + 0.05 * facing, cy + 0.05, 0.9]
    lm[LM["l_knee"]] = [cx - 0.05 * facing, cy + 0.22, 0.9]
    lm[LM["r_knee"]] = [cx + 0.05 * facing, cy + 0.22, 0.9]
    lm[LM["l_ankle"]] = [cx - 0.05 * facing, cy + 0.38, 0.9]
    lm[LM["r_ankle"]] = [cx + 0.05 * facing, cy + 0.38, 0.9]
    # Mild jitter on unused landmarks.
    lm += rng.normal(0, 0.002, lm.shape)
    return lm


def _lerp(a: np.ndarray, b: np.ndarray, t: float) -> np.ndarray:
    return a * (1.0 - t) + b * t


def _skill_keyframes(
    skill: str, quality: float, rng: np.random.Generator
) -> list[np.ndarray]:
    """
    quality in [0, 1]: 1 = textbook, 0 = poor / incomplete motion.
    Returns ordered key poses to interpolate.
    """
    facing = 1.0 if rng.random() > 0.3 else -1.0
    q = float(np.clip(quality, 0.05, 1.0))
    stand = _base_pose(rng, facing)
    frames: list[np.ndarray] = [stand.copy()]

    def hit(side: str = "r") -> np.ndarray:
        p = stand.copy()
        # Arm elevation scales with quality; poor form keeps arm lower.
        elev = 0.12 + 0.22 * q
        p[LM[f"{side}_elbow"], 1] -= elev * 0.55
        p[LM[f"{side}_wrist"], 1] -= elev
        p[LM[f"{side}_wrist"], 0] += 0.04 * facing * q
        # Knee bend / load
        bend = 0.04 + 0.10 * q
        p[LM["l_knee"], 1] -= bend * 0.3
        p[LM["r_knee"], 1] -= bend * 0.3
        p[LM["l_hip"], 1] += bend * 0.2
        p[LM["r_hip"], 1] += bend * 0.2
        return p

    if skill == "serves":
        toss = stand.copy()
        toss[LM["l_wrist"], 1] -= 0.15 * q
        toss[LM["l_elbow"], 1] -= 0.08 * q
        cock = stand.copy()
        cock[LM["r_elbow"], 1] -= 0.18 * q
        cock[LM["r_wrist"], 1] -= 0.05 * q
        cock[LM["r_wrist"], 0] -= 0.08 * facing
        contact = hit("r")
        contact[LM["r_wrist"], 1] -= 0.28 * q
        follow = stand.copy()
        follow[LM["r_wrist"], 1] += 0.05
        follow[LM["r_wrist"], 0] += 0.10 * facing
        frames.extend([toss, cock, contact, follow])

    elif skill == "digs":
        ready = stand.copy()
        ready[LM["l_knee"], 1] -= 0.06 * q
        ready[LM["r_knee"], 1] -= 0.06 * q
        ready[LM["l_hip"], 1] += 0.04 * q
        ready[LM["r_hip"], 1] += 0.04 * q
        plat = ready.copy()
        # Platform: wrists low and together
        plat[LM["l_wrist"], 1] = plat[LM["l_hip"], 1] - 0.02
        plat[LM["r_wrist"], 1] = plat[LM["r_hip"], 1] - 0.02
        plat[LM["l_wrist"], 0] = 0.48
        plat[LM["r_wrist"], 0] = 0.52
        plat[LM["l_elbow"], 1] = plat[LM["l_wrist"], 1] - 0.04
        plat[LM["r_elbow"], 1] = plat[LM["r_wrist"], 1] - 0.04
        if q < 0.45:
            # Broken platform / high elbows
            plat[LM["l_elbow"], 1] -= 0.08
            plat[LM["r_elbow"], 1] -= 0.08
        finish = ready.copy()
        finish[LM["l_wrist"], 1] -= 0.04 * q
        finish[LM["r_wrist"], 1] -= 0.04 * q
        frames.extend([ready, plat, finish])

    elif skill == "pins":
        approach = stand.copy()
        approach[LM["l_ankle"], 0] -= 0.03 * facing
        approach[LM["r_ankle"], 0] += 0.02 * facing
        plant = approach.copy()
        plant[LM["l_knee"], 1] -= 0.08 * q
        plant[LM["r_knee"], 1] -= 0.10 * q
        jump = plant.copy()
        # Whole body rises (lower y)
        jump[:, 1] -= 0.12 * q
        jump[LM["r_elbow"], 1] -= 0.15 * q
        jump[LM["r_wrist"], 1] -= 0.28 * q
        jump[LM["r_wrist"], 0] += 0.06 * facing * q
        land = stand.copy()
        land[LM["l_knee"], 1] -= 0.05
        land[LM["r_knee"], 1] -= 0.05
        frames.extend([approach, plant, jump, land])

    elif skill == "setters":
        ready = stand.copy()
        ready[LM["l_knee"], 1] -= 0.03 * q
        ready[LM["r_knee"], 1] -= 0.03 * q
        hands = ready.copy()
        # Hands high above head
        elev = 0.20 + 0.10 * q
        hands[LM["l_wrist"], 1] -= elev
        hands[LM["r_wrist"], 1] -= elev
        hands[LM["l_elbow"], 1] -= elev * 0.7
        hands[LM["r_elbow"], 1] -= elev * 0.7
        hands[LM["l_wrist"], 0] = 0.47
        hands[LM["r_wrist"], 0] = 0.53
        release = hands.copy()
        release[LM["l_wrist"], 1] -= 0.04 * q
        release[LM["r_wrist"], 1] -= 0.04 * q
        frames.extend([ready, hands, release, stand.copy()])

    elif skill == "blocks":
        ready = stand.copy()
        ready[LM["l_knee"], 1] -= 0.05 * q
        ready[LM["r_knee"], 1] -= 0.05 * q
        jump = ready.copy()
        jump[:, 1] -= 0.10 * q
        jump[LM["l_wrist"], 1] -= 0.30 * q
        jump[LM["r_wrist"], 1] -= 0.30 * q
        jump[LM["l_elbow"], 1] -= 0.22 * q
        jump[LM["r_elbow"], 1] -= 0.22 * q
        # Penetration: wrists slightly over net (forward in x)
        jump[LM["l_wrist"], 0] += 0.03 * facing * q
        jump[LM["r_wrist"], 0] += 0.03 * facing * q
        land = stand.copy()
        frames.extend([ready, jump, land])

    else:
        frames.append(hit())

    return frames


def synthesize_sequence(
    skill: str,
    quality: float,
    n_frames: int,
    rng: np.random.Generator,
    fps: float = 30.0,
) -> np.ndarray:
    keys = _skill_keyframes(skill, quality, rng)
    if len(keys) < 2:
        keys = keys * 2
    # Time along keyframes
    t = np.linspace(0, len(keys) - 1, n_frames)
    seq = np.zeros((n_frames, 33, 3), dtype=np.float64)
    for i, ti in enumerate(t):
        i0 = int(np.floor(ti))
        i1 = min(i0 + 1, len(keys) - 1)
        alpha = float(ti - i0)
        pose = _lerp(keys[i0], keys[i1], alpha)
        pose += rng.normal(0, 0.004 * (1.2 - quality), pose.shape)
        seq[i] = pose
    return seq


def quality_targets(skill: str, quality: float, rng: np.random.Generator) -> np.ndarray:
    """Map global quality → 5-dim score breakdown (0–100) with skill-shaped noise."""
    base = 35.0 + 60.0 * quality
    noise = rng.normal(0, 4.0, len(QUALITY_KEYS))
    scores = np.clip(base + noise, 5.0, 98.0)
    # Skill-specific emphasis
    idx = {k: i for i, k in enumerate(QUALITY_KEYS)}
    if skill in ("serves", "pins"):
        scores[idx["arm_hand_technique"]] += 5 * quality
        scores[idx["timing_coordination"]] += 3 * quality
    elif skill == "digs":
        scores[idx["arm_hand_technique"]] += 6 * quality
        scores[idx["footwork_balance"]] += 4 * quality
    elif skill == "setters":
        scores[idx["arm_hand_technique"]] += 7 * quality
        scores[idx["body_positioning_posture"]] += 3 * quality
    elif skill == "blocks":
        scores[idx["timing_coordination"]] += 6 * quality
        scores[idx["body_positioning_posture"]] += 4 * quality
    scores[idx["overall_execution"]] = float(np.mean(scores[:-1]))
    return np.clip(scores, 5.0, 98.0).astype(np.float64)


def generate_dataset(
    n_per_skill: int = 400,
    seed: int = 42,
    fps: float = 30.0,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Returns X (N, F), y_skill (N,), y_quality (N, 5).
    """
    rng = np.random.default_rng(seed)
    xs: list[np.ndarray] = []
    ys: list[int] = []
    yq: list[np.ndarray] = []

    for si, skill in enumerate(SKILL_LABELS):
        for _ in range(n_per_skill):
            quality = float(rng.beta(2.2, 1.6))  # bias toward mid-high
            n_frames = int(rng.integers(24, 72))
            seq = synthesize_sequence(skill, quality, n_frames, rng, fps=fps)
            # 8% label-noise / ambiguous motion
            label = si
            if rng.random() < 0.08:
                label = int(rng.integers(0, len(SKILL_LABELS)))
            xs.append(sequence_feature_vector(seq, fps=fps))
            ys.append(label)
            yq.append(quality_targets(skill, quality, rng))

    return np.stack(xs), np.array(ys, dtype=np.int64), np.stack(yq)
