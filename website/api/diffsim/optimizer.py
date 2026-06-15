"""
Gradient-descent optimisers for the differentiable simulator.

Each optimiser is a small stateful class with a ``step(params, grad)`` method
returning new parameters. The :func:`train` helper drives the
expectation/gradient loop and yields a per-iteration ``dict`` so callers can
either collect the full trajectory or stream it as Server-Sent Events.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterator

import numpy as np

from .observables import Hamiltonian
from .parameter_shift import expectation, parameter_shift_gradient


# ── Optimisers ───────────────────────────────────────────────────────────────
@dataclass
class SGD:
    lr: float = 0.1

    def step(self, params: np.ndarray, grad: np.ndarray) -> np.ndarray:
        return params - self.lr * grad


@dataclass
class Adam:
    lr: float = 0.05
    beta1: float = 0.9
    beta2: float = 0.999
    eps: float = 1e-8
    _m: np.ndarray | None = field(default=None, init=False, repr=False)
    _v: np.ndarray | None = field(default=None, init=False, repr=False)
    _t: int = field(default=0, init=False, repr=False)

    def step(self, params: np.ndarray, grad: np.ndarray) -> np.ndarray:
        if self._m is None:
            self._m = np.zeros_like(params)
            self._v = np.zeros_like(params)
        self._t += 1
        self._m = self.beta1 * self._m + (1 - self.beta1) * grad
        self._v = self.beta2 * self._v + (1 - self.beta2) * (grad * grad)
        m_hat = self._m / (1 - self.beta1 ** self._t)
        v_hat = self._v / (1 - self.beta2 ** self._t)
        return params - self.lr * m_hat / (np.sqrt(v_hat) + self.eps)


# ── Training loop ────────────────────────────────────────────────────────────
def train(
    circuit_fn: Callable[[np.ndarray, int], np.ndarray],
    init_params: np.ndarray,
    observable: Hamiltonian,
    *,
    optimizer: SGD | Adam | None = None,
    iterations: int = 100,
    seed: int = 0,
) -> Iterator[dict]:
    """Yield ``{iter, loss, params, grad_norm}`` per Adam/SGD step.

    The first yielded dict has ``iter == 0`` and reports the initial loss
    *before* any step. Subsequent dicts are post-step.
    """
    optimizer = optimizer or Adam()
    params = np.asarray(init_params, dtype=float).copy()

    initial_loss = expectation(circuit_fn, params, observable, seed=seed)
    yield {
        "iter": 0,
        "loss": float(initial_loss),
        "params": params.tolist(),
        "grad_norm": 0.0,
    }

    for k in range(1, iterations + 1):
        grad = parameter_shift_gradient(circuit_fn, params, observable, seed=seed)
        params = optimizer.step(params, grad)
        loss = expectation(circuit_fn, params, observable, seed=seed)
        yield {
            "iter": int(k),
            "loss": float(loss),
            "params": params.tolist(),
            "grad_norm": float(np.linalg.norm(grad)),
        }
