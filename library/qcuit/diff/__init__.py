"""Differentiable quantum training utilities for standalone Qcuit.

This module is intentionally dependency-light: NumPy only, small statevectors,
and explicit parameter-shift gradients. It backs the QML Lab trainer examples
while staying usable from a normal pip-installed package.
"""

from __future__ import annotations

from .circuits import hardware_efficient_ansatz, real_amplitudes_ansatz, single_qubit_rotation
from .observables import (
    Hamiltonian,
    bloch_state_fit_target,
    qaoa_maxcut_hamiltonian,
    vqe_h2_hamiltonian,
)
from .optimizer import Adam, SGD, train
from .parameter_shift import expectation, finite_difference_gradient, parameter_shift_gradient
from .presets import PRESET_REGISTRY, bloch_state_fit_preset, qaoa_maxcut_preset, vqe_h2_preset

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
