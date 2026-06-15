"""
api.notebook._fallback — defensive re-export so the backend keeps working
even if the ``library/qcuit`` mirror is not on the Python path.

In normal operation we import :class:`qcuit.io.notebook.Notebook`; this
module mirrors the same surface so the backend has a stable fallback. The
canonical-hash helpers must produce *identical* output across both paths.
"""

# Reuse the exact same implementation: we just import the file from the
# library path on disk. If that path is unavailable we re-implement the
# bare minimum locally.

import sys
from pathlib import Path

# Try to make the library importable on the fly.
_LIBRARY = Path(__file__).resolve().parents[3] / "library"
if _LIBRARY.exists() and str(_LIBRARY) not in sys.path:
    sys.path.insert(0, str(_LIBRARY))

try:
    from qcuit.io.notebook import (  # type: ignore
        Notebook,
        canonical_hash,
        canonical_json,
        SCHEMA_VERSION,
    )
except Exception:  # pragma: no cover
    # Last-resort minimal re-implementation. Keep in lock-step with
    # library/qcuit/io/notebook.py if it ever needs to be touched.
    import hashlib
    import json
    import os
    import datetime
    from dataclasses import dataclass, field
    from typing import Any, Dict, Optional

    SCHEMA_VERSION = "1"
    QCUIT_VERSION = "0.1.0"

    def canonical_json(payload: Any) -> str:
        return json.dumps(
            payload,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        )

    def canonical_hash(payload: Any) -> str:
        return hashlib.sha256(canonical_json(payload).encode("utf-8")).hexdigest()

    def _hash_inputs(circuit, noise_config, shots, seed):
        return canonical_hash(
            {"circuit": circuit, "noise_config": noise_config,
             "shots": int(shots), "seed": int(seed)}
        )

    @dataclass
    class Notebook:  # type: ignore[no-redef]
        run_hash: str
        schema_version: str
        created_at: str
        circuit: Dict[str, Any]
        noise_config: Dict[str, Any]
        shots: int
        seed: int
        results: Dict[str, Any]
        metadata: Dict[str, Any] = field(default_factory=dict)

        def to_dict(self):
            return self.__dict__.copy()

        @classmethod
        def from_dict(cls, data):
            return cls(**{k: data.get(k) for k in cls.__dataclass_fields__})

        @classmethod
        def build(cls, circuit, noise_config, shots, seed, results, metadata=None):
            return cls(
                run_hash=_hash_inputs(circuit, noise_config, shots, seed),
                schema_version=SCHEMA_VERSION,
                created_at=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
                circuit=circuit,
                noise_config=noise_config,
                shots=int(shots),
                seed=int(seed),
                results=results,
                metadata={"qcuit_version": QCUIT_VERSION, **(metadata or {})},
            )

        @classmethod
        def save(cls, circuit, noise_config, shots, seed, results, *, store_dir, metadata=None):
            from pathlib import Path as _P
            store = _P(store_dir); store.mkdir(parents=True, exist_ok=True)
            run_hash = _hash_inputs(circuit, noise_config, shots, seed)
            path = store / f"{run_hash}.json"
            if path.exists():
                return cls.from_dict(json.loads(path.read_text(encoding="utf-8")))
            nb = cls.build(circuit, noise_config, shots, seed, results, metadata)
            tmp = path.with_suffix(".json.tmp")
            tmp.write_text(json.dumps(nb.to_dict(), indent=2, sort_keys=True, allow_nan=False), encoding="utf-8")
            os.replace(tmp, path)
            return nb

        @classmethod
        def load(cls, run_hash, *, store_dir):
            from pathlib import Path as _P
            path = _P(store_dir) / f"{run_hash}.json"
            if not path.exists():
                return None
            return cls.from_dict(json.loads(path.read_text(encoding="utf-8")))

        @staticmethod
        def list_hashes(store_dir):
            from pathlib import Path as _P
            store = _P(store_dir)
            if not store.exists():
                return []
            return [p.stem for p in store.glob("*.json")]
