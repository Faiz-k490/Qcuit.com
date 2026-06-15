"""Feature encoders for small QNN classifiers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

from qcuit.diff.circuits import _apply_cnot, _apply_single, _ry, _rz, _zero_state


_H = (1 / np.sqrt(2)) * np.array([[1, 1], [1, -1]], dtype=np.complex128)


@dataclass
class Encoder:
    """A non-trainable map from classical features into a quantum state."""

    name: str
    num_qubits: int
    feature_dim: int
    apply: Callable[[np.ndarray | None, np.ndarray], np.ndarray]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "num_qubits": int(self.num_qubits),
            "feature_dim": int(self.feature_dim),
        }


def angle_encoder(num_qubits: int) -> Encoder:
    """Apply RY(pi * x_i) on qubit i."""

    def apply(state: np.ndarray | None, x: np.ndarray) -> np.ndarray:
        if state is None:
            state = _zero_state(num_qubits)
        x = np.asarray(x, dtype=float)
        for q in range(num_qubits):
            state = _apply_single(state, _ry(float(np.pi * x[q])), q, num_qubits)
        return state

    return Encoder(name="angle", num_qubits=num_qubits, feature_dim=num_qubits, apply=apply)


def amplitude_encoder(num_qubits: int) -> Encoder:
    """Embed a vector directly into statevector amplitudes."""
    dim = 1 << num_qubits

    def apply(_state: np.ndarray | None, x: np.ndarray) -> np.ndarray:
        x = np.asarray(x, dtype=float).flatten()
        vec = np.zeros(dim, dtype=np.complex128)
        n = min(dim, x.size)
        vec[:n] = x[:n].astype(np.complex128)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec

    return Encoder(name="amplitude", num_qubits=num_qubits, feature_dim=dim, apply=apply)


def zz_feature_map(num_qubits: int, reps: int = 1) -> Encoder:
    """Havlicek-style ZZ feature map for compact QML examples."""

    def _apply_zz(state: np.ndarray, q1: int, q2: int, angle: float, n: int) -> np.ndarray:
        state = _apply_cnot(state, q1, q2, n)
        state = _apply_single(state, _rz(float(angle)), q2, n)
        state = _apply_cnot(state, q1, q2, n)
        return state

    def apply(state: np.ndarray | None, x: np.ndarray) -> np.ndarray:
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


ENCODER_REGISTRY = {
    "angle": angle_encoder,
    "amplitude": amplitude_encoder,
    "zz_feature_map": zz_feature_map,
}
