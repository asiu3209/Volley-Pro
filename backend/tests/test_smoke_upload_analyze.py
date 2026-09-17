"""Smoke tests for upload + analyze (Gemini/Supabase mocked)."""

from __future__ import annotations

import json
import uuid
from pathlib import Path
from unittest.mock import patch

import cv2
import numpy as np


def _write_tiny_mp4(path: Path, frames: int = 3) -> None:
    h, w = 48, 64
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(path), fourcc, 5.0, (w, h))
    assert writer.isOpened(), "OpenCV could not open VideoWriter for test mp4"
    for i in range(frames):
        img = np.zeros((h, w, 3), dtype=np.uint8)
        img[:, :] = (20 + i * 10, 40, 60)
        writer.write(img)
    writer.release()


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_action_types(client):
    res = client.get("/videos/action-types")
    assert res.status_code == 200
    values = {row["value"] for row in res.json()["action_types"]}
    assert "blocks" in values
    assert "serves" in values


def test_upload_smoke(client, frames_tmpdir):
    video_path = frames_tmpdir / "clip.mp4"
    _write_tiny_mp4(video_path)
    with video_path.open("rb") as f:
        res = client.post(
            "/videos/upload",
            files={"file": ("clip.mp4", f, "video/mp4")},
            headers={"X-User-Id": "11111111-1111-1111-1111-111111111111"},
        )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["video_id"]
    uuid.UUID(data["video_id"])
    assert data["video_filename"].startswith("video_")
    assert Path(data["preview_frame"]).is_file() or (
        frames_tmpdir / Path(data["preview_frame"]).name
    ).exists() or any(frames_tmpdir.glob("preview_*.jpg"))


def test_analyze_smoke_canonical_id_and_no_fake_score(
    client, frames_tmpdir, mock_supabase
):
    store, _ = mock_supabase
    analysis_id = str(uuid.uuid4())
    video_name = f"video_{uuid.uuid4().hex}.mp4"
    preview_name = f"preview_{uuid.uuid4().hex}.jpg"
    video_fs = frames_tmpdir / video_name
    preview_fs = frames_tmpdir / preview_name
    _write_tiny_mp4(video_fs)
    cv2.imwrite(str(preview_fs), np.zeros((48, 64, 3), dtype=np.uint8))

    # Feedback without overall_score → ai_score must stay null (never 8.0)
    gemini_body = json.dumps(
        {
            "analysis_summary": "ok",
            "strengths": [],
            "weaknesses": [],
        }
    )

    with patch(
        "app.api.videos.analyze_video_with_gemini",
        return_value=gemini_body,
    ):
        res = client.post(
            "/videos/analyze",
            json={
                "video_id": analysis_id,
                "video_filename": video_name,
                "preview_frame": preview_name,
                "bbox_x": 0.1,
                "bbox_y": 0.1,
                "bbox_w": 0.4,
                "bbox_h": 0.5,
                "action_type": "blocks",
            },
            headers={"X-User-Id": "22222222-2222-2222-2222-222222222222"},
        )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["analysis_id"] == analysis_id
    assert body["video_id"] == analysis_id
    assert body["overall_score_0_to_100"] is None
    assert body["action_type"] == "blocks"

    rows = store["video_analyses"]
    assert len(rows) == 1
    assert rows[0]["id"] == analysis_id
    assert rows[0]["ai_score"] is None
    assert rows[0]["skill_type"] == "blocks"

    stats = store["user_stats"]
    assert len(stats) == 1
    assert stats[0]["total_videos"] == 1
    assert stats[0]["avg_score"] == 0.0
    assert "block_score" not in stats[0]


def test_analyze_smoke_with_score_updates_block_average(
    client, frames_tmpdir, mock_supabase
):
    store, _ = mock_supabase
    analysis_id = str(uuid.uuid4())
    video_name = f"video_{uuid.uuid4().hex}.mp4"
    preview_name = f"preview_{uuid.uuid4().hex}.jpg"
    _write_tiny_mp4(frames_tmpdir / video_name)
    cv2.imwrite(
        str(frames_tmpdir / preview_name),
        np.zeros((48, 64, 3), dtype=np.uint8),
    )

    gemini_body = json.dumps({"overall_score": 80, "analysis_summary": "solid block"})

    with patch(
        "app.api.videos.analyze_video_with_gemini",
        return_value=gemini_body,
    ):
        res = client.post(
            "/videos/analyze",
            json={
                "video_id": analysis_id,
                "video_filename": video_name,
                "preview_frame": preview_name,
                "bbox_x": 0.2,
                "bbox_y": 0.2,
                "bbox_w": 0.3,
                "bbox_h": 0.4,
                "action_type": "blocks",
            },
            headers={"X-User-Id": "33333333-3333-3333-3333-333333333333"},
        )

    assert res.status_code == 200, res.text
    assert res.json()["overall_score_0_to_100"] == 80.0
    assert store["video_analyses"][0]["id"] == analysis_id
    assert store["video_analyses"][0]["ai_score"] == 80.0
    assert store["user_stats"][0]["block_score"] == 80.0
    assert store["user_stats"][0]["avg_score"] == 80.0
