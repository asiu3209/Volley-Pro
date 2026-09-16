#!/usr/bin/env python3
"""CLI: clean orphaned files under backend/frames (or FRAMES_DIR)."""

from __future__ import annotations

import argparse
import os
import sys

# Allow `python scripts/cleanup_frames.py` from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.frames_cleanup import cleanup_frames_dir, frames_dir_from_env  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean VolleyPro frames artifacts")
    parser.add_argument(
        "--dir",
        default=frames_dir_from_env(),
        help="Frames directory (default: FRAMES_DIR or ./frames)",
    )
    parser.add_argument(
        "--max-age-hours",
        type=float,
        default=None,
        help="Only delete artifacts older than this many hours (default: all)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Count what would be removed without deleting",
    )
    args = parser.parse_args()
    max_age = None if args.max_age_hours is None else args.max_age_hours * 3600.0
    result = cleanup_frames_dir(args.dir, max_age_sec=max_age, dry_run=args.dry_run)
    mode = "dry-run" if args.dry_run else "deleted"
    print(
        f"{mode}: files={result['removed_files']} dirs={result['removed_dirs']} "
        f"skipped={result['skipped']} dir={args.dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
