"""
Pre-built QNN configurations for the QML Lab QNN panel.

Each preset returns a ``dict`` containing everything needed for training
and exports:

    encoder:        Encoder
    ansatz:         Ansatz
    model:          QNNModel
    dataset:        {name, X, y, feature_dim}
    init_theta:     np.ndarray
    optimizer_config: {"type": "adam", "lr": 0.1}
    max_iter:       int
    seed:           int

The route layer exposes a JSON-serialisable subset (no callables) under
the ``/api/qnn/preset`` endpoint.
"""

from __future__ import annotations

from typing import Dict, Any

import numpy as np

from .ansatze import real_amplitudes_ansatz, hardware_efficient_ansatz
from .datasets import xor_dataset, parity_dataset, moons_dataset
from .encoders import angle_encoder, zz_feature_map
from .models import QNNModel


def _init_theta(num_params: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.uniform(-np.pi, np.pi, size=num_params)


# ── Preset: XOR (2 qubits, angle encoder, real amplitudes) ──────────────────
def xor_preset(seed: int = 42) -> Dict[str, Any]:
    encoder = angle_encoder(num_qubits=2)
    ansatz = real_amplitudes_ansatz(num_qubits=2, layers=3)
    model = QNNModel(encoder=encoder, ansatz=ansatz)
    dataset = xor_dataset()
    return {
        "name": "xor",
        "encoder": encoder,
        "ansatz": ansatz,
        "model": model,
        "dataset": dataset,
        "init_theta": _init_theta(ansatz.num_params, seed),
        "optimizer_config": {"type": "adam", "lr": 0.15},
        "max_iter": 25,
        "seed": seed,
    }


# ── Preset: Parity (3 qubits, angle encoder, hardware-efficient) ────────────
def parity_preset(seed: int = 42) -> Dict[str, Any]:
    encoder = angle_encoder(num_qubits=3)
    ansatz = real_amplitudes_ansatz(num_qubits=3, layers=3)
    model = QNNModel(encoder=encoder, ansatz=ansatz)
    dataset = parity_dataset()
    return {
        "name": "parity",
        "encoder": encoder,
        "ansatz": ansatz,
        "model": model,
        "dataset": dataset,
        "init_theta": _init_theta(ansatz.num_params, seed),
        "optimizer_config": {"type": "adam", "lr": 0.15},
        "max_iter": 30,
        "seed": seed,
    }


# ── Preset: Moons (2 qubits, ZZ feature map, hardware-efficient) ────────────
def moons_preset(seed: int = 42) -> Dict[str, Any]:
    encoder = zz_feature_map(num_qubits=2, reps=1)
    ansatz = hardware_efficient_ansatz(num_qubits=2, layers=2)
    model = QNNModel(encoder=encoder, ansatz=ansatz)
    dataset = moons_dataset(n_per_class=12, seed=seed)  # 24 samples for speed
    return {
        "name": "moons",
        "encoder": encoder,
        "ansatz": ansatz,
        "model": model,
        "dataset": dataset,
        "init_theta": _init_theta(ansatz.num_params, seed),
        "optimizer_config": {"type": "adam", "lr": 0.10},
        "max_iter": 20,
        "seed": seed,
    }


PRESET_REGISTRY: Dict[str, Any] = {
    "xor": xor_preset,
    "parity": parity_preset,
    "moons": moons_preset,
}
