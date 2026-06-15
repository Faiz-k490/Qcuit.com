"""
qcuit.noise — Vendor-calibrated noise models (library mirror).

Re-exports :mod:`api.noise` so notebooks can compute the same error budgets
offline::

    from qcuit.noise import load_snapshot, circuit_error_budget
    snap = load_snapshot("ibm_brisbane_2024")
    eb = circuit_error_budget(snap, {"1q": 20, "2q": 4, "meas": 5}, depth=10)
    print(eb.fidelity)
"""

from __future__ import annotations

try:
    from api.noise import (  # type: ignore
        KrausChannel,
        depolarizing,
        amplitude_damping,
        phase_damping,
        readout_assignment_matrix,
        is_trace_preserving,
        CalibrationSnapshot,
        SNAPSHOT_REGISTRY,
        list_snapshots,
        load_snapshot,
        ErrorBudget,
        circuit_error_budget,
        fidelity_vs_depth,
    )
except Exception as exc:  # pragma: no cover - website compatibility surface
    raise ImportError(
        "qcuit.noise is still website-API backed. The standalone pip package "
        "currently ships qcuit.hep, qcuit.models, qcuit.quantum, qcuit.diff, "
        "qcuit.qnn, and qcuit.benchmarks."
    ) from exc

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
