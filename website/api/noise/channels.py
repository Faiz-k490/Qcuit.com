"""
Kraus channel constructors for the Noise Lab.

Each constructor returns a :class:`KrausChannel` — a list of Kraus operators
satisfying :math:`\\sum_i K_i^{\\dagger} K_i = I`. The channels here are the
standard single-qubit ones used throughout textbook QEC and IBM / IonQ /
Quantinuum device modelling:

    * ``depolarizing(p)``       — depolarising with rate p ∈ [0, 1].
    * ``amplitude_damping(g)``  — T1 relaxation with rate γ ∈ [0, 1].
    * ``phase_damping(l)``      — T2 dephasing with rate λ ∈ [0, 1].
    * ``readout_assignment_matrix(p01, p10)`` — measurement classification.

These are exposed primarily for teaching and for trace-preservation tests;
the actual fidelity numbers that drive the UI are computed in
:mod:`api.noise.budget` from the gate / decoherence rates without running a
full density-matrix simulation.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np


_I = np.eye(2, dtype=np.complex128)
_X = np.array([[0, 1], [1, 0]], dtype=np.complex128)
_Y = np.array([[0, -1j], [1j, 0]], dtype=np.complex128)
_Z = np.array([[1, 0], [0, -1]], dtype=np.complex128)


@dataclass
class KrausChannel:
    name: str
    kraus: List[np.ndarray]

    def trace_residual(self) -> float:
        """Return ``||I − Σ K†K||`` (should be ≈ 0 for valid channels)."""
        total = sum(K.conj().T @ K for K in self.kraus)
        return float(np.linalg.norm(total - _I))

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "num_operators": len(self.kraus),
            "kraus": [
                [[complex(K[i, j]).real for j in range(K.shape[1])] for i in range(K.shape[0])]
                for K in self.kraus
            ],
        }


def _validate_prob(name: str, p: float) -> float:
    if not (0.0 <= p <= 1.0):
        raise ValueError(f"{name} must be in [0, 1], got {p}")
    return float(p)


# ── Depolarising ────────────────────────────────────────────────────────
def depolarizing(p: float) -> KrausChannel:
    """Single-qubit depolarising channel of rate ``p``.

    With probability ``1 - p`` the state is unchanged; with probability
    ``p / 3`` each Pauli X, Y, Z is applied (so the total error probability
    is ``p`` and the fidelity is ``1 - p``).
    """
    p = _validate_prob("p", p)
    a = np.sqrt(1.0 - p)
    b = np.sqrt(p / 3.0)
    return KrausChannel(
        name=f"depolarizing(p={p:.6g})",
        kraus=[a * _I, b * _X, b * _Y, b * _Z],
    )


# ── Amplitude damping (T1) ─────────────────────────────────────────────
def amplitude_damping(gamma: float) -> KrausChannel:
    """Amplitude-damping channel of rate ``γ`` (T1 relaxation).

    ``K0 = [[1, 0], [0, √(1-γ)]]``, ``K1 = [[0, √γ], [0, 0]]``.
    """
    g = _validate_prob("gamma", gamma)
    K0 = np.array([[1.0, 0.0], [0.0, np.sqrt(1.0 - g)]], dtype=np.complex128)
    K1 = np.array([[0.0, np.sqrt(g)], [0.0, 0.0]], dtype=np.complex128)
    return KrausChannel(name=f"amplitude_damping(γ={g:.6g})", kraus=[K0, K1])


# ── Phase damping (T2 / T_phi) ─────────────────────────────────────────
def phase_damping(lam: float) -> KrausChannel:
    """Phase-damping (pure dephasing) channel of rate ``λ``.

    ``K0 = [[1, 0], [0, √(1-λ)]]``, ``K1 = [[0, 0], [0, √λ]]``.
    """
    l = _validate_prob("lam", lam)
    K0 = np.array([[1.0, 0.0], [0.0, np.sqrt(1.0 - l)]], dtype=np.complex128)
    K1 = np.array([[0.0, 0.0], [0.0, np.sqrt(l)]], dtype=np.complex128)
    return KrausChannel(name=f"phase_damping(λ={l:.6g})", kraus=[K0, K1])


# ── Readout assignment ────────────────────────────────────────────────
def readout_assignment_matrix(p01: float, p10: float) -> np.ndarray:
    """Classical 2×2 readout-assignment matrix.

    Entry ``A[i, j]`` is the probability of reporting outcome ``i`` when the
    true state was ``j``. Columns sum to 1.

        A = [[1 - p10,  p01    ],
             [p10,      1 - p01]]
    """
    p01 = _validate_prob("p01", p01)
    p10 = _validate_prob("p10", p10)
    return np.array(
        [[1.0 - p10, p01], [p10, 1.0 - p01]],
        dtype=np.float64,
    )


# ── Verification ──────────────────────────────────────────────────────
def is_trace_preserving(channel: KrausChannel, atol: float = 1e-10) -> bool:
    return channel.trace_residual() < atol
