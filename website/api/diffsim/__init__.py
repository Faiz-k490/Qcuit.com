"""
api.diffsim — Differentiable simulator (Phase 5, Pillar C).

Public surface:

    parameter_shift_gradient(circuit_fn, params, observable, *, seed=0)
    Adam(...), SGD(...)
    Hamiltonian.from_string(...)
    vqe_h2_hamiltonian(), qaoa_maxcut_hamiltonian(graph), bloch_state_fit_target()

The submodule ``api.diffsim`` is the Flask-side adapter; the bit-identical
reference implementation lives in :mod:`qcuit.diff` so notebooks reproduce
offline.
"""

from .parameter_shift import expectation, parameter_shift_gradient, finite_difference_gradient
from .observables import Hamiltonian, vqe_h2_hamiltonian, qaoa_maxcut_hamiltonian, bloch_state_fit_target
from .optimizer import SGD, Adam, train
from .circuits import real_amplitudes_ansatz, hardware_efficient_ansatz, single_qubit_rotation
from .presets import vqe_h2_preset, qaoa_maxcut_preset, bloch_state_fit_preset, PRESET_REGISTRY

__all__ = [
    "expectation",
    "parameter_shift_gradient",
    "finite_difference_gradient",
    "Hamiltonian",
    "vqe_h2_hamiltonian",
    "qaoa_maxcut_hamiltonian",
    "bloch_state_fit_target",
    "SGD",
    "Adam",
    "train",
    "real_amplitudes_ansatz",
    "hardware_efficient_ansatz",
    "single_qubit_rotation",
    "vqe_h2_preset",
    "qaoa_maxcut_preset",
    "bloch_state_fit_preset",
    "PRESET_REGISTRY",
]
