"""
Qcuit API — shared pytest fixtures.

Provides:
    - A temporary STUDIO_DATA_DIR per test so notebook stores never leak
      between tests or pollute the dev tree.
    - A Flask test client wired to the application factory.

Usage::

    def test_my_endpoint(client):
        resp = client.get("/api/notebook/gallery")
        assert resp.status_code == 200
"""
from __future__ import annotations

import os
import sys
import tempfile
import shutil
from pathlib import Path

import pytest


# Make the ``website`` directory importable so ``from api import ...`` works
# when pytest is invoked from the repo root.
STUDIO_ROOT = Path(__file__).resolve().parents[2]
if str(STUDIO_ROOT) not in sys.path:
    sys.path.insert(0, str(STUDIO_ROOT))

# Also expose the local ``library`` package (``qcuit``) for offline mirror use.
LIBRARY_ROOT = STUDIO_ROOT.parent / "library"
if LIBRARY_ROOT.exists() and str(LIBRARY_ROOT) not in sys.path:
    sys.path.insert(0, str(LIBRARY_ROOT))


@pytest.fixture()
def tmp_data_dir(monkeypatch):
    """Provide a temporary STUDIO_DATA_DIR for the lifetime of the test."""
    tmp = tempfile.mkdtemp(prefix="qcuit_test_data_")
    monkeypatch.setenv("STUDIO_DATA_DIR", tmp)
    try:
        yield Path(tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture()
def app(tmp_data_dir):
    """Build a Flask app for testing with isolated data dir."""
    # Import lazily so STUDIO_DATA_DIR is read at config time.
    from api import create_app

    flask_app = create_app("development")
    flask_app.config.update({"TESTING": True})
    return flask_app


@pytest.fixture()
def client(app):
    """Flask test client."""
    return app.test_client()
