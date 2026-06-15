"""
Tiny deterministic datasets for the QML Lab QNN panel.

Every dataset is fully seeded and small (≤ 64 samples) so a CPU-only
parameter-shift training loop completes in a few seconds.

Returned by every builder:

    {
        "name":     short id,
        "X":        np.ndarray of shape (N, d) with values in [0, π],
        "y":        np.ndarray of shape (N,) with values in {-1, +1},
        "feature_dim": d,
    }
"""

from __future__ import annotations

from typing import Dict, Any

import numpy as np


def _scale_to_pi(X: np.ndarray) -> np.ndarray:
    """Min-max scale each column into [0, π]."""
    X = np.asarray(X, dtype=float)
    out = np.zeros_like(X)
    for j in range(X.shape[1]):
        col = X[:, j]
        mn, mx = float(col.min()), float(col.max())
        if mx - mn < 1e-12:
            out[:, j] = np.pi / 2.0
        else:
            out[:, j] = np.pi * (col - mn) / (mx - mn)
    return out


# ── XOR ─────────────────────────────────────────────────────────────────────
def xor_dataset() -> Dict[str, Any]:
    """4-point XOR with each input duplicated 4× for a 16-sample set."""
    base_X = np.array(
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        dtype=float,
    )
    base_y = np.array([-1, 1, 1, -1], dtype=float)

    X = np.tile(base_X, (4, 1))  # 16 rows
    y = np.tile(base_y, 4)
    # Apply tiny deterministic jitter so multiple training runs see a real
    # gradient signal even with a low-rank ansatz.
    rng = np.random.default_rng(0)
    X = X + rng.normal(scale=0.05, size=X.shape)
    X = _scale_to_pi(X)
    return {"name": "xor", "X": X, "y": y, "feature_dim": 2}


# ── Parity (3-bit) ──────────────────────────────────────────────────────────
def parity_dataset() -> Dict[str, Any]:
    """All 8 binary 3-bit inputs labelled by parity (even = -1, odd = +1)."""
    bits = np.array([[(i >> 2) & 1, (i >> 1) & 1, i & 1] for i in range(8)], dtype=float)
    y = np.array([(-1 if (sum(b) % 2 == 0) else 1) for b in bits], dtype=float)
    X = _scale_to_pi(bits)
    return {"name": "parity", "X": X, "y": y, "feature_dim": 3}


# ── Two moons ───────────────────────────────────────────────────────────────
def moons_dataset(n_per_class: int = 20, noise: float = 0.10, seed: int = 7) -> Dict[str, Any]:
    """Hand-rolled deterministic moons (no sklearn dependency)."""
    rng = np.random.default_rng(seed)

    # Top moon
    t1 = np.linspace(0, np.pi, n_per_class)
    x1 = np.stack([np.cos(t1), np.sin(t1)], axis=1)
    # Bottom moon (shifted)
    t2 = np.linspace(0, np.pi, n_per_class)
    x2 = np.stack([1 - np.cos(t2), 0.5 - np.sin(t2)], axis=1)

    X = np.vstack([x1, x2]) + rng.normal(scale=noise, size=(2 * n_per_class, 2))
    y = np.concatenate([np.full(n_per_class, -1.0), np.full(n_per_class, 1.0)])

    # Deterministic shuffle.
    perm = rng.permutation(2 * n_per_class)
    X = X[perm]
    y = y[perm]

    X = _scale_to_pi(X)
    return {"name": "moons", "X": X, "y": y, "feature_dim": 2}


# ── Two blobs ───────────────────────────────────────────────────────────────
def blobs_dataset(n_per_class: int = 16, sep: float = 2.0, seed: int = 7) -> Dict[str, Any]:
    """Two well-separated Gaussian blobs in 2D (linear-separable baseline)."""
    rng = np.random.default_rng(seed)
    c1 = np.array([-sep / 2, 0])
    c2 = np.array([sep / 2, 0])
    X1 = c1 + 0.4 * rng.standard_normal(size=(n_per_class, 2))
    X2 = c2 + 0.4 * rng.standard_normal(size=(n_per_class, 2))
    X = np.vstack([X1, X2])
    y = np.concatenate([np.full(n_per_class, -1.0), np.full(n_per_class, 1.0)])
    perm = rng.permutation(2 * n_per_class)
    X = X[perm]
    y = y[perm]
    X = _scale_to_pi(X)
    return {"name": "blobs", "X": X, "y": y, "feature_dim": 2}


DATASET_REGISTRY: Dict[str, Any] = {
    "xor": lambda **_kw: xor_dataset(),
    "parity": lambda **_kw: parity_dataset(),
    "moons": moons_dataset,
    "blobs": blobs_dataset,
}
