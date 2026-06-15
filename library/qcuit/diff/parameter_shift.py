"""Parameter-shift gradients for small statevector circuits."""

from __future__ import annotations

from typing import Callable

import numpy as np

from .observables import Hamiltonian


CircuitFn = Callable[[np.ndarray, int], np.ndarray]
SHIFT = np.pi / 2.0


def expectation(
    circuit_fn: CircuitFn,
    params: np.ndarray,
    observable: Hamiltonian,
    *,
    seed: int = 0,
) -> float:
    """Compute ``<psi(theta)|H|psi(theta)>`` for a parametrized circuit."""
    np.random.seed(int(seed) & 0xFFFFFFFF)
    psi = circuit_fn(np.asarray(params, dtype=float), observable.num_qubits)
    return observable.expectation(psi)


def parameter_shift_gradient(
    circuit_fn: CircuitFn,
    params: np.ndarray,
    observable: Hamiltonian,
    *,
    seed: int = 0,
) -> np.ndarray:
    """Return the exact two-shift gradient for Pauli-rotation parameters."""
    params = np.asarray(params, dtype=float).copy()
    grad = np.zeros_like(params)
    for k in range(params.size):
        plus = params.copy()
        minus = params.copy()
        plus[k] += SHIFT
        minus[k] -= SHIFT
        e_plus = expectation(circuit_fn, plus, observable, seed=seed)
        e_minus = expectation(circuit_fn, minus, observable, seed=seed)
        grad[k] = 0.5 * (e_plus - e_minus)
    return grad


def finite_difference_gradient(
    circuit_fn: CircuitFn,
    params: np.ndarray,
    observable: Hamiltonian,
    *,
    h: float = 1e-3,
    seed: int = 0,
) -> np.ndarray:
    """Return a central-difference reference gradient."""
    params = np.asarray(params, dtype=float).copy()
    grad = np.zeros_like(params)
    for k in range(params.size):
        plus = params.copy()
        minus = params.copy()
        plus[k] += h
        minus[k] -= h
        e_plus = expectation(circuit_fn, plus, observable, seed=seed)
        e_minus = expectation(circuit_fn, minus, observable, seed=seed)
        grad[k] = (e_plus - e_minus) / (2 * h)
    return grad
