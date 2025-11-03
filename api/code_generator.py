"""Code generators for exporting circuits to different frameworks.

Currently implements Qiskit code generation and provides placeholders for
Amazon Braket and OpenQASM.
"""
from __future__ import annotations


def generate_qiskit_code(num_qubits: int, num_classical: int, processed_steps: list[dict]) -> str:
    code = [
        "from qiskit import QuantumCircuit",
        "from qiskit_aer import AerSimulator",
        "",
        f"qc = QuantumCircuit({num_qubits}, {num_classical})",
        "",
    ]

    measure_ops: list[str] = []
    for step in processed_steps:
        gate_type = step["gateType"].upper()

        if gate_type == "MEASUREMENT":
            measure_ops.append(f"qc.measure({step['qubit']}, {step['classicalBit']})")
            continue

        if gate_type in ("RX", "RY", "RZ"):
            qubit = step["qubit"]
            theta = step.get("theta", 0.0)
            code.append(f"qc.{gate_type.lower()}({theta}, {qubit})")

        elif gate_type in ("H", "X", "Y", "Z", "S", "T"):
            qubit = step["qubit"]
            code.append(f"qc.{gate_type.lower()}({qubit})")

        elif gate_type == "SDG":
            code.append(f"qc.sdg({step['qubit']})")

        elif gate_type == "TDG":
            code.append(f"qc.tdg({step['qubit']})")

        elif gate_type == "CNOT":
            control = step["controls"][0]
            target = step["targets"][0]
            code.append(f"qc.cx({control}, {target})")

        elif gate_type == "CZ":
            control = step["controls"][0]
            target = step["targets"][0]
            code.append(f"qc.cz({control}, {target})")

        elif gate_type == "CCNOT":
            c1, c2 = step["controls"]
            target = step["targets"][0]
            code.append(f"qc.ccx({c1}, {c2}, {target})")

        elif gate_type == "SWAP":
            q1, q2 = step["targets"]
            code.append(f"qc.swap({q1}, {q2})")

    # Add measurements at the end if none specified explicitly
    if not measure_ops and num_classical > 0:
        code.append("\n# measure_all() is deprecated; measuring all qubits to all classical bits")
        code.append(f"qc.measure(list(range({num_qubits})), list(range({num_classical})))")
    else:
        code.extend(measure_ops)

    code.extend(
        [
            "",
            "# To run this circuit:",
            "simulator = AerSimulator()",
            "job = simulator.run(qc, shots=1000)",
            "result = job.result()",
            "counts = result.get_counts(qc)",
            "print(counts)",
        ]
    )
    return "\n".join(code)


def generate_braket_code(num_qubits: int, num_classical: int, processed_steps: list[dict]) -> str:
    # Placeholder for Amazon Braket generator
    return "# Amazon Braket code generation is not yet fully implemented."


def generate_openqasm_code(num_qubits: int, num_classical: int, processed_steps: list[dict]) -> str:
    # Placeholder for OpenQASM generator
    return "// OpenQASM 3.0 code generation is not yet fully implemented."
