"""
api.qnn — Quantum Neural Network primitives (Phase 6, Pillar D).

Public surface:

    Encoders:    angle_encoder, amplitude_encoder, zz_feature_map
    Ansätze:     real_amplitudes_ansatz, hardware_efficient_ansatz
    Datasets:    xor_dataset, parity_dataset, moons_dataset, blobs_dataset
    Model:       QNNModel — combines encoder + ansatz + observable into a
                 classifier with a parameter-shift gradient.
    Training:    qnn_train(...) yields per-iteration {iter, loss, accuracy, ...}
    Export:      to_pennylane(model), to_qiskit_ml(model)
    Presets:     parity_preset, xor_preset, moons_preset, PRESET_REGISTRY

The reference implementation lives here; ``qcuit.qnn`` re-exports it so
notebooks can run offline.
"""

from __future__ import annotations

from .encoders import (
    angle_encoder,
    amplitude_encoder,
    zz_feature_map,
    Encoder,
)
from .ansatze import (
    real_amplitudes_ansatz,
    hardware_efficient_ansatz,
    Ansatz,
)
from .datasets import (
    xor_dataset,
    parity_dataset,
    moons_dataset,
    blobs_dataset,
    DATASET_REGISTRY,
)
from .models import QNNModel, qnn_train
from .exports import to_pennylane, to_qiskit_ml
from .presets import (
    xor_preset,
    parity_preset,
    moons_preset,
    PRESET_REGISTRY,
)

__all__ = [
    "Encoder",
    "angle_encoder",
    "amplitude_encoder",
    "zz_feature_map",
    "Ansatz",
    "real_amplitudes_ansatz",
    "hardware_efficient_ansatz",
    "xor_dataset",
    "parity_dataset",
    "moons_dataset",
    "blobs_dataset",
    "DATASET_REGISTRY",
    "QNNModel",
    "qnn_train",
    "to_pennylane",
    "to_qiskit_ml",
    "xor_preset",
    "parity_preset",
    "moons_preset",
    "PRESET_REGISTRY",
]
