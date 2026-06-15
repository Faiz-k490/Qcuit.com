"""
qcuit.io.notebook — Reproducibility Index (Phase 3, Pillar E)

Every Qcuit run is a hashed JSON blob with a citable URL, a BibTeX snippet,
and an optional entry in the curated benchmark gallery.

Public API
----------

    canonical_json(payload)  -> str
    canonical_hash(payload)  -> str   # SHA-256 hex digest of canonical JSON
    Notebook.save(circuit, noise_config, shots, seed, results, *, store_dir)
    Notebook.load(run_hash, *, store_dir)

The hash is computed over the **canonical JSON** of
``{"circuit": ..., "noise_config": ..., "shots": ..., "seed": ...}`` only —
i.e. the *inputs* to the simulation. Two calls with identical inputs yield
identical hashes, even if the results object is rebuilt with different
floating-point precision (within numerical equality of the inputs).

Canonical JSON rules:
    - keys sorted
    - no whitespace separators
    - UTF-8 encoded
    - NaN / +Inf / -Inf are not allowed (raise ValueError)
"""

from __future__ import annotations

import hashlib
import json
import os
import datetime
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional


SCHEMA_VERSION = "1"
QCUIT_VERSION = "0.1.0"


# ---------------------------------------------------------------------------
# Canonical JSON + hashing
# ---------------------------------------------------------------------------


def canonical_json(payload: Any) -> str:
    """Return the canonical JSON string for ``payload``.

    Canonical form:
        * UTF-8
        * keys sorted lexicographically at every level
        * minimum whitespace (``separators=(",", ":")``)
        * ``allow_nan=False`` so NaN / Inf cannot poison the hash silently
    """
    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def canonical_hash(payload: Any) -> str:
    """SHA-256 hex digest of the canonical JSON of ``payload``."""
    blob = canonical_json(payload).encode("utf-8")
    return hashlib.sha256(blob).hexdigest()


def _hash_inputs(
    circuit: Dict[str, Any],
    noise_config: Dict[str, Any],
    shots: int,
    seed: int,
) -> str:
    """Compute the run hash from inputs only (excludes results/metadata)."""
    return canonical_hash(
        {
            "circuit": circuit,
            "noise_config": noise_config,
            "shots": int(shots),
            "seed": int(seed),
        }
    )


# ---------------------------------------------------------------------------
# Artifact schema
# ---------------------------------------------------------------------------


@dataclass
class Notebook:
    """A Qcuit run artifact, the unit of reproducibility.

    Use :meth:`Notebook.save` to persist a run, :meth:`Notebook.load` to
    round-trip from disk. Both produce/consume the JSON schema documented
    at the top of this module.
    """

    run_hash: str
    schema_version: str
    created_at: str
    circuit: Dict[str, Any]
    noise_config: Dict[str, Any]
    shots: int
    seed: int
    results: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

    # -- serialisation ------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_hash": self.run_hash,
            "schema_version": self.schema_version,
            "created_at": self.created_at,
            "circuit": self.circuit,
            "noise_config": self.noise_config,
            "shots": self.shots,
            "seed": self.seed,
            "results": self.results,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Notebook":
        return cls(
            run_hash=data["run_hash"],
            schema_version=data.get("schema_version", SCHEMA_VERSION),
            created_at=data["created_at"],
            circuit=data["circuit"],
            noise_config=data.get("noise_config", {}),
            shots=int(data.get("shots", 0)),
            seed=int(data.get("seed", 0)),
            results=data.get("results", {}),
            metadata=data.get("metadata", {}),
        )

    # -- factory ------------------------------------------------------------

    @classmethod
    def build(
        cls,
        circuit: Dict[str, Any],
        noise_config: Dict[str, Any],
        shots: int,
        seed: int,
        results: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "Notebook":
        """Build a Notebook from raw inputs (without persisting)."""
        run_hash = _hash_inputs(circuit, noise_config, shots, seed)
        created_at = datetime.datetime.now(datetime.timezone.utc).isoformat(
            timespec="seconds"
        )
        meta = {"qcuit_version": QCUIT_VERSION, **(metadata or {})}
        return cls(
            run_hash=run_hash,
            schema_version=SCHEMA_VERSION,
            created_at=created_at,
            circuit=circuit,
            noise_config=noise_config,
            shots=int(shots),
            seed=int(seed),
            results=results,
            metadata=meta,
        )

    # -- persistence --------------------------------------------------------

    @staticmethod
    def _path_for(store_dir: Path, run_hash: str) -> Path:
        return Path(store_dir) / f"{run_hash}.json"

    @classmethod
    def save(
        cls,
        circuit: Dict[str, Any],
        noise_config: Dict[str, Any],
        shots: int,
        seed: int,
        results: Dict[str, Any],
        *,
        store_dir: os.PathLike,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> "Notebook":
        """Persist a Notebook to ``store_dir/<run_hash>.json``.

        Idempotent: if a file with the same hash already exists on disk,
        the original file is **not** rewritten and the existing artifact
        is returned. This guarantees reruns of the same input produce a
        stable created_at timestamp.
        """
        store = Path(store_dir)
        store.mkdir(parents=True, exist_ok=True)

        # Compute hash from inputs only.
        run_hash = _hash_inputs(circuit, noise_config, shots, seed)
        path = cls._path_for(store, run_hash)

        if path.exists():
            return cls.from_dict(json.loads(path.read_text(encoding="utf-8")))

        notebook = cls.build(circuit, noise_config, shots, seed, results, metadata)
        # Sanity: the build path must yield the same hash.
        assert notebook.run_hash == run_hash, "Canonical hash drift detected"

        # Write atomically so partial writes don't corrupt the store.
        tmp_path = path.with_suffix(".json.tmp")
        tmp_path.write_text(
            json.dumps(notebook.to_dict(), indent=2, sort_keys=True, allow_nan=False),
            encoding="utf-8",
        )
        os.replace(tmp_path, path)

        return notebook

    @classmethod
    def load(cls, run_hash: str, *, store_dir: os.PathLike) -> Optional["Notebook"]:
        """Load a Notebook by hash, or return ``None`` if not found."""
        path = cls._path_for(Path(store_dir), run_hash)
        if not path.exists():
            return None
        return cls.from_dict(json.loads(path.read_text(encoding="utf-8")))

    @staticmethod
    def list_hashes(store_dir: os.PathLike) -> list[str]:
        """Return all run_hashes currently in ``store_dir`` (unordered)."""
        store = Path(store_dir)
        if not store.exists():
            return []
        return [p.stem for p in store.glob("*.json")]
