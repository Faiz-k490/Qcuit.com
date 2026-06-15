"""Pre-built differentiable training presets."""

from __future__ import annotations

from typing import Any, Dict

import numpy as np

from .circuits import hardware_efficient_ansatz, real_amplitudes_ansatz, single_qubit_rotation
from .observables import bloch_state_fit_target, qaoa_maxcut_hamiltonian, vqe_h2_hamiltonian


def vqe_h2_preset(seed: int = 42) -> Dict[str, Any]:
    """Return a VQE-H2 preset with a real-amplitudes ansatz."""
    num_qubits = 4
    layers = 3
    circuit_fn, num_params = real_amplitudes_ansatz(num_qubits, layers)
    rng = np.random.default_rng(seed)
    return {
        "ansatz_name": "real_amplitudes",
        "ansatz_kwargs": {"num_qubits": num_qubits, "layers": layers},
        "circuit_fn": circuit_fn,
        "num_params": int(num_params),
        "init_params": rng.uniform(-np.pi, np.pi, size=num_params),
        "observable": vqe_h2_hamiltonian(),
        "num_qubits": num_qubits,
        "optimizer_config": {"type": "adam", "lr": 0.05},
        "max_iter": 60,
        "seed": seed,
    }


def qaoa_maxcut_preset(seed: int = 42) -> Dict[str, Any]:
    """Return a small MaxCut trainer preset for a 4-cycle graph."""
    num_qubits = 4
    layers = 2
    circuit_fn, num_params = hardware_efficient_ansatz(num_qubits, layers)
    rng = np.random.default_rng(seed)
    return {
        "ansatz_name": "hardware_efficient",
        "ansatz_kwargs": {"num_qubits": num_qubits, "layers": layers},
        "circuit_fn": circuit_fn,
        "num_params": int(num_params),
        "init_params": rng.uniform(-np.pi, np.pi, size=num_params),
        "observable": qaoa_maxcut_hamiltonian(
            edges=[(0, 1), (1, 2), (2, 3), (3, 0)],
            num_qubits=num_qubits,
        ),
        "num_qubits": num_qubits,
        "optimizer_config": {"type": "adam", "lr": 0.05},
        "max_iter": 40,
        "seed": seed,
    }


def bloch_state_fit_preset(seed: int = 42) -> Dict[str, Any]:
    """Return a one-qubit state-fitting preset."""
    num_qubits = 1
    circuit_fn, num_params = single_qubit_rotation()
    rng = np.random.default_rng(seed)
    return {
        "ansatz_name": "single_qubit_rotation",
        "ansatz_kwargs": {"num_qubits": num_qubits},
        "circuit_fn": circuit_fn,
        "num_params": int(num_params),
        "init_params": rng.uniform(-np.pi, np.pi, size=num_params),
        "observable": bloch_state_fit_target(),
        "num_qubits": num_qubits,
        "optimizer_config": {"type": "sgd", "lr": 0.5},
        "max_iter": 30,
        "seed": seed,
    }


PRESET_REGISTRY: Dict[str, Any] = {
    "vqe_h2": vqe_h2_preset,
    "qaoa_maxcut": qaoa_maxcut_preset,
    "bloch_state_fit": bloch_state_fit_preset,
}
