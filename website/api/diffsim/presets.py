"""
Pre-built training configurations for the Trainer panel.

Each preset function returns a ``dict`` containing everything the training
loop needs:

    ansatz_name, circuit_fn, num_params, init_params, observable,
    num_qubits, optimizer_config, max_iter

The ``optimizer_config`` sub-dict is JSON-friendly (``{"type": "adam", ...}``)
so the route layer can echo it back to the frontend without touching the
actual optimizer objects.
"""

from __future__ import annotations

from typing import Dict, Any

import numpy as np

from .circuits import real_amplitudes_ansatz, hardware_efficient_ansatz, single_qubit_rotation
from .observables import vqe_h2_hamiltonian, qaoa_maxcut_hamiltonian, bloch_state_fit_target


# ── Preset: VQE H₂ ──────────────────────────────────────────────────────────
def vqe_h2_preset(seed: int = 42) -> Dict[str, Any]:
    """Real-amplitudes ansatz on the 4-qubit H₂ Hamiltonian.

    Optimizer: Adam(lr=0.05), 60 iterations.
    """
    num_qubits = 4
    layers = 3
    circuit_fn, num_params = real_amplitudes_ansatz(num_qubits, layers)
    rng = np.random.default_rng(seed)
    init_params = rng.uniform(-np.pi, np.pi, size=num_params)
    observable = vqe_h2_hamiltonian()

    return {
        "ansatz_name": "real_amplitudes",
        "ansatz_kwargs": {"num_qubits": num_qubits, "layers": layers},
        "circuit_fn": circuit_fn,
        "num_params": int(num_params),
        "init_params": init_params,
        "observable": observable,
        "num_qubits": num_qubits,
        "optimizer_config": {"type": "adam", "lr": 0.05},
        "max_iter": 60,
        "seed": seed,
    }


# ── Preset: QAOA MaxCut ─────────────────────────────────────────────────────
def qaoa_maxcut_preset(seed: int = 42) -> Dict[str, Any]:
    """Hardware-efficient ansatz on a 4-cycle MaxCut Hamiltonian.

    Optimizer: Adam(lr=0.05), 40 iterations.
    """
    num_qubits = 4
    layers = 2
    circuit_fn, num_params = hardware_efficient_ansatz(num_qubits, layers)
    rng = np.random.default_rng(seed)
    init_params = rng.uniform(-np.pi, np.pi, size=num_params)
    edges = [(0, 1), (1, 2), (2, 3), (3, 0)]
    observable = qaoa_maxcut_hamiltonian(edges=edges, num_qubits=num_qubits)

    return {
        "ansatz_name": "hardware_efficient",
        "ansatz_kwargs": {"num_qubits": num_qubits, "layers": layers},
        "circuit_fn": circuit_fn,
        "num_params": int(num_params),
        "init_params": init_params,
        "observable": observable,
        "num_qubits": num_qubits,
        "optimizer_config": {"type": "adam", "lr": 0.05},
        "max_iter": 40,
        "seed": seed,
    }


# ── Preset: Bloch state fit ─────────────────────────────────────────────────
def bloch_state_fit_preset(seed: int = 42) -> Dict[str, Any]:
    """Single-qubit rotation fitting ⟨Z⟩ → −1 (driving toward |1⟩).

    Optimizer: SGD(lr=0.5), 30 iterations.
    """
    num_qubits = 1
    circuit_fn, num_params = single_qubit_rotation()
    rng = np.random.default_rng(seed)
    init_params = rng.uniform(-np.pi, np.pi, size=num_params)
    observable = bloch_state_fit_target()

    return {
        "ansatz_name": "single_qubit_rotation",
        "ansatz_kwargs": {"num_qubits": num_qubits},
        "circuit_fn": circuit_fn,
        "num_params": int(num_params),
        "init_params": init_params,
        "observable": observable,
        "num_qubits": num_qubits,
        "optimizer_config": {"type": "sgd", "lr": 0.5},
        "max_iter": 30,
        "seed": seed,
    }


# ── Registry for easy lookup by name ────────────────────────────────────────
PRESET_REGISTRY: Dict[str, Any] = {
    "vqe_h2": vqe_h2_preset,
    "qaoa_maxcut": qaoa_maxcut_preset,
    "bloch_state_fit": bloch_state_fit_preset,
}
