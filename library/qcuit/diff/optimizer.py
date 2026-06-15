"""Small optimizers and a streaming training helper for Qcuit diff demos."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterator

import numpy as np

from .observables import Hamiltonian
from .parameter_shift import expectation, parameter_shift_gradient


@dataclass
class SGD:
    """Plain stochastic-gradient-descent style optimizer."""

    lr: float = 0.1

    def step(self, params: np.ndarray, grad: np.ndarray) -> np.ndarray:
        return params - self.lr * grad


@dataclass
class Adam:
    """Adam optimizer for the small trainer presets."""

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
        m_hat = self._m / (1 - self.beta1**self._t)
        v_hat = self._v / (1 - self.beta2**self._t)
        return params - self.lr * m_hat / (np.sqrt(v_hat) + self.eps)


def train(
    circuit_fn: Callable[[np.ndarray, int], np.ndarray],
    init_params: np.ndarray,
    observable: Hamiltonian,
    *,
    optimizer: SGD | Adam | None = None,
    iterations: int = 100,
    seed: int = 0,
) -> Iterator[dict]:
    """Yield ``{iter, loss, params, grad_norm}`` for each optimizer step."""
    optimizer = optimizer or Adam()
    params = np.asarray(init_params, dtype=float).copy()

    yield {
        "iter": 0,
        "loss": float(expectation(circuit_fn, params, observable, seed=seed)),
        "params": params.tolist(),
        "grad_norm": 0.0,
    }

    for k in range(1, iterations + 1):
        grad = parameter_shift_gradient(circuit_fn, params, observable, seed=seed)
        params = optimizer.step(params, grad)
        yield {
            "iter": int(k),
            "loss": float(expectation(circuit_fn, params, observable, seed=seed)),
            "params": params.tolist(),
            "grad_norm": float(np.linalg.norm(grad)),
        }
