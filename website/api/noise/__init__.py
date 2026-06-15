"""
api.noise — Vendor-calibrated noise models (Phase 2, Pillar B).

Public surface:

    Channels:      depolarizing, amplitude_damping, phase_damping,
                   readout_assignment_matrix, KrausChannel
    Calibration:   load_snapshot(name), list_snapshots(), SNAPSHOT_REGISTRY
    Budget:        circuit_error_budget(snapshot, circuit_summary)
                   fidelity_vs_depth(snapshot, gate_mix, max_depth)

The reference implementation lives here; ``qcuit.noise`` re-exports it so
notebooks can run the same calibrated error budgets offline.
"""

from __future__ import annotations

from .channels import (
    KrausChannel,
    depolarizing,
    amplitude_damping,
    phase_damping,
    readout_assignment_matrix,
    is_trace_preserving,
)
from .calibration import (
    CalibrationSnapshot,
    SNAPSHOT_REGISTRY,
    list_snapshots,
    load_snapshot,
)
from .budget import (
    ErrorBudget,
    circuit_error_budget,
    fidelity_vs_depth,
)

__all__ = [
    "KrausChannel",
    "depolarizing",
    "amplitude_damping",
    "phase_damping",
    "readout_assignment_matrix",
    "is_trace_preserving",
    "CalibrationSnapshot",
    "SNAPSHOT_REGISTRY",
    "list_snapshots",
    "load_snapshot",
    "ErrorBudget",
    "circuit_error_budget",
    "fidelity_vs_depth",
]
