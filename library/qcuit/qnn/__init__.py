"""Quantum neural network helpers for Qcuit notebooks and labs."""

from __future__ import annotations

from qcuit.models import LieEQGNN, LorentzNet, QLieGEB
from qcuit.quantum import DressedQuantumLayer

from .ansatze import ANSATZ_REGISTRY, Ansatz, hardware_efficient_ansatz, real_amplitudes_ansatz
from .datasets import DATASET_REGISTRY, blobs_dataset, moons_dataset, parity_dataset, xor_dataset
from .encoders import ENCODER_REGISTRY, Encoder, amplitude_encoder, angle_encoder, zz_feature_map
from .exports import to_pennylane, to_qiskit_ml
from .models import QNNModel, qnn_train
from .presets import PRESET_REGISTRY, moons_preset, parity_preset, xor_preset

__all__ = [
    "Encoder",
    "angle_encoder",
    "amplitude_encoder",
    "zz_feature_map",
    "ENCODER_REGISTRY",
    "Ansatz",
    "real_amplitudes_ansatz",
    "hardware_efficient_ansatz",
    "ANSATZ_REGISTRY",
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
    "DressedQuantumLayer",
    "LieEQGNN",
    "LorentzNet",
    "QLieGEB",
]
