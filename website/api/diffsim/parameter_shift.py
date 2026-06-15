"""
Parameter-shift gradient over a parametrised statevector circuit.

A *parametrised circuit* here is a Python callable
``circuit_fn(params: np.ndarray, num_qubits: int) -> np.ndarray`` that builds
and returns a final statevector. Each parameter ``θ_k`` is assumed to drive
**exactly one** Pauli rotation gate (RX/RY/RZ) — the standard QNN ansatz
shape — so that the parameter-shift rule

    ∂ ⟨H⟩(θ) / ∂θ_k = ½ ( ⟨H⟩(θ + π/2 · ê_k) − ⟨H⟩(θ − π/2 · ê_k) )

is exact.

The two-evaluation scheme matches the cost on real hardware, where finite-
difference gradients are dominated by shot noise. This module is fully
deterministic (no sampling) and seeded only for completeness.
"""

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
    """Compute ``⟨ψ(θ)|H|ψ(θ)⟩`` for a parametrised circuit."""
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
    """Exact gradient via the two-shift parameter-shift rule.

    Cost: ``2 * len(params)`` circuit evaluations, identical to hardware
    autograd. Returns a real-valued ndarray of the same shape as ``params``.
    """
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
    """Central-difference reference gradient. Used only by tests."""
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
