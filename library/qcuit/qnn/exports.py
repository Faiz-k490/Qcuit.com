"""Code exporters for QNN models."""

from __future__ import annotations

from textwrap import dedent

import numpy as np

from .models import QNNModel


def _format_param_array(theta: np.ndarray) -> str:
    return "[" + ", ".join(f"{float(value):.6f}" for value in theta) + "]"


def to_pennylane(model: QNNModel, theta: np.ndarray) -> str:
    """Emit a PennyLane snippet for a trained QNN model."""
    n = model.num_qubits
    encoder_name = model.encoder.name
    is_real = model.ansatz.name.startswith("real_amplitudes")
    denom = n if is_real else 3 * n
    layers = max(1, model.ansatz.num_params // denom)

    if is_real:
        ansatz_block = dedent(
            f"""
            for layer in range({layers}):
                for q in range({n}):
                    qml.RY(theta[layer * {n} + q], wires=q)
                if layer < {layers - 1}:
                    for q in range({n} - 1):
                        qml.CNOT(wires=[q, q + 1])
            """
        ).strip()
    else:
        ansatz_block = dedent(
            f"""
            idx = 0
            for _layer in range({layers}):
                for q in range({n}):
                    qml.RZ(theta[idx], wires=q); idx += 1
                    qml.RY(theta[idx], wires=q); idx += 1
                    qml.RZ(theta[idx], wires=q); idx += 1
                for q in range({n}):
                    qml.CNOT(wires=[q, (q + 1) % {n}])
            """
        ).strip()

    if encoder_name == "angle":
        encoder_block = f"for q in range({n}): qml.RY(np.pi * x[q], wires=q)"
    elif encoder_name == "amplitude":
        encoder_block = f"qml.AmplitudeEmbedding(x, wires=range({n}), normalize=True)"
    else:
        encoder_block = dedent(
            f"""
            for q in range({n}): qml.Hadamard(wires=q)
            for q in range({n}): qml.RZ(2.0 * x[q], wires=q)
            for q1 in range({n}):
                for q2 in range(q1 + 1, {n}):
                    qml.CNOT(wires=[q1, q2])
                    qml.RZ(2.0 * (np.pi - x[q1]) * (np.pi - x[q2]), wires=q2)
                    qml.CNOT(wires=[q1, q2])
            """
        ).strip()

    return dedent(
        f"""
        import numpy as np
        import pennylane as qml

        dev = qml.device("default.qubit", wires={n})
        theta = np.array({_format_param_array(np.asarray(theta, dtype=float))})

        @qml.qnode(dev)
        def circuit(x, theta):
            {encoder_block}
            {ansatz_block}
            return qml.expval(qml.PauliZ(0))
        """
    ).strip() + "\n"


def to_qiskit_ml(model: QNNModel, theta: np.ndarray) -> str:
    """Emit a Qiskit Machine Learning snippet for a trained QNN model."""
    n = model.num_qubits
    encoder_name = model.encoder.name
    is_real = model.ansatz.name.startswith("real_amplitudes")
    layers = max(1, model.ansatz.num_params // (n if is_real else 3 * n))

    if encoder_name == "angle":
        feature_map_line = (
            "from qiskit.circuit.library import PauliFeatureMap\n"
            f"feature_map = PauliFeatureMap(feature_dimension={model.feature_dim}, reps=1, paulis=['Y'])"
        )
    elif encoder_name == "zz_feature_map":
        feature_map_line = (
            "from qiskit.circuit.library import ZZFeatureMap\n"
            f"feature_map = ZZFeatureMap(feature_dimension={model.feature_dim}, reps=1)"
        )
    else:
        feature_map_line = (
            "from qiskit import QuantumCircuit\n"
            f"feature_map = QuantumCircuit({n})  # add initialize() per sample for amplitude encoding"
        )

    if is_real:
        ansatz_line = (
            "from qiskit.circuit.library import RealAmplitudes\n"
            f"ansatz = RealAmplitudes(num_qubits={n}, reps={max(1, layers - 1)})"
        )
    else:
        ansatz_line = (
            "from qiskit.circuit.library import EfficientSU2\n"
            f"ansatz = EfficientSU2(num_qubits={n}, reps={max(1, layers)}, entanglement='circular')"
        )

    return dedent(
        f"""
        import numpy as np

        {feature_map_line}
        {ansatz_line}

        from qiskit_machine_learning.neural_networks import EstimatorQNN
        from qiskit.primitives import Estimator

        qnn = EstimatorQNN(
            circuit=feature_map.compose(ansatz),
            input_params=feature_map.parameters,
            weight_params=ansatz.parameters,
            estimator=Estimator(),
        )

        theta = np.array({_format_param_array(np.asarray(theta, dtype=float))})
        """
    ).strip() + "\n"
