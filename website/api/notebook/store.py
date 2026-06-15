"""
api.notebook.store — Filesystem store for Qcuit Notebook artifacts.

Per-hash JSON files under ``$QCUIT_DATA_DIR/notebook/<hash>.json``.
The hashing helpers and the on-disk JSON schema live in
:mod:`qcuit.io.notebook` so the offline library and the Flask backend
agree byte-for-byte.

The :class:`NotebookStore` interface is deliberately thin so swapping the
filesystem implementation for an S3 / Cloudflare R2 backend later is a
one-method change (override ``write_bytes`` / ``read_bytes`` / ``exists``).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

# Library-side canonical hash + Notebook class (single source of truth).
try:
    from qcuit.io.notebook import Notebook  # type: ignore
except Exception:  # pragma: no cover
    from api.notebook._fallback import Notebook  # type: ignore


def default_store_dir() -> Path:
    """Resolve the on-disk root for notebook artifacts.

    Honours ``QCUIT_DATA_DIR`` if set (or legacy ``STUDIO_DATA_DIR``);
    otherwise points
    at ``<repo>/website/data/notebook``.
    """
    env = os.environ.get("QCUIT_DATA_DIR") or os.environ.get("STUDIO_DATA_DIR")
    if env:
        return Path(env) / "notebook"

    # website/api/notebook/store.py  ->  website/data/notebook
    here = Path(__file__).resolve()
    website_root = here.parents[2]
    return website_root / "data" / "notebook"


class NotebookStore:
    """Filesystem-backed Qcuit Notebook store.

    Parameters
    ----------
    root:
        Directory where ``<hash>.json`` files live. Created on first write.
    """

    def __init__(self, root: Optional[os.PathLike] = None) -> None:
        self.root: Path = Path(root) if root is not None else default_store_dir()

    # ------------------------------------------------------------------
    # Read / write
    # ------------------------------------------------------------------

    def save(
        self,
        circuit: Dict[str, Any],
        noise_config: Dict[str, Any],
        shots: int,
        seed: int,
        results: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Notebook:
        """Persist a Notebook to disk; idempotent on identical inputs."""
        return Notebook.save(
            circuit=circuit,
            noise_config=noise_config,
            shots=shots,
            seed=seed,
            results=results,
            store_dir=self.root,
            metadata=metadata,
        )

    def load(self, run_hash: str) -> Optional[Notebook]:
        """Load a Notebook by hash; returns ``None`` if not found."""
        return Notebook.load(run_hash, store_dir=self.root)

    def exists(self, run_hash: str) -> bool:
        return (self.root / f"{run_hash}.json").exists()

    def list_hashes(self) -> list[str]:
        return Notebook.list_hashes(self.root)

    # ------------------------------------------------------------------
    # Convenience for URL construction
    # ------------------------------------------------------------------

    @staticmethod
    def permalink(run_hash: str, *, base_url: str = "https://qcuit.com") -> str:
        """Return the canonical citable URL for a run."""
        return f"{base_url.rstrip('/')}/n/{run_hash}"
