"""
Error-budget accounting.

Given a calibration snapshot and a circuit summary, compute:

    * Per-gate-class error probabilities (gate errors + decoherence during
      gate time).
    * Total estimated circuit infidelity ``1 - F`` under the standard
      independent-error approximation ``F ≈ Π_i (1 − ε_i)``.
    * A breakdown into ``{single_qubit, two_qubit, decoherence, readout}``
      buckets so the UI can render a stacked bar chart.

This is the same textbook accounting used by IBM and IonQ's published
gate-error budgets. It is deliberately *not* a full density-matrix
simulation — that would require :func:`api.simulate` with per-channel Kraus
ops on every gate, which is overkill for the visual error-budget panel.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List

from .calibration import CalibrationSnapshot


@dataclass
class ErrorBudget:
    snapshot: str
    gate_counts: Dict[str, int]
    depth: int
    single_qubit_err: float
    two_qubit_err: float
    decoherence_err: float
    readout_err: float
    total_err: float
    fidelity: float
    breakdown: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "snapshot": self.snapshot,
            "gate_counts": dict(self.gate_counts),
            "depth": int(self.depth),
            "single_qubit_err": float(self.single_qubit_err),
            "two_qubit_err": float(self.two_qubit_err),
            "decoherence_err": float(self.decoherence_err),
            "readout_err": float(self.readout_err),
            "total_err": float(self.total_err),
            "fidelity": float(self.fidelity),
            "breakdown": list(self.breakdown),
        }


def _decoherence_per_ns(t1_ns: float, t2_ns: float) -> float:
    """Effective decoherence rate per ns. Uses the standard

        γ_dec = 1/T1 + 1/(2 T_phi),    1/T_phi = 1/T2 − 1/(2 T1).

    so γ_dec = 1/(2 T1) + 1/T2 — but only when T2 ≤ 2 T1 (physical
    constraint). Falls back to ``1/T2`` if T2 alone is meaningful.
    """
    if t1_ns <= 0:
        return 1.0 / max(t2_ns, 1e-9)
    if t2_ns <= 0:
        return 1.0 / (2.0 * t1_ns)
    # Pure dephasing 1/T_phi = 1/T2 - 1/(2 T1); clamp to ≥ 0.
    one_over_tphi = max(0.0, 1.0 / t2_ns - 1.0 / (2.0 * t1_ns))
    return 1.0 / (2.0 * t1_ns) + 0.5 * one_over_tphi


def circuit_error_budget(
    snapshot: CalibrationSnapshot,
    gate_counts: Dict[str, int],
    *,
    depth: int = 1,
    num_measurements: int | None = None,
) -> ErrorBudget:
    """Estimate the error budget for a circuit.

    Parameters
    ----------
    gate_counts        : mapping of gate-class → count, where the classes are
                         ``"1q"`` (single-qubit), ``"2q"`` (two-qubit), and
                         ``"meas"`` (mid-circuit measurements). Unrecognised
                         classes are silently ignored.
    depth              : circuit depth (number of time-steps); used only for
                         the decoherence term ``γ · depth · gate_time``.
    num_measurements   : explicit measurement count. Defaults to the value
                         in ``gate_counts.get('meas', 0)`` or ``num_qubits``
                         if no key is supplied.
    """
    counts = {k: int(v) for k, v in gate_counts.items()}
    n1q = counts.get("1q", 0)
    n2q = counts.get("2q", 0)
    n_meas = (
        int(num_measurements)
        if num_measurements is not None
        else counts.get("meas", snapshot.num_qubits)
    )

    eps_1q = snapshot.mean_gate_error_1q() * n1q
    eps_2q = snapshot.mean_gate_error_2q() * n2q
    eps_ro = snapshot.mean_readout_error() * n_meas

    # Decoherence: per-qubit γ_dec × total circuit time. We approximate the
    # active gate time as depth × max(gate_time_1q, gate_time_2q if any).
    gate_time = (
        snapshot.gate_time_2q_ns if n2q > 0 else snapshot.gate_time_1q_ns
    )
    total_time_ns = max(int(depth), 1) * gate_time
    n_qubits_used = max(1, snapshot.num_qubits)
    gamma_per_ns_avg = sum(
        _decoherence_per_ns(snapshot.t1_ns[i], snapshot.t2_ns[i])
        for i in range(n_qubits_used)
    ) / n_qubits_used
    eps_dec = gamma_per_ns_avg * total_time_ns * n_qubits_used

    # Clamp each bucket so we never claim more than 100% error per channel.
    eps_1q = min(eps_1q, 1.0)
    eps_2q = min(eps_2q, 1.0)
    eps_dec = min(eps_dec, 1.0)
    eps_ro = min(eps_ro, 1.0)

    # Independent-error fidelity ≈ exp(-Σ ε_i).
    total_err = eps_1q + eps_2q + eps_dec + eps_ro
    fidelity = math.exp(-total_err)

    breakdown = [
        {"label": "Single-qubit gates", "value": eps_1q, "color": "vegas-gold"},
        {"label": "Two-qubit gates", "value": eps_2q, "color": "brass-light"},
        {"label": "Decoherence (T₁,T₂)", "value": eps_dec, "color": "muted-brick"},
        {"label": "Readout", "value": eps_ro, "color": "isabelline"},
    ]

    return ErrorBudget(
        snapshot=snapshot.name,
        gate_counts=counts,
        depth=int(depth),
        single_qubit_err=eps_1q,
        two_qubit_err=eps_2q,
        decoherence_err=eps_dec,
        readout_err=eps_ro,
        total_err=total_err,
        fidelity=fidelity,
        breakdown=breakdown,
    )


def fidelity_vs_depth(
    snapshot: CalibrationSnapshot,
    *,
    gate_mix: Dict[str, int],
    max_depth: int = 50,
    step: int = 1,
) -> List[dict]:
    """Sweep depth from 1..max_depth, scaling gate counts proportionally."""
    if max_depth <= 0:
        raise ValueError("max_depth must be positive")
    if step <= 0:
        raise ValueError("step must be positive")
    out: List[dict] = []
    for d in range(1, max_depth + 1, step):
        scaled = {
            k: int(v) * d for k, v in gate_mix.items() if k in {"1q", "2q", "meas"}
        }
        eb = circuit_error_budget(snapshot, scaled, depth=d)
        out.append({
            "depth": d,
            "fidelity": eb.fidelity,
            "total_err": eb.total_err,
        })
    return out
