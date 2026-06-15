"""
Variational ansätze for QNN classifiers.

An *ansatz* applies a parametrised unitary on top of an existing state
(typically just-encoded by an encoder). Each ansatz is exposed as an
:class:`Ansatz` dataclass with:

    - ``name``       — short identifier echoed in exports/UI
    - ``num_qubits``
    - ``num_params`` — length of the trainable parameter vector ``θ``
    - ``apply(state, theta)`` — apply the parametrised unitary

The two ansätze here mirror the diffsim builders but accept a non-zero
initial state, which is what we need for an encoder→ansatz pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Tuple

import numpy as np

from api.diffsim.circuits import _apply_single, _apply_cnot, _ry, _rz


@dataclass
class Ansatz:
    name: str
    num_qubits: int
    num_params: int
    apply: Callable[[np.ndarray, np.ndarray], np.ndarray]
    """``apply(state, theta) -> state``."""

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "num_qubits": int(self.num_qubits),
            "num_params": int(self.num_params),
        }


def real_amplitudes_ansatz(num_qubits: int, layers: int = 2) -> Ansatz:
    """Real-amplitudes ansatz applied on top of an existing state.

    Each layer: RY on every qubit, then linear-chain CNOTs (skipped on the
    last layer).
    """
    num_params = num_qubits * layers

    def apply(state: np.ndarray, theta: np.ndarray) -> np.ndarray:
        s = state
        idx = 0
        for layer in range(layers):
            for q in range(num_qubits):
                s = _apply_single(s, _ry(float(theta[idx])), q, num_qubits)
                idx += 1
            if layer < layers - 1:
                for q in range(num_qubits - 1):
                    s = _apply_cnot(s, q, q + 1, num_qubits)
        return s

    return Ansatz(
        name=f"real_amplitudes_l{layers}",
        num_qubits=num_qubits,
        num_params=num_params,
        apply=apply,
    )


def hardware_efficient_ansatz(num_qubits: int, layers: int = 2) -> Ansatz:
    """Three-rotation hardware-efficient ansatz with a CNOT ring."""
    num_params = 3 * num_qubits * layers

    def apply(state: np.ndarray, theta: np.ndarray) -> np.ndarray:
        s = state
        idx = 0
        for _ in range(layers):
            for q in range(num_qubits):
                s = _apply_single(s, _rz(float(theta[idx])), q, num_qubits); idx += 1
                s = _apply_single(s, _ry(float(theta[idx])), q, num_qubits); idx += 1
                s = _apply_single(s, _rz(float(theta[idx])), q, num_qubits); idx += 1
            for q in range(num_qubits):
                s = _apply_cnot(s, q, (q + 1) % num_qubits, num_qubits)
        return s

    return Ansatz(
        name=f"hardware_efficient_l{layers}",
        num_qubits=num_qubits,
        num_params=num_params,
        apply=apply,
    )


# ── Registry ────────────────────────────────────────────────────────────────
ANSATZ_REGISTRY = {
    "real_amplitudes": real_amplitudes_ansatz,
    "hardware_efficient": hardware_efficient_ansatz,
}
