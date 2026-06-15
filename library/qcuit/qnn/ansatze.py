"""Variational ansatze for QNN classifiers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

from qcuit.diff.circuits import _apply_cnot, _apply_single, _ry, _rz


@dataclass
class Ansatz:
    """A trainable circuit block applied after an encoder."""

    name: str
    num_qubits: int
    num_params: int
    apply: Callable[[np.ndarray, np.ndarray], np.ndarray]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "num_qubits": int(self.num_qubits),
            "num_params": int(self.num_params),
        }


def real_amplitudes_ansatz(num_qubits: int, layers: int = 2) -> Ansatz:
    """Return a RY-layer ansatz with linear CNOT entanglers."""
    num_params = num_qubits * layers

    def apply(state: np.ndarray, theta: np.ndarray) -> np.ndarray:
        out = state
        idx = 0
        for layer in range(layers):
            for q in range(num_qubits):
                out = _apply_single(out, _ry(float(theta[idx])), q, num_qubits)
                idx += 1
            if layer < layers - 1:
                for q in range(num_qubits - 1):
                    out = _apply_cnot(out, q, q + 1, num_qubits)
        return out

    return Ansatz(
        name=f"real_amplitudes_l{layers}",
        num_qubits=num_qubits,
        num_params=num_params,
        apply=apply,
    )


def hardware_efficient_ansatz(num_qubits: int, layers: int = 2) -> Ansatz:
    """Return a RZ-RY-RZ ansatz with a CNOT ring."""
    num_params = 3 * num_qubits * layers

    def apply(state: np.ndarray, theta: np.ndarray) -> np.ndarray:
        out = state
        idx = 0
        for _ in range(layers):
            for q in range(num_qubits):
                out = _apply_single(out, _rz(float(theta[idx])), q, num_qubits)
                idx += 1
                out = _apply_single(out, _ry(float(theta[idx])), q, num_qubits)
                idx += 1
                out = _apply_single(out, _rz(float(theta[idx])), q, num_qubits)
                idx += 1
            for q in range(num_qubits):
                out = _apply_cnot(out, q, (q + 1) % num_qubits, num_qubits)
        return out

    return Ansatz(
        name=f"hardware_efficient_l{layers}",
        num_qubits=num_qubits,
        num_params=num_params,
        apply=apply,
    )


ANSATZ_REGISTRY = {
    "real_amplitudes": real_amplitudes_ansatz,
    "hardware_efficient": hardware_efficient_ansatz,
}
