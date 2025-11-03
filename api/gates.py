"""Quantum gate definitions using NumPy.

This module provides common single-qubit gates, parametric rotation gates,
and a 2-qubit CZ gate matrix, all using complex128 dtype for numerical stability.
"""
from __future__ import annotations

import numpy as np

# Use a consistent dtype for all gates
dtype = np.complex128

# Identity
I = np.array([[1, 0], [0, 1]], dtype=dtype)

# Pauli gates
X = np.array([[0, 1], [1, 0]], dtype=dtype)
Y = np.array([[0, -1j], [1j, 0]], dtype=dtype)
Z = np.array([[1, 0], [0, -1]], dtype=dtype)

# Hadamard
H = (np.array([[1, 1], [1, -1]], dtype=dtype) / np.sqrt(2.0))

# Phase gates
S = np.array([[1, 0], [0, 1j]], dtype=dtype)
SDG = np.array([[1, 0], [0, -1j]], dtype=dtype)  # S dagger
T = np.array([[1, 0], [0, np.exp(1j * np.pi / 4)]], dtype=dtype)
TDG = np.array([[1, 0], [0, np.exp(-1j * np.pi / 4)]], dtype=dtype)  # T dagger

# Parametric rotation gates

def RX(theta: float) -> np.ndarray:
    c = np.cos(theta / 2)
    s = np.sin(theta / 2)
    return np.array([[c, -1j * s], [-1j * s, c]], dtype=dtype)


def RY(theta: float) -> np.ndarray:
    c = np.cos(theta / 2)
    s = np.sin(theta / 2)
    return np.array([[c, -s], [s, c]], dtype=dtype)


def RZ(theta: float) -> np.ndarray:
    return np.array(
        [[np.exp(-1j * theta / 2), 0], [0, np.exp(1j * theta / 2)]], dtype=dtype
    )

# 2-qubit controlled-Z (useful for reference/decomposition)
CZ = np.array(
    [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, -1],
    ],
    dtype=dtype,
)

__all__ = [
    "dtype",
    "I",
    "X",
    "Y",
    "Z",
    "H",
    "S",
    "SDG",
    "T",
    "TDG",
    "RX",
    "RY",
    "RZ",
    "CZ",
]
