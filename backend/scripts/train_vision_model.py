#!/usr/bin/env python3
"""Train volleyball skill classifier + quality regressor from synthetic pose features.

Usage (from backend/):
  python scripts/train_vision_model.py
  python scripts/train_vision_model.py --n-per-skill 600 --seed 7
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import accuracy_score, classification_report, mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

# Allow `python scripts/train_vision_model.py` from backend/
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.ml import SKILL_LABELS  # noqa: E402
from app.ml.features import FEATURE_NAMES  # noqa: E402
from app.ml.synthetic import QUALITY_KEYS, generate_dataset  # noqa: E402


def train(n_per_skill: int, seed: int, out_dir: Path) -> dict:
    print(f"Generating synthetic dataset ({n_per_skill}/skill, seed={seed})…")
    X, y, yq = generate_dataset(n_per_skill=n_per_skill, seed=seed)
    X_train, X_test, y_train, y_test, yq_train, yq_test = train_test_split(
        X, y, yq, test_size=0.2, random_state=seed, stratify=y
    )

    clf = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "model",
                HistGradientBoostingClassifier(
                    max_depth=6,
                    learning_rate=0.08,
                    max_iter=200,
                    random_state=seed,
                ),
            ),
        ]
    )
    print("Training skill classifier…")
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    print(f"Skill accuracy: {acc:.3f}")
    print(
        classification_report(
            y_test,
            y_pred,
            target_names=list(SKILL_LABELS),
            digits=3,
        )
    )

    reg = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "model",
                MultiOutputRegressor(
                    HistGradientBoostingRegressor(
                        max_depth=5,
                        learning_rate=0.08,
                        max_iter=180,
                        random_state=seed,
                    )
                ),
            ),
        ]
    )
    print("Training quality regressor…")
    reg.fit(X_train, yq_train)
    yq_pred = reg.predict(X_test)
    mae = float(mean_absolute_error(yq_test, yq_pred))
    per_dim = {
        QUALITY_KEYS[i]: float(mean_absolute_error(yq_test[:, i], yq_pred[:, i]))
        for i in range(len(QUALITY_KEYS))
    }
    print(f"Quality MAE (overall): {mae:.2f}")
    for k, v in per_dim.items():
        print(f"  {k}: {v:.2f}")

    out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, out_dir / "skill_classifier.joblib")
    joblib.dump(reg, out_dir / "quality_regressor.joblib")

    meta = {
        "version": f"volley-pose-v1-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_per_skill": n_per_skill,
        "seed": seed,
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "skill_labels": list(SKILL_LABELS),
        "feature_names": list(FEATURE_NAMES),
        "quality_keys": list(QUALITY_KEYS),
        "metrics": {
            "skill_accuracy": acc,
            "quality_mae": mae,
            "quality_mae_by_dim": per_dim,
        },
        "data_source": "synthetic_biomechanics_v1",
    }
    with open(out_dir / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)
    print(f"Wrote artifacts → {out_dir}")
    return meta


def main() -> None:
    parser = argparse.ArgumentParser(description="Train VolleyPro vision models")
    parser.add_argument("--n-per-skill", type=int, default=500)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "app" / "ml" / "artifacts",
    )
    args = parser.parse_args()
    train(args.n_per_skill, args.seed, args.out)


if __name__ == "__main__":
    main()
