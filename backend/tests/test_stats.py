"""Unit tests for true-average stats helpers."""

from app.services.stats import compute_user_stats_payload, skill_stats_from_rows


def test_compute_user_stats_true_averages_and_block_score():
    rows = [
        {"skill_type": "serves", "ai_score": 60.0},
        {"skill_type": "serves", "ai_score": 80.0},
        {"skill_type": "blocks", "ai_score": 70.0},
        {"skill_type": "blocks", "ai_score": None},
        {"skill_type": "digs", "ai_score": 50.0},
    ]
    payload = compute_user_stats_payload("user-1", rows)
    assert payload["user_id"] == "user-1"
    assert payload["total_videos"] == 5
    assert payload["avg_score"] == 65.0
    assert payload["serve_score"] == 70.0
    assert payload["block_score"] == 70.0
    assert payload["pass_score"] == 50.0
    assert "spike_score" not in payload
    assert "set_score" not in payload


def test_compute_user_stats_no_scores_defaults_avg_zero():
    payload = compute_user_stats_payload(
        "u",
        [{"skill_type": "serves", "ai_score": None}],
    )
    assert payload["total_videos"] == 1
    assert payload["avg_score"] == 0.0
    assert "serve_score" not in payload


def test_skill_stats_from_rows_skips_nulls():
    stats = skill_stats_from_rows(
        [
            {"skill_type": "blocks", "ai_score": 80.0},
            {"skill_type": "blocks", "ai_score": 60.0},
            {"skill_type": "serves", "ai_score": None},
        ]
    )
    assert stats == [
        {"skill": "blocks", "attempts": 2, "avg_score": 70.0},
    ]
