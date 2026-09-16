"""Load trained volleyball vision models and run inference on pose features."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.ml import SKILL_LABELS
from app.ml.features import FEATURE_NAMES, features_to_dict, sequence_feature_vector
from app.ml.synthetic import QUALITY_KEYS

logger = logging.getLogger(__name__)

_DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "ml" / "artifacts"


@dataclass
class VisionPrediction:
    tracking_ok: bool
    predicted_skill: str | None
    skill_confidence: float
    skill_probabilities: dict[str, float] = field(default_factory=dict)
    quality_scores: dict[str, float] = field(default_factory=dict)
    overall_quality_0_to_100: float | None = None
    key_moments: list[dict] = field(default_factory=list)
    feature_summary: dict[str, float] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    model_version: str | None = None

    def to_prompt_block(self) -> str:
        """Compact kinematics block for Gemini grounding."""
        if not self.tracking_ok:
            return (
                "INSTRUMENTED KINEMATICS: pose tracking failed or was inconclusive. "
                "Rely on the video alone; do not invent joint angles."
            )
        lines = [
            "INSTRUMENTED KINEMATICS (from VolleyPro pose model — treat as measured "
            "priors for the focal athlete; reconcile with video evidence, do not ignore):",
            f"- model_version: {self.model_version or 'unknown'}",
            f"- predicted_skill: {self.predicted_skill} "
            f"(confidence={self.skill_confidence:.2f})",
            f"- skill_probabilities: {json.dumps(self.skill_probabilities)}",
        ]
        if self.overall_quality_0_to_100 is not None:
            lines.append(
                f"- model_overall_quality_0_to_100: {self.overall_quality_0_to_100:.1f}"
            )
        if self.quality_scores:
            lines.append(
                f"- model_score_breakdown_priors: {json.dumps(self.quality_scores)}"
            )
        # Highlight a few interpretable features
        fs = self.feature_summary
        if fs:
            lines.append(
                "- biomechanics_snapshot: "
                + json.dumps(
                    {
                        k: round(fs[k], 2)
                        for k in (
                            "arm_elev_max",
                            "knee_flex_min_proxy",
                            "com_y_range",
                            "wrist_speed_max",
                            "t_peak_arm",
                            "t_peak_com_up",
                            "arm_above_shoulder_frac",
                            "deep_knee_frac",
                        )
                        if k in fs
                    }
                )
            )
        if self.key_moments:
            lines.append(f"- key_moments: {json.dumps(self.key_moments)}")
        lines.append(
            "Use these to ground timeline_highlights (seconds) and score_breakdown; "
            "if video clearly contradicts a prior, trust the video and note the conflict."
        )
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "tracking_ok": self.tracking_ok,
            "predicted_skill": self.predicted_skill,
            "skill_confidence": self.skill_confidence,
            "skill_probabilities": self.skill_probabilities,
            "quality_scores": self.quality_scores,
            "overall_quality_0_to_100": self.overall_quality_0_to_100,
            "key_moments": self.key_moments,
            "feature_summary": self.feature_summary,
            "notes": self.notes,
            "model_version": self.model_version,
        }


def artifact_dir() -> Path:
    env = os.environ.get("VISION_MODEL_DIR")
    return Path(env) if env else _DEFAULT_ARTIFACT_DIR


@lru_cache(maxsize=1)
def _load_bundle():
    root = artifact_dir()
    meta_path = root / "meta.json"
    clf_path = root / "skill_classifier.joblib"
    reg_path = root / "quality_regressor.joblib"
    if not meta_path.is_file() or not clf_path.is_file() or not reg_path.is_file():
        raise FileNotFoundError(
            f"Vision model artifacts missing under {root}. "
            "Run: python scripts/train_vision_model.py"
        )
    import joblib

    with open(meta_path) as f:
        meta = json.load(f)
    clf = joblib.load(clf_path)
    reg = joblib.load(reg_path)
    return meta, clf, reg


def clear_model_cache() -> None:
    _load_bundle.cache_clear()


def _key_moments_from_features(feat: dict[str, float], duration_s: float) -> list[dict]:
    moments = []
    for key, label in (
        ("t_peak_knee", "Deepest load / knee flexion"),
        ("t_peak_com_up", "Peak upward body drive"),
        ("t_peak_arm", "Peak arm elevation"),
        ("t_peak_wrist_speed", "Peak wrist speed (contact window)"),
    ):
        t_norm = feat.get(key)
        if t_norm is None:
            continue
        moments.append(
            {
                "approximate_seconds": round(float(t_norm) * max(duration_s, 0.1), 2),
                "technical_note": label,
            }
        )
    moments.sort(key=lambda m: m["approximate_seconds"])
    return moments[:5]


def predict_from_pose(
    pose_seq: np.ndarray | None,
    fps: float,
    duration_hint_s: float | None = None,
    notes: list[str] | None = None,
) -> VisionPrediction:
    notes = list(notes or [])
    if pose_seq is None or len(pose_seq) < 3:
        return VisionPrediction(
            tracking_ok=False,
            predicted_skill=None,
            skill_confidence=0.0,
            notes=notes + ["no_pose_sequence"],
        )

    try:
        meta, clf, reg = _load_bundle()
    except FileNotFoundError as exc:
        logger.warning("%s", exc)
        return VisionPrediction(
            tracking_ok=True,
            predicted_skill=None,
            skill_confidence=0.0,
            notes=notes + ["model_artifacts_missing"],
            feature_summary=features_to_dict(sequence_feature_vector(pose_seq, fps)),
        )

    vec = sequence_feature_vector(pose_seq, fps=fps).reshape(1, -1)
    # Align feature order if meta lists names
    feat_names = meta.get("feature_names") or FEATURE_NAMES
    if list(feat_names) != FEATURE_NAMES:
        # Rebuild in meta order if possible
        full = features_to_dict(vec.ravel())
        vec = np.array([[full.get(n, 0.0) for n in feat_names]], dtype=np.float64)

    proba = clf.predict_proba(vec)[0]
    classes = list(getattr(clf, "classes_", range(len(SKILL_LABELS))))
    skill_probs = {
        SKILL_LABELS[int(c)] if int(c) < len(SKILL_LABELS) else str(c): float(p)
        for c, p in zip(classes, proba)
    }
    # Ensure all skills present
    for s in SKILL_LABELS:
        skill_probs.setdefault(s, 0.0)
    best = max(skill_probs, key=skill_probs.get)
    conf = float(skill_probs[best])

    q_pred = reg.predict(vec)[0]
    quality = {
        QUALITY_KEYS[i]: float(np.clip(q_pred[i], 0, 100))
        for i in range(min(len(QUALITY_KEYS), len(q_pred)))
    }
    overall = float(np.mean(list(quality.values()))) if quality else None

    feat = features_to_dict(sequence_feature_vector(pose_seq, fps=fps))
    # Convenience proxy for coaches
    feat["knee_flex_min_proxy"] = float(
        feat.get("knee_flex_mean", 0) - feat.get("knee_flex_std", 0)
    )
    duration = duration_hint_s
    if duration is None:
        duration = len(pose_seq) / max(fps, 1.0)

    return VisionPrediction(
        tracking_ok=True,
        predicted_skill=best,
        skill_confidence=conf,
        skill_probabilities={k: round(v, 4) for k, v in skill_probs.items()},
        quality_scores={k: round(v, 1) for k, v in quality.items()},
        overall_quality_0_to_100=round(overall, 1) if overall is not None else None,
        key_moments=_key_moments_from_features(feat, duration),
        feature_summary={k: round(float(v), 4) for k, v in feat.items()},
        notes=notes,
        model_version=meta.get("version"),
    )
