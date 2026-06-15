"""
Calibration-snapshot loader for the Noise Lab.

A snapshot is a JSON file describing one vendor's device at a point in time:
T1, T2, single- and two-qubit gate errors, gate times, and readout errors.
We ship three synthetic snapshots — modelled after public calibration data
from IBM, IonQ, and Quantinuum — under ``website/data/noise/``. Users can
drop additional snapshots in the same directory and they will be picked up
on the next request.

Snapshot schema (all rates in [0, 1]; times in nanoseconds)::

    {
        "name":         "ibm_brisbane_2024_synthetic",
        "vendor":       "ibm",
        "device":       "ibm_brisbane",
        "num_qubits":   5,
        "t1_ns":        [220000, 195000, 240000, 210000, 205000],
        "t2_ns":        [180000, 160000, 195000, 175000, 168000],
        "gate_time_1q_ns": 35.0,
        "gate_time_2q_ns": 540.0,
        "gate_time_measure_ns": 1200.0,
        "gate_error_1q":     [4.2e-4, 5.1e-4, 3.9e-4, 4.7e-4, 4.4e-4],
        "gate_error_2q":     [
            {"qubits": [0, 1], "error": 1.2e-2},
            {"qubits": [1, 2], "error": 1.4e-2}
        ],
        "readout_error":      [1.1e-2, 1.3e-2, 9.7e-3, 1.2e-2, 1.0e-2],
        "description":        "Public IBM Brisbane March 2024 (lightly edited)."
    }
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


SNAPSHOTS_DIR_ENV = "STUDIO_NOISE_DIR"


def _default_snapshots_dir() -> Path:
    """Default location for snapshot JSON files (website/data/noise/)."""
    custom = os.environ.get(SNAPSHOTS_DIR_ENV)
    if custom:
        return Path(custom)
    return Path(__file__).resolve().parents[2] / "data" / "noise"


@dataclass
class CalibrationSnapshot:
    name: str
    vendor: str
    device: str
    num_qubits: int
    t1_ns: List[float]
    t2_ns: List[float]
    gate_time_1q_ns: float
    gate_time_2q_ns: float
    gate_time_measure_ns: float
    gate_error_1q: List[float]
    gate_error_2q: List[dict]
    readout_error: List[float]
    description: str = ""
    path: Optional[str] = field(default=None, repr=False)

    # ── Convenience accessors ────────────────────────────────────────
    def mean_t1_ns(self) -> float:
        return float(sum(self.t1_ns) / max(1, len(self.t1_ns)))

    def mean_t2_ns(self) -> float:
        return float(sum(self.t2_ns) / max(1, len(self.t2_ns)))

    def mean_gate_error_1q(self) -> float:
        if not self.gate_error_1q:
            return 0.0
        return float(sum(self.gate_error_1q) / len(self.gate_error_1q))

    def mean_gate_error_2q(self) -> float:
        if not self.gate_error_2q:
            return 0.0
        errs = [float(g.get("error", 0.0)) for g in self.gate_error_2q]
        return float(sum(errs) / len(errs))

    def mean_readout_error(self) -> float:
        if not self.readout_error:
            return 0.0
        return float(sum(self.readout_error) / len(self.readout_error))

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "vendor": self.vendor,
            "device": self.device,
            "num_qubits": int(self.num_qubits),
            "t1_ns": list(self.t1_ns),
            "t2_ns": list(self.t2_ns),
            "gate_time_1q_ns": float(self.gate_time_1q_ns),
            "gate_time_2q_ns": float(self.gate_time_2q_ns),
            "gate_time_measure_ns": float(self.gate_time_measure_ns),
            "gate_error_1q": list(self.gate_error_1q),
            "gate_error_2q": list(self.gate_error_2q),
            "readout_error": list(self.readout_error),
            "description": self.description,
            "summary": {
                "mean_t1_ns": self.mean_t1_ns(),
                "mean_t2_ns": self.mean_t2_ns(),
                "mean_gate_error_1q": self.mean_gate_error_1q(),
                "mean_gate_error_2q": self.mean_gate_error_2q(),
                "mean_readout_error": self.mean_readout_error(),
            },
        }


# ── Loader / registry ──────────────────────────────────────────────────
def _from_json(path: Path) -> CalibrationSnapshot:
    with open(path, "r", encoding="utf-8") as fh:
        body = json.load(fh)

    required = (
        "name",
        "vendor",
        "device",
        "num_qubits",
        "t1_ns",
        "t2_ns",
        "gate_time_1q_ns",
        "gate_time_2q_ns",
        "gate_time_measure_ns",
        "gate_error_1q",
        "gate_error_2q",
        "readout_error",
    )
    missing = [k for k in required if k not in body]
    if missing:
        raise ValueError(f"Snapshot {path.name} missing keys: {missing}")

    return CalibrationSnapshot(
        name=str(body["name"]),
        vendor=str(body["vendor"]),
        device=str(body["device"]),
        num_qubits=int(body["num_qubits"]),
        t1_ns=[float(x) for x in body["t1_ns"]],
        t2_ns=[float(x) for x in body["t2_ns"]],
        gate_time_1q_ns=float(body["gate_time_1q_ns"]),
        gate_time_2q_ns=float(body["gate_time_2q_ns"]),
        gate_time_measure_ns=float(body["gate_time_measure_ns"]),
        gate_error_1q=[float(x) for x in body["gate_error_1q"]],
        gate_error_2q=[dict(g) for g in body["gate_error_2q"]],
        readout_error=[float(x) for x in body["readout_error"]],
        description=str(body.get("description", "")),
        path=str(path),
    )


def _scan_dir(dirpath: Path) -> Dict[str, CalibrationSnapshot]:
    out: Dict[str, CalibrationSnapshot] = {}
    if not dirpath.exists():
        return out
    for fp in sorted(dirpath.glob("*.json")):
        try:
            snap = _from_json(fp)
        except (ValueError, json.JSONDecodeError):
            continue
        out[snap.name] = snap
    return out


class _SnapshotRegistry:
    """Lazy, refreshing registry of snapshots discovered on disk."""

    def __init__(self) -> None:
        self._cache: Dict[str, CalibrationSnapshot] | None = None
        self._cached_dir: Optional[Path] = None

    def _ensure(self) -> Dict[str, CalibrationSnapshot]:
        dirpath = _default_snapshots_dir()
        if self._cache is None or self._cached_dir != dirpath:
            self._cache = _scan_dir(dirpath)
            self._cached_dir = dirpath
        return self._cache

    def names(self) -> List[str]:
        return list(self._ensure().keys())

    def get(self, name: str) -> Optional[CalibrationSnapshot]:
        return self._ensure().get(name)

    def keys(self):
        return self._ensure().keys()

    def __contains__(self, name: str) -> bool:
        return name in self._ensure()

    def __iter__(self):
        return iter(self._ensure())

    def values(self):
        return self._ensure().values()

    def refresh(self) -> None:
        self._cache = None
        self._cached_dir = None


SNAPSHOT_REGISTRY = _SnapshotRegistry()


def list_snapshots() -> List[str]:
    return SNAPSHOT_REGISTRY.names()


def load_snapshot(name: str) -> CalibrationSnapshot:
    snap = SNAPSHOT_REGISTRY.get(name)
    if snap is None:
        raise ValueError(
            f"Unknown snapshot {name!r}. Available: {SNAPSHOT_REGISTRY.names()}"
        )
    return snap
