"""User stats derived from video_analyses (true averages, not last-score overwrite)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

# normalize_action_type keys → user_stats columns
ANALYSIS_KEY_TO_STATS_COL: dict[str, str] = {
    "serves": "serve_score",
    "digs": "pass_score",
    "pins": "spike_score",
    "setters": "set_score",
    "blocks": "block_score",
}

SKILL_SCORE_COLUMNS: tuple[str, ...] = (
    "serve_score",
    "pass_score",
    "spike_score",
    "set_score",
    "block_score",
)


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _mean(scores: list[float]) -> float | None:
    if not scores:
        return None
    return round(sum(scores) / len(scores), 4)


def compute_user_stats_payload(
    user_id: str,
    rows: Iterable[dict[str, Any]],
) -> dict[str, Any]:
    """
    Build a user_stats upsert payload from analysis rows.

    - total_videos: count of all rows
    - avg_score: mean of non-null ai_score values (0.0 if none scored)
    - per-skill *_score: mean of non-null scores for that skill (omitted if none)
    """
    all_rows = list(rows)
    scored: list[float] = []
    by_skill: dict[str, list[float]] = {col: [] for col in SKILL_SCORE_COLUMNS}

    for row in all_rows:
        raw = row.get("ai_score")
        if raw is None:
            continue
        try:
            score = float(raw)
        except (TypeError, ValueError):
            continue
        scored.append(score)
        skill = (row.get("skill_type") or "").strip()
        col = ANALYSIS_KEY_TO_STATS_COL.get(skill)
        if col:
            by_skill[col].append(score)

    payload: dict[str, Any] = {
        "user_id": user_id,
        "total_videos": len(all_rows),
        "avg_score": _mean(scored) if scored else 0.0,
        "updated_at": _utcnow_iso(),
    }
    for col, scores in by_skill.items():
        avg = _mean(scores)
        if avg is not None:
            payload[col] = avg
    return payload


def skill_stats_from_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[float]] = {}
    for row in rows:
        raw = row.get("ai_score")
        if raw is None:
            continue
        try:
            score = float(raw)
        except (TypeError, ValueError):
            continue
        skill = (row.get("skill_type") or "unknown").strip() or "unknown"
        grouped.setdefault(skill, []).append(score)

    stats: list[dict[str, Any]] = []
    for skill, scores in grouped.items():
        stats.append(
            {
                "skill": skill,
                "attempts": len(scores),
                "avg_score": round(sum(scores) / len(scores), 1),
            }
        )
    stats.sort(key=lambda s: s["attempts"], reverse=True)
    return stats
