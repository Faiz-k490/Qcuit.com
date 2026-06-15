"""Torch/PennyLane quantum layers for hybrid HEP models."""

from __future__ import annotations

import math
from typing import Any

from qcuit._optional import missing_extra


def _torch():
    try:
        import torch
        from torch import nn
    except ImportError as exc:
        raise missing_extra("torch", "hep", "Qcuit quantum layers") from exc
    return torch, nn


def _has_pennylane() -> bool:
    try:
        import pennylane  # noqa: F401
    except ImportError:
        return False
    return True


def entangling_layer(qml: Any, n_qubits: int) -> None:
    """Apply the staggered CNOT pattern used in the Lie-EQGNN circuits."""
    for i in range(0, n_qubits - 1, 2):
        qml.CNOT(wires=[i, i + 1])
    for i in range(1, n_qubits - 1, 2):
        qml.CNOT(wires=[i, i + 1])


class DressedQuantumLayer(_torch()[1].Module):
    """A small variational circuit wrapped as a Torch module.

    ``backend="pennylane"`` uses a real PennyLane qnode.  ``backend="torch"``
    is a differentiable Torch surrogate with the same input/output shape for
    fast tests and CPU-only prototyping.  ``backend="auto"`` chooses PennyLane
    when installed, otherwise Torch.
    """

    def __init__(
        self,
        n_qubits: int,
        *,
        depth: int = 1,
        delta: float = 0.001,
        backend: str = "auto",
        device_name: str = "default.qubit",
    ) -> None:
        torch, nn = _torch()
        super().__init__()
        if n_qubits < 1:
            raise ValueError("n_qubits must be >= 1")
        self.n_qubits = int(n_qubits)
        self.depth = int(depth)
        self.backend = "pennylane" if backend == "auto" and _has_pennylane() else ("torch" if backend == "auto" else backend)
        self.device_name = device_name
        self.q_params = nn.Parameter(delta * torch.randn(self.depth, self.n_qubits))
        self._qnode = None

    def _forward_torch(self, input_features: Any):
        torch, _ = _torch()
        x = torch.tanh(input_features) * math.pi / 2.0
        state = x
        for layer in range(self.depth):
            left = torch.roll(state, shifts=1, dims=-1)
            right = torch.roll(state, shifts=-1, dims=-1)
            state = state + self.q_params[layer] + 0.25 * (left + right)
        return torch.cos(state)

    def _build_qnode(self):
        try:
            import pennylane as qml
        except ImportError as exc:
            raise missing_extra("pennylane", "qml", "PennyLane quantum layers") from exc

        dev = qml.device(self.device_name, wires=self.n_qubits)

        @qml.qnode(dev, interface="torch")
        def circuit(features, weights):
            for wire in range(self.n_qubits):
                qml.Hadamard(wires=wire)
            for wire, value in enumerate(features):
                qml.RY(value, wires=wire)
            for depth_index in range(self.depth):
                entangling_layer(qml, self.n_qubits)
                for wire in range(self.n_qubits):
                    qml.RY(weights[depth_index, wire], wires=wire)
            return tuple(qml.expval(qml.PauliZ(wire)) for wire in range(self.n_qubits))

        self._qnode = circuit
        return circuit

    def _forward_pennylane(self, input_features: Any):
        torch, _ = _torch()
        qnode = self._qnode or self._build_qnode()
        outputs = []
        for elem in input_features:
            result = qnode(elem, self.q_params)
            if self.n_qubits == 1:
                result = (result,)
            outputs.append(torch.hstack(result).float())
        return torch.stack(outputs, dim=0).to(input_features.device)

    def forward(self, input_features: Any):
        if input_features.shape[-1] != self.n_qubits:
            raise ValueError(
                f"expected last input dimension {self.n_qubits}, got {input_features.shape[-1]}"
            )
        if self.backend == "torch":
            return self._forward_torch(input_features)
        if self.backend == "pennylane":
            return self._forward_pennylane(input_features)
        raise ValueError("backend must be 'auto', 'torch', or 'pennylane'")
