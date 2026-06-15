"""
Feature encoders for QNN classifiers.

An *encoder* maps a classical feature vector ``x ∈ ℝ^d`` into a quantum
state on ``num_qubits`` qubits. Each encoder is exposed as an :class:`Encoder`
dataclass containing:

    - ``name``    — short identifier echoed in exports/UI
    - ``num_qubits``
    - ``feature_dim`` — d, expected length of the input ``x``
    - ``apply(state, x)`` — apply the encoder to an in-progress state

All encoders are *non-trainable* (no parameters); they consume only ``x``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

# Re-use the in-place gate kernels from diffsim.
from api.diffsim.circuits import (
    _apply_single,
    _apply_cnot,
    _ry,
    _rz,
    _zero_state,
)


# A Pauli H gate.
_H = (1 / np.sqrt(2)) * np.array([[1, 1], [1, -1]], dtype=np.complex128)


@dataclass
class Encoder:
    name: str
    num_qubits: int
    feature_dim: int
    apply: Callable[[np.ndarray, np.ndarray], np.ndarray]
    """``apply(state, x) -> state``: apply this encoder to an in-progress state."""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "num_qubits": int(self.num_qubits),
            "feature_dim": int(self.feature_dim),
        }


# ── Angle encoder ────────────────────────────────────────────────────────────
def angle_encoder(num_qubits: int) -> Encoder:
    """Apply RY(π·x_i) on qubit i, starting from |0…0⟩.

    Maps each feature into a one-qubit rotation. ``feature_dim == num_qubits``.
    """

    def apply(state: np.ndarray, x: np.ndarray) -> np.ndarray:
        if state is None:
            state = _zero_state(num_qubits)
        x = np.asarray(x, dtype=float)
        for q in range(num_qubits):
            state = _apply_single(state, _ry(float(np.pi * x[q])), q, num_qubits)
        return state

    return Encoder(
        name="angle",
        num_qubits=num_qubits,
        feature_dim=num_qubits,
        apply=apply,
    )


# ── Amplitude encoder ────────────────────────────────────────────────────────
def amplitude_encoder(num_qubits: int) -> Encoder:
    """Embed a 2^n-vector ``x`` directly into the statevector amplitudes.

    Pads / truncates to length ``2^num_qubits`` and L2-normalises. Used for
    feature vectors that are already amplitude-shaped (rare in practice; we
    expose it for completeness).
    """
    dim = 1 << num_qubits

    def apply(state: np.ndarray, x: np.ndarray) -> np.ndarray:
        x = np.asarray(x, dtype=float).flatten()
        v = np.zeros(dim, dtype=np.complex128)
        n = min(dim, x.size)
        v[:n] = x[:n].astype(np.complex128)
        norm = np.linalg.norm(v)
        if norm > 0:
            v = v / norm
        else:
            v[0] = 1.0
        return v  # ignore prior state — amplitude encoding is destructive

    return Encoder(
        name="amplitude",
        num_qubits=num_qubits,
        feature_dim=dim,
        apply=apply,
    )


# ── ZZ feature map (Havlíček et al.) ─────────────────────────────────────────
def zz_feature_map(num_qubits: int, reps: int = 1) -> Encoder:
    """Quantum-kernel feature map: H ⊗ … ⊗ H followed by RZ(2x_i) and
    ZZ(2(π−x_i)(π−x_j)) on every pair, repeated ``reps`` times.

    ``feature_dim == num_qubits``. Source: arXiv:1804.11326.
    """

    def _apply_zz(state: np.ndarray, q1: int, q2: int, angle: float, n: int) -> np.ndarray:
        # ZZ(theta) = exp(-i theta/2 Z⊗Z) = CNOT · (I⊗RZ(theta)) · CNOT
        state = _apply_cnot(state, q1, q2, n)
        state = _apply_single(state, _rz(float(angle)), q2, n)
        state = _apply_cnot(state, q1, q2, n)
        return state

    def apply(state: np.ndarray, x: np.ndarray) -> np.ndarray:
        if state is None:
            state = _zero_state(num_qubits)
        x = np.asarray(x, dtype=float)
        for _ in range(reps):
            for q in range(num_qubits):
                state = _apply_single(state, _H, q, num_qubits)
            for q in range(num_qubits):
                state = _apply_single(state, _rz(float(2.0 * x[q])), q, num_qubits)
            for q1 in range(num_qubits):
                for q2 in range(q1 + 1, num_qubits):
                    angle = 2.0 * (np.pi - x[q1]) * (np.pi - x[q2])
                    state = _apply_zz(state, q1, q2, angle, num_qubits)
        return state

    return Encoder(
        name=f"zz_feature_map_r{reps}",
        num_qubits=num_qubits,
        feature_dim=num_qubits,
        apply=apply,
    )


# ── Registry ────────────────────────────────────────────────────────────────
ENCODER_REGISTRY = {
    "angle": angle_encoder,
    "amplitude": amplitude_encoder,
    "zz_feature_map": zz_feature_map,
}
