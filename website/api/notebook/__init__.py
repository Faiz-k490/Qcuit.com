"""
api.notebook — Reproducibility Index backend (Phase 3, Pillar E)

Thin wrapper around :mod:`qcuit.io.notebook` (the library-side single source
of truth) plus the on-disk filesystem store, the BibTeX emitter, and the
curated gallery.

Public API:
    NotebookStore      — filesystem persistence (swap-out target for S3/R2)
    Notebook           — re-exported from qcuit.io.notebook
    SCHEMA_VERSION     — re-exported
    GALLERY            — list of curated benchmark entries
    build_bibtex       — emit BibTeX @misc entry for a Notebook
"""

from api.notebook.store import NotebookStore, default_store_dir
from api.notebook.bibtex import build_bibtex
from api.notebook.gallery import GALLERY

# Re-export from the library so callers have one import path.
try:
    from qcuit.io.notebook import Notebook, SCHEMA_VERSION  # type: ignore
except Exception:  # pragma: no cover - library mirror is optional at runtime
    # Fallback: if the library mirror isn't importable (e.g. deployment
    # bundles only the backend), expose a degenerate version that the rest
    # of the package still works against.
    from api.notebook._fallback import Notebook, SCHEMA_VERSION  # type: ignore

__all__ = [
    "NotebookStore",
    "default_store_dir",
    "Notebook",
    "SCHEMA_VERSION",
    "GALLERY",
    "build_bibtex",
]
