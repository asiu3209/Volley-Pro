"""Remove orphaned preview/video artifacts under FRAMES_DIR."""

from __future__ import annotations

import os
import shutil
import time
from pathlib import Path


def cleanup_frames_dir(
    frames_dir: str | Path,
    *,
    max_age_sec: float | None = None,
    dry_run: bool = False,
) -> dict[str, int]:
    """
    Delete orphaned analysis dirs, marked previews, and stale video/preview files.

    If max_age_sec is set, only remove entries older than that age.
    If max_age_sec is None, remove all known artifact patterns (local orphan wipe).
    """
    root = Path(frames_dir)
    removed_files = 0
    removed_dirs = 0
    skipped = 0

    if not root.is_dir():
        return {"removed_files": 0, "removed_dirs": 0, "skipped": 0}

    now = time.time()

    def _too_new(path: Path) -> bool:
        if max_age_sec is None:
            return False
        try:
            age = now - path.stat().st_mtime
        except OSError:
            return True
        return age < max_age_sec

    for entry in root.iterdir():
        name = entry.name
        is_artifact = (
            name.startswith("analysis_video_")
            or name.startswith("preview_marked_")
            or name.startswith("preview_")
            or name.startswith("video_")
        )
        if not is_artifact:
            skipped += 1
            continue
        if _too_new(entry):
            skipped += 1
            continue
        if dry_run:
            if entry.is_dir():
                removed_dirs += 1
            else:
                removed_files += 1
            continue
        try:
            if entry.is_dir():
                shutil.rmtree(entry)
                removed_dirs += 1
            elif entry.is_file():
                entry.unlink()
                removed_files += 1
            else:
                skipped += 1
        except OSError:
            skipped += 1

    return {
        "removed_files": removed_files,
        "removed_dirs": removed_dirs,
        "skipped": skipped,
    }


def frames_dir_from_env() -> str:
    return os.environ.get("FRAMES_DIR", "frames")
