"""Small parametrized circuits used by Qcuit's trainer examples."""

from __future__ import annotations

from typing import Callable, Tuple

import numpy as np


CircuitFn = Callable[[np.ndarray, int], np.ndarray]


def _rx(theta: float) -> np.ndarray:
    c, s = np.cos(theta / 2), np.sin(theta / 2)
    return np.array([[c, -1j * s], [-1j * s, c]], dtype=np.complex128)


def _ry(theta: float) -> np.ndarray:
    c, s = np.cos(theta / 2), np.sin(theta / 2)
    return np.array([[c, -s], [s, c]], dtype=np.complex128)


def _rz(theta: float) -> np.ndarray:
    return np.diag([np.exp(-1j * theta / 2), np.exp(1j * theta / 2)]).astype(np.complex128)


def _apply_single(state: np.ndarray, gate: np.ndarray, target: int, n: int) -> np.ndarray:
    out = state.copy()
    target_mask = 1 << target
    for i in range(2**n):
        if (i & target_mask) == 0:
            j = i | target_mask
            a0, a1 = out[i], out[j]
            out[i] = gate[0, 0] * a0 + gate[0, 1] * a1
            out[j] = gate[1, 0] * a0 + gate[1, 1] * a1
    return out


def _apply_cnot(state: np.ndarray, control: int, target: int, n: int) -> np.ndarray:
    out = state.copy()
    target_mask = 1 << target
    control_mask = 1 << control
    for i in range(2**n):
        if (i & control_mask) == control_mask and (i & target_mask) == 0:
            j = i | target_mask
            out[i], out[j] = out[j], out[i]
    return out


def _zero_state(n: int) -> np.ndarray:
    state = np.zeros(2**n, dtype=np.complex128)
    state[0] = 1.0
    return state


def real_amplitudes_ansatz(num_qubits: int, layers: int) -> Tuple[CircuitFn, int]:
    """Return a real-amplitudes ansatz and its parameter count."""
    num_params = num_qubits * layers

    def circuit_fn(params: np.ndarray, n: int) -> np.ndarray:
        if n != num_qubits:
            raise ValueError(f"Expected {num_qubits} qubits, got {n}")
        state = _zero_state(n)
        idx = 0
        for layer in range(layers):
            for q in range(n):
                state = _apply_single(state, _ry(float(params[idx])), q, n)
                idx += 1
            if layer < layers - 1:
                for q in range(n - 1):
                    state = _apply_cnot(state, q, q + 1, n)
        return state

    return circuit_fn, num_params


def hardware_efficient_ansatz(num_qubits: int, layers: int) -> Tuple[CircuitFn, int]:
    """Return a RZ-RY-RZ ansatz with a CNOT ring."""
    num_params = 3 * num_qubits * layers

    def circuit_fn(params: np.ndarray, n: int) -> np.ndarray:
        if n != num_qubits:
            raise ValueError(f"Expected {num_qubits} qubits, got {n}")
        state = _zero_state(n)
        idx = 0
        for _layer in range(layers):
            for q in range(n):
                state = _apply_single(state, _rz(float(params[idx])), q, n)
                idx += 1
                state = _apply_single(state, _ry(float(params[idx])), q, n)
                idx += 1
                state = _apply_single(state, _rz(float(params[idx])), q, n)
                idx += 1
            for q in range(n):
                state = _apply_cnot(state, q, (q + 1) % n, n)
        return state

    return circuit_fn, num_params


def single_qubit_rotation(_num_qubits: int = 1) -> Tuple[CircuitFn, int]:
    """Return a one-parameter RY fit circuit starting from H|0>."""
    h_gate = (1 / np.sqrt(2)) * np.array([[1, 1], [1, -1]], dtype=np.complex128)

    def circuit_fn(params: np.ndarray, n: int) -> np.ndarray:
        state = _zero_state(n)
        state = _apply_single(state, h_gate, 0, n)
        state = _apply_single(state, _ry(float(params[0])), 0, n)
        return state

    return circuit_fn, 1
