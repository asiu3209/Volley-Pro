"""Unit tests for pose features + trained vision model."""

from pathlib import Path

import numpy as np
import pytest

from app.ml import SKILL_LABELS
from app.ml.features import FEATURE_NAMES, sequence_feature_vector
from app.ml.synthetic import generate_dataset, synthesize_sequence
from app.services.vision_model import clear_model_cache, predict_from_pose


ARTIFACTS = Path(__file__).resolve().parents[1] / "app" / "ml" / "artifacts"


def test_feature_vector_shape():
    rng = np.random.default_rng(0)
    seq = synthesize_sequence("serves", 0.8, 36, rng)
    vec = sequence_feature_vector(seq, fps=30.0)
    assert vec.shape == (len(FEATURE_NAMES),)
    assert np.all(np.isfinite(vec))


def test_synthetic_dataset_shapes():
    X, y, yq = generate_dataset(n_per_skill=5, seed=1)
    assert X.shape[0] == 5 * len(SKILL_LABELS)
    assert X.shape[1] == len(FEATURE_NAMES)
    assert y.shape == (X.shape[0],)
    assert yq.shape == (X.shape[0], 5)


@pytest.mark.skipif(
    not (ARTIFACTS / "skill_classifier.joblib").is_file(),
    reason="Train artifacts first: python scripts/train_vision_model.py",
)
def test_trained_model_predicts_synthetic_serve():
    clear_model_cache()
    rng = np.random.default_rng(99)
    seq = synthesize_sequence("serves", 0.9, 48, rng)
    pred = predict_from_pose(seq, fps=30.0, duration_hint_s=1.6)
    assert pred.tracking_ok
    assert pred.predicted_skill in SKILL_LABELS
    assert pred.skill_confidence > 0.2
    assert pred.overall_quality_0_to_100 is not None
    assert "INSTRUMENTED KINEMATICS" in pred.to_prompt_block()
