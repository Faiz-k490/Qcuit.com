"""Tiny deterministic datasets for QNN lessons and smoke tests."""

from __future__ import annotations

from typing import Any, Dict

import numpy as np


def _scale_to_pi(X: np.ndarray) -> np.ndarray:
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


def xor_dataset() -> Dict[str, Any]:
    """Return a duplicated, lightly jittered XOR dataset."""
    base_x = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
    base_y = np.array([-1, 1, 1, -1], dtype=float)
    rng = np.random.default_rng(0)
    X = np.tile(base_x, (4, 1)) + rng.normal(scale=0.05, size=(16, 2))
    y = np.tile(base_y, 4)
    return {"name": "xor", "X": _scale_to_pi(X), "y": y, "feature_dim": 2}


def parity_dataset() -> Dict[str, Any]:
    """Return all 3-bit inputs labelled by parity."""
    bits = np.array([[(i >> 2) & 1, (i >> 1) & 1, i & 1] for i in range(8)], dtype=float)
    y = np.array([(-1 if (sum(row) % 2 == 0) else 1) for row in bits], dtype=float)
    return {"name": "parity", "X": _scale_to_pi(bits), "y": y, "feature_dim": 3}


def moons_dataset(n_per_class: int = 20, noise: float = 0.10, seed: int = 7) -> Dict[str, Any]:
    """Return a small deterministic two-moons dataset without sklearn."""
    rng = np.random.default_rng(seed)
    t1 = np.linspace(0, np.pi, n_per_class)
    x1 = np.stack([np.cos(t1), np.sin(t1)], axis=1)
    t2 = np.linspace(0, np.pi, n_per_class)
    x2 = np.stack([1 - np.cos(t2), 0.5 - np.sin(t2)], axis=1)
    X = np.vstack([x1, x2]) + rng.normal(scale=noise, size=(2 * n_per_class, 2))
    y = np.concatenate([np.full(n_per_class, -1.0), np.full(n_per_class, 1.0)])
    perm = rng.permutation(2 * n_per_class)
    return {"name": "moons", "X": _scale_to_pi(X[perm]), "y": y[perm], "feature_dim": 2}


def blobs_dataset(n_per_class: int = 16, sep: float = 2.0, seed: int = 7) -> Dict[str, Any]:
    """Return two linearly separable Gaussian blobs."""
    rng = np.random.default_rng(seed)
    c1 = np.array([-sep / 2, 0])
    c2 = np.array([sep / 2, 0])
    X1 = c1 + 0.4 * rng.standard_normal(size=(n_per_class, 2))
    X2 = c2 + 0.4 * rng.standard_normal(size=(n_per_class, 2))
    X = np.vstack([X1, X2])
    y = np.concatenate([np.full(n_per_class, -1.0), np.full(n_per_class, 1.0)])
    perm = rng.permutation(2 * n_per_class)
    return {"name": "blobs", "X": _scale_to_pi(X[perm]), "y": y[perm], "feature_dim": 2}


DATASET_REGISTRY: Dict[str, Any] = {
    "xor": lambda **_kw: xor_dataset(),
    "parity": lambda **_kw: parity_dataset(),
    "moons": moons_dataset,
    "blobs": blobs_dataset,
}
