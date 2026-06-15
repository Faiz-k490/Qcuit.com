"""
QNNModel — encoder + ansatz + observable wrapped into a binary classifier.

Per-sample forward pass (for input ``x_i``):

    state_0  = |0…0⟩
    state_1  = encoder.apply(state_0, x_i)
    state_2  = ansatz.apply(state_1, θ)
    yhat_i   = ⟨state_2 | Z_0 | state_2⟩          ∈ [-1, 1]

Loss (mean-squared-error against labels in {-1, +1}):

    L(θ)     = (1/N) · Σ_i (yhat_i − y_i)²

Gradient via the parameter-shift rule on the per-sample expectation:

    ∂L/∂θ_k = (2/N) · Σ_i (yhat_i − y_i) · ∂⟨Z_0⟩_i / ∂θ_k

The implementation is intentionally tiny (~120 LOC) so it doubles as a
classroom reference for a quantum classifier.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterator, Tuple

import numpy as np

from api.diffsim.observables import Hamiltonian
from api.diffsim.optimizer import SGD, Adam
from api.diffsim.parameter_shift import SHIFT

from .encoders import Encoder
from .ansatze import Ansatz


# ──────────────────────────────────────────────────────────────────────────────
# Default observable: Z on qubit 0.
# ──────────────────────────────────────────────────────────────────────────────
def _z0_hamiltonian(num_qubits: int) -> Hamiltonian:
    return Hamiltonian.from_terms(
        num_qubits=num_qubits,
        terms=[(1.0, "Z" + "I" * (num_qubits - 1))],
    )


@dataclass
class QNNModel:
    encoder: Encoder
    ansatz: Ansatz
    observable: Hamiltonian = field(default=None)  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.encoder.num_qubits != self.ansatz.num_qubits:
            raise ValueError(
                f"Encoder qubits ({self.encoder.num_qubits}) "
                f"!= ansatz qubits ({self.ansatz.num_qubits})"
            )
        if self.observable is None:
            self.observable = _z0_hamiltonian(self.ansatz.num_qubits)

    # ── Convenience properties ────────────────────────────────────────────
    @property
    def num_qubits(self) -> int:
        return self.ansatz.num_qubits

    @property
    def num_params(self) -> int:
        return self.ansatz.num_params

    @property
    def feature_dim(self) -> int:
        return self.encoder.feature_dim

    # ── Forward pass ──────────────────────────────────────────────────────
    def forward_state(self, x: np.ndarray, theta: np.ndarray) -> np.ndarray:
        s = self.encoder.apply(None, np.asarray(x, dtype=float))  # type: ignore[arg-type]
        s = self.ansatz.apply(s, np.asarray(theta, dtype=float))
        return s

    def predict_value(self, x: np.ndarray, theta: np.ndarray) -> float:
        psi = self.forward_state(x, theta)
        return float(self.observable.expectation(psi))

    def predict_label(self, x: np.ndarray, theta: np.ndarray) -> int:
        return 1 if self.predict_value(x, theta) >= 0 else -1

    # ── Loss / grad over a batch ──────────────────────────────────────────
    def loss(self, X: np.ndarray, y: np.ndarray, theta: np.ndarray) -> Tuple[float, float, np.ndarray]:
        """Return (mse_loss, accuracy, predictions). No gradient computation."""
        N = X.shape[0]
        preds = np.empty(N, dtype=float)
        for i in range(N):
            preds[i] = self.predict_value(X[i], theta)
        diff = preds - np.asarray(y, dtype=float)
        mse = float(np.mean(diff * diff))
        acc = float(np.mean(np.sign(preds) == np.sign(y)))
        return mse, acc, preds

    def grad(self, X: np.ndarray, y: np.ndarray, theta: np.ndarray) -> np.ndarray:
        """Mean parameter-shift gradient of the MSE loss over the batch.

        Per sample: dL_i/dθ_k = 2 (yhat_i - y_i) · ∂⟨Z_0⟩_i/∂θ_k.
        ∂⟨Z_0⟩_i/∂θ_k = ½ ( ⟨…⟩(θ+π/2 e_k) − ⟨…⟩(θ-π/2 e_k) ).
        """
        N = X.shape[0]
        K = theta.size
        grad = np.zeros(K, dtype=float)
        for i in range(N):
            yhat_i = self.predict_value(X[i], theta)
            diff_i = yhat_i - float(y[i])
            for k in range(K):
                plus = theta.copy()
                minus = theta.copy()
                plus[k] += SHIFT
                minus[k] -= SHIFT
                e_plus = self.predict_value(X[i], plus)
                e_minus = self.predict_value(X[i], minus)
                d_yhat_k = 0.5 * (e_plus - e_minus)
                grad[k] += 2.0 * diff_i * d_yhat_k
        return grad / float(N)


# ──────────────────────────────────────────────────────────────────────────────
# Training loop
# ──────────────────────────────────────────────────────────────────────────────
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
    """Yield ``{iter, loss, accuracy, params, grad_norm}`` per step.

    The first yielded dict has ``iter == 0`` and reports the initial
    loss / accuracy *before* any optimiser step.
    """
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
        g = model.grad(X, y, theta)
        theta = optimizer.step(theta, g)
        loss_k, acc_k, _ = model.loss(X, y, theta)
        yield {
            "iter": int(k),
            "loss": float(loss_k),
            "accuracy": float(acc_k),
            "params": theta.tolist(),
            "grad_norm": float(np.linalg.norm(g)),
        }
