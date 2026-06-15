"""Minimal QNN classifier and parameter-shift training loop."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterator, Tuple

import numpy as np

from qcuit.diff import Adam, Hamiltonian, SGD
from qcuit.diff.parameter_shift import SHIFT

from .ansatze import Ansatz
from .encoders import Encoder


def _z0_hamiltonian(num_qubits: int) -> Hamiltonian:
    return Hamiltonian.from_terms(
        num_qubits=num_qubits,
        terms=[(1.0, "Z" + "I" * (num_qubits - 1))],
    )


@dataclass
class QNNModel:
    """Encoder + ansatz + observable wrapped as a binary classifier."""

    encoder: Encoder
    ansatz: Ansatz
    observable: Hamiltonian = field(default=None)  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.encoder.num_qubits != self.ansatz.num_qubits:
            raise ValueError(
                f"Encoder qubits ({self.encoder.num_qubits}) != ansatz qubits ({self.ansatz.num_qubits})"
            )
        if self.observable is None:
            self.observable = _z0_hamiltonian(self.ansatz.num_qubits)

    @property
    def num_qubits(self) -> int:
        return self.ansatz.num_qubits

    @property
    def num_params(self) -> int:
        return self.ansatz.num_params

    @property
    def feature_dim(self) -> int:
        return self.encoder.feature_dim

    def forward_state(self, x: np.ndarray, theta: np.ndarray) -> np.ndarray:
        state = self.encoder.apply(None, np.asarray(x, dtype=float))
        return self.ansatz.apply(state, np.asarray(theta, dtype=float))

    def predict_value(self, x: np.ndarray, theta: np.ndarray) -> float:
        return float(self.observable.expectation(self.forward_state(x, theta)))

    def predict_label(self, x: np.ndarray, theta: np.ndarray) -> int:
        return 1 if self.predict_value(x, theta) >= 0 else -1

    def loss(self, X: np.ndarray, y: np.ndarray, theta: np.ndarray) -> Tuple[float, float, np.ndarray]:
        preds = np.empty(X.shape[0], dtype=float)
        for i in range(X.shape[0]):
            preds[i] = self.predict_value(X[i], theta)
        diff = preds - np.asarray(y, dtype=float)
        mse = float(np.mean(diff * diff))
        acc = float(np.mean(np.sign(preds) == np.sign(y)))
        return mse, acc, preds

    def grad(self, X: np.ndarray, y: np.ndarray, theta: np.ndarray) -> np.ndarray:
        grad = np.zeros(theta.size, dtype=float)
        for i in range(X.shape[0]):
            yhat = self.predict_value(X[i], theta)
            diff = yhat - float(y[i])
            for k in range(theta.size):
                plus = theta.copy()
                minus = theta.copy()
                plus[k] += SHIFT
                minus[k] -= SHIFT
                d_yhat = 0.5 * (self.predict_value(X[i], plus) - self.predict_value(X[i], minus))
                grad[k] += 2.0 * diff * d_yhat
        return grad / float(X.shape[0])


def qnn_train(
    model: QNNModel,
    X: np.ndarray,
    y: np.ndarray,
    init_theta: np.ndarray,
    *,
    optimizer: SGD | Adam | None = None,
    iterations: int = 30,
    seed: int = 0,
) -> Iterator[dict]:
    """Yield training metrics for a small QNN classifier."""
    np.random.seed(int(seed) & 0xFFFFFFFF)
    optimizer = optimizer or Adam(lr=0.1)
    theta = np.asarray(init_theta, dtype=float).copy()

    loss0, acc0, _ = model.loss(X, y, theta)
    yield {
        "iter": 0,
        "loss": float(loss0),
        "accuracy": float(acc0),
        "params": theta.tolist(),
        "grad_norm": 0.0,
    }

    for k in range(1, iterations + 1):
        grad = model.grad(X, y, theta)
        theta = optimizer.step(theta, grad)
        loss_k, acc_k, _ = model.loss(X, y, theta)
        yield {
            "iter": int(k),
            "loss": float(loss_k),
            "accuracy": float(acc_k),
            "params": theta.tolist(),
            "grad_norm": float(np.linalg.norm(grad)),
        }
