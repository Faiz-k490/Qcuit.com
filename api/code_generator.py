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
    code: list[str] = [
        "from braket.circuits import Circuit",
        "",
        "c = Circuit()",
        "",
    ]

    for step in processed_steps:
        gate_type = step["gateType"].upper()

        if gate_type == "MEASUREMENT":
            # Braket measurements are typically specified at the end.
            code.append(
                f"# Measure q[{step['qubit']}] to c[{step['classicalBit']}]"
            )
            continue

        if gate_type in ("RX", "RY", "RZ"):
            qubit = step["qubit"]
            theta = step.get("theta", 0.0)
            code.append(f"c.{gate_type.lower()}({qubit}, {theta})")

        elif gate_type in ("H", "X", "Y", "Z", "S", "T"):
            qubit = step["qubit"]
            code.append(f"c.{gate_type.lower()}({qubit})")

        elif gate_type == "SDG":
            code.append(f"c.si({step['qubit']})")  # Inverse S gate

        elif gate_type == "TDG":
            code.append(f"c.ti({step['qubit']})")  # Inverse T gate

        elif gate_type == "CNOT":
            control = step["controls"][0]
            target = step["targets"][0]
            code.append(f"c.cnot({control}, {target})")

        elif gate_type == "CZ":
            control = step["controls"][0]
            target = step["targets"][0]
            code.append(f"c.cz({control}, {target})")

        elif gate_type == "CCNOT":
            c1, c2 = step["controls"]
            target = step["targets"][0]
            code.append(f"c.ccnot({c1}, {c2}, {target})")

        elif gate_type == "SWAP":
            q1, q2 = step["targets"]
            code.append(f"c.swap({q1}, {q2})")

    code.append("\n# Add measurements (if any)")
    measured_qubits = [s["qubit"] for s in processed_steps if s["gateType"].upper() == "MEASUREMENT"]
    if not measured_qubits:
        code.append("# No explicit measurements; add measure_all()")
        code.append("c.measure_all()")
    else:
        for q in sorted(set(measured_qubits)):
            code.append(f"c.measure({q})")

    code.extend(
        [
            "\n# To run this circuit:",
            "# from braket.devices import LocalSimulator",
            "# device = LocalSimulator()",
            "# result = device.run(c, shots=1000).result()",
            "# counts = result.measurement_counts",
            "# print(counts)",
        ]
    )
    return "\n".join(code)


def generate_openqasm_code(num_qubits: int, num_classical: int, processed_steps: list[dict]) -> str:
    code: list[str] = [
        "OPENQASM 3.0;",
        "include \"stdgates.inc\";",
        "",
        f"qubit[{num_qubits}] q;",
        f"bit[{num_classical}] c;",
        "",
    ]

    for step in processed_steps:
        gate_type = step["gateType"].upper()

        if gate_type == "MEASUREMENT":
            code.append(f"c[{step['classicalBit']}] = measure q[{step['qubit']}];")
            continue

        if gate_type in ("RX", "RY", "RZ"):
            qubit = step["qubit"]
            theta = step.get("theta", 0.0)
            code.append(f"{gate_type.lower()}({theta}) q[{qubit}];")

        elif gate_type in ("H", "X", "Y", "Z", "S", "T"):
            qubit = step["qubit"]
            code.append(f"{gate_type.lower()} q[{qubit}];")

        elif gate_type == "SDG":
            code.append(f"sdg q[{step['qubit']}];")

        elif gate_type == "TDG":
            code.append(f"tdg q[{step['qubit']}];")

        elif gate_type == "CNOT":
            control = step["controls"][0]
            target = step["targets"][0]
            code.append(f"cx q[{control}], q[{target}];")

        elif gate_type == "CZ":
            control = step["controls"][0]
            target = step["targets"][0]
            code.append(f"cz q[{control}], q[{target}];")

        elif gate_type == "CCNOT":
            c1, c2 = step["controls"]
            target = step["targets"][0]
            code.append(f"ccx q[{c1}], q[{c2}], q[{target}];")

        elif gate_type == "SWAP":
            q1, q2 = step["targets"]
            code.append(f"swap q[{q1}], q[{q2}];")

    return "\n".join(code)
