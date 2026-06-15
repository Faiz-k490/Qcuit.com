"""Pre-built QNN configurations."""

from __future__ import annotations

from typing import Any, Dict

import numpy as np

from .ansatze import hardware_efficient_ansatz, real_amplitudes_ansatz
from .datasets import moons_dataset, parity_dataset, xor_dataset
from .encoders import angle_encoder, zz_feature_map
from .models import QNNModel


def _init_theta(num_params: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return rng.uniform(-np.pi, np.pi, size=num_params)


def xor_preset(seed: int = 42) -> Dict[str, Any]:
    """Return a two-qubit XOR QNN preset."""
    encoder = angle_encoder(num_qubits=2)
    ansatz = real_amplitudes_ansatz(num_qubits=2, layers=3)
    return {
        "name": "xor",
        "encoder": encoder,
        "ansatz": ansatz,
        "model": QNNModel(encoder=encoder, ansatz=ansatz),
        "dataset": xor_dataset(),
        "init_theta": _init_theta(ansatz.num_params, seed),
        "optimizer_config": {"type": "adam", "lr": 0.15},
        "max_iter": 25,
        "seed": seed,
    }


def parity_preset(seed: int = 42) -> Dict[str, Any]:
    """Return a three-qubit parity QNN preset."""
    encoder = angle_encoder(num_qubits=3)
    ansatz = real_amplitudes_ansatz(num_qubits=3, layers=3)
    return {
        "name": "parity",
        "encoder": encoder,
        "ansatz": ansatz,
        "model": QNNModel(encoder=encoder, ansatz=ansatz),
        "dataset": parity_dataset(),
        "init_theta": _init_theta(ansatz.num_params, seed),
        "optimizer_config": {"type": "adam", "lr": 0.15},
        "max_iter": 30,
        "seed": seed,
    }


def moons_preset(seed: int = 42) -> Dict[str, Any]:
    """Return a two-moons QNN preset."""
    encoder = zz_feature_map(num_qubits=2, reps=1)
    ansatz = hardware_efficient_ansatz(num_qubits=2, layers=2)
    return {
        "name": "moons",
        "encoder": encoder,
        "ansatz": ansatz,
        "model": QNNModel(encoder=encoder, ansatz=ansatz),
        "dataset": moons_dataset(n_per_class=12, seed=seed),
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
