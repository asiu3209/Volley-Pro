"""Tests for frames orphan cleanup."""

from pathlib import Path

from app.services.frames_cleanup import cleanup_frames_dir


def test_cleanup_removes_artifacts_keeps_other(tmp_path: Path):
    (tmp_path / "video_abc.mp4").write_bytes(b"x")
    (tmp_path / "preview_abc.jpg").write_bytes(b"y")
    (tmp_path / "preview_marked_zzz.jpg").write_bytes(b"z")
    (tmp_path / "analysis_video_tmp").mkdir()
    (tmp_path / "analysis_video_tmp" / "frame.jpg").write_bytes(b"f")
    (tmp_path / "keep_me.txt").write_text("nope")

    result = cleanup_frames_dir(tmp_path, max_age_sec=None, dry_run=False)
    assert result["removed_files"] >= 3
    assert result["removed_dirs"] == 1
    assert (tmp_path / "keep_me.txt").is_file()
    assert not (tmp_path / "video_abc.mp4").exists()
