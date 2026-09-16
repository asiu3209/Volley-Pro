"""Pytest fixtures: set env before importing the FastAPI app."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# Ensure backend/ is on sys.path when pytest is run from repo root or backend/
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-supabase-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("REFERENCE_IMAGE_BUCKET", "reference-images")
os.environ.setdefault("REFERENCE_IMAGE_EXT", "png")
os.environ.setdefault("REFERENCE_IMAGE_COUNT", "1")
os.environ.setdefault("REFERENCE_IMAGE_CACHE_TTL_SECONDS", "60")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3001")
# Keep analyze smoke tests fast/deterministic (pose+MediaPipe optional in unit tests).
os.environ.setdefault("VISION_MODEL_ENABLED", "0")


@pytest.fixture()
def frames_tmpdir(tmp_path, monkeypatch):
    frames = tmp_path / "frames"
    frames.mkdir()
    monkeypatch.setenv("FRAMES_DIR", str(frames))
    monkeypatch.setattr("app.api.videos.FRAMES_DIR", str(frames))
    return frames


@pytest.fixture()
def mock_supabase(monkeypatch):
    """Chainable supabase.table(...).select/insert/upsert/eq/order/limit.execute() mock."""
    store: dict[str, list[dict]] = {
        "profiles": [],
        "user_stats": [],
        "video_analyses": [],
    }

    class _Result:
        def __init__(self, data):
            self.data = data

    class _Query:
        def __init__(self, table: str):
            self.table = table
            self._filters: dict = {}
            self._op = "select"
            self._row: dict | None = None
            self._order_desc = False
            self._limit: int | None = None

        def select(self, *_a, **_k):
            self._op = "select"
            return self

        def insert(self, row):
            self._op = "insert"
            self._row = row
            return self

        def upsert(self, row, **_k):
            self._op = "upsert"
            self._row = row
            return self

        def update(self, row):
            self._op = "update"
            self._row = row
            return self

        def eq(self, key, value):
            self._filters[key] = value
            return self

        def order(self, *_a, **_k):
            self._order_desc = bool(_k.get("desc"))
            return self

        def limit(self, n):
            self._limit = n
            return self

        def not_(self):
            return self

        def is_(self, *_a, **_k):
            return self

        def execute(self):
            rows = store.setdefault(self.table, [])
            if self._op == "insert" and self._row is not None:
                rows.append(dict(self._row))
                return _Result([dict(self._row)])
            if self._op == "upsert" and self._row is not None:
                key = "id" if "id" in self._row else "user_id"
                existing = next(
                    (i for i, r in enumerate(rows) if r.get(key) == self._row.get(key)),
                    None,
                )
                if existing is not None:
                    rows[existing] = {**rows[existing], **self._row}
                    return _Result([rows[existing]])
                rows.append(dict(self._row))
                return _Result([dict(self._row)])
            if self._op == "update" and self._row is not None:
                for i, r in enumerate(rows):
                    if all(r.get(k) == v for k, v in self._filters.items()):
                        rows[i] = {**r, **self._row}
                return _Result([r for r in rows if all(r.get(k) == v for k, v in self._filters.items())])
            filtered = [
                r
                for r in rows
                if all(r.get(k) == v for k, v in self._filters.items())
            ]
            if self._limit is not None:
                filtered = filtered[: self._limit]
            return _Result(filtered)

    client = MagicMock()
    client.table.side_effect = lambda name: _Query(name)
    monkeypatch.setattr("app.db.supabase", client)
    monkeypatch.setattr("app.api.videos.supabase", client)
    monkeypatch.setattr("app.api.users.supabase", client)
    return store, client


@pytest.fixture()
def client(frames_tmpdir, mock_supabase):
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
