"""
qcuit/backend.py - Qiskit Translation & Simulation Engine

This is the "engine room" of qcuit.  The user never touches this file
directly.  Instead, they build a Circuit with friendly qcuit syntax and
call ``run_simulation()``.  This module then:

    1. Maps each named Qubit to a Qiskit integer index.
    2. Translates each Apply operation into the equivalent Qiskit gate call.
    3. Adds measurements if ``measure_all()`` was called.
    4. Executes the circuit on Qiskit's AerSimulator.
    5. Returns clean, readable measurement counts.

Architecture diagram::

    User code (qcuit)          This module             Qiskit
    -----------------     -------------------     ---------------
    Qubit("a")       -->  qubit_map["a"] = 0  --> QuantumCircuit(2,2)
    Apply(Hadamard)  -->  qc.h(0)             --> AerSimulator
    Apply(CNOT)      -->  qc.cx(0, 1)         --> run() --> counts
"""

from __future__ import annotations

from typing import Dict

# Qiskit imports - these are the only external dependencies of the library.
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

# Internal imports
from qcuit.core import Circuit, QcuitError
from qcuit.gates import Apply, CNOT, Hadamard, PauliX


def run_simulation(circuit_instance: Circuit, shots: int = 1024) -> Dict[str, int]:
    """Translate a qcuit Circuit into Qiskit and run it on the AerSimulator.

    In plain English:
        This is the function that actually *runs* your quantum program.
        You hand it a finished Circuit (with gates and measurements added)
        and it gives you back a dictionary of results showing how many
        times each outcome was observed.

    How it works (step by step):
        1. Each of your named qubits gets assigned a numeric index
           (Qiskit uses integers, not names).
        2. Each gate you added via ``Apply`` gets translated into the
           matching Qiskit gate method (``qc.h``, ``qc.x``, ``qc.cx``).
        3. If you called ``measure_all()``, measurement gates are appended.
        4. The circuit is executed on a local simulator for ``shots``
           repetitions (default 1024).
        5. The raw Qiskit counts dictionary is returned.

    Args:
        circuit_instance: A fully-built ``Circuit`` object with gates and
                          (ideally) ``measure_all()`` called.
        shots:            Number of times to run the simulation (default
                          1024).  More shots = more statistical accuracy.

    Returns:
        A dictionary mapping bitstring outcomes to their observed counts.
        Example: ``{"00": 512, "11": 512}``

    Raises:
        QcuitError: If the circuit has no operations, or if measurement
                    was not flagged.

    Example::

        from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
        from qcuit.backend import run_simulation

        a, b = Qubit("a"), Qubit("b")
        circ = Circuit(a, b)
        circ.add(Apply(Hadamard, target=a))
        circ.add(Apply(CNOT, target=b, control=a))
        circ.measure_all()

        results = run_simulation(circ)
        print(results)  # e.g. {"00": 507, "11": 517}
    """

    # ===================================================================
    # STEP 1 : Validate the circuit before we do any Qiskit work.
    # ===================================================================

    if len(circuit_instance._operations) == 0:
        raise QcuitError(
            "Your circuit has no operations.  Add some gates first!\n"
            "  Try: circ.add(Apply(Hadamard, target=my_qubit))"
        )

    if not circuit_instance._measure:
        raise QcuitError(
            "You forgot to call measure_all() on your circuit.\n"
            "  Without measurement, the simulator has nothing to report.\n"
            "  Try: circ.measure_all()"
        )

    # ===================================================================
    # STEP 2 : Build the qubit-index map.
    # ===================================================================
    # Qiskit addresses qubits by integer index (0, 1, 2, ...).
    # We map each qcuit Qubit object to an index based on the order
    # the user passed them into Circuit().
    # Example: Circuit(a, b) -> {"a": 0, "b": 1}
    # ===================================================================

    num_qubits: int = len(circuit_instance.qubits)

    # qubit_map: maps each Qubit *object* to its integer index.
    qubit_map: Dict[str, int] = {}
    for index, qubit in enumerate(circuit_instance.qubits):
        qubit_map[qubit.name] = index

    # ===================================================================
    # STEP 3 : Create the Qiskit QuantumCircuit.
    # ===================================================================
    # QuantumCircuit(n, n) creates n quantum wires and n classical wires.
    # The classical wires are needed to store measurement results.
    # ===================================================================

    qc: QuantumCircuit = QuantumCircuit(num_qubits, num_qubits)

    # ===================================================================
    # STEP 4 : Translate each qcuit Apply operation into a Qiskit gate.
    # ===================================================================
    # We iterate through the user's operations in order and call the
    # corresponding Qiskit method on our QuantumCircuit object.
    # ===================================================================

    for op in circuit_instance._operations:
        # Look up the integer index for the target qubit.
        target_idx: int = qubit_map[op.target.name]

        if op.gate is Hadamard:
            # Hadamard gate: puts the qubit into superposition.
            # Qiskit call: qc.h(qubit_index)
            qc.h(target_idx)

        elif op.gate is PauliX:
            # Pauli-X gate: flips |0> to |1> and vice versa.
            # Qiskit call: qc.x(qubit_index)
            qc.x(target_idx)

        elif op.gate is CNOT:
            # CNOT gate: flips target IF control is |1>.
            # Qiskit call: qc.cx(control_index, target_index)
            # Note: control is guaranteed non-None (validated in Apply.__init__)
            control_idx: int = qubit_map[op.control.name]  # type: ignore[union-attr]
            qc.cx(control_idx, target_idx)

        else:
            # Future-proofing: if someone adds a gate class but forgets
            # to update this translator, we catch it here.
            raise QcuitError(
                f"Unknown gate type: {op.gate}.  "
                "This gate is not yet supported by the qcuit backend."
            )

    # ===================================================================
    # STEP 5 : Add measurements.
    # ===================================================================
    # measure_all() was called, so we measure every qubit.
    # qc.measure(quantum_wire, classical_wire) maps each qubit to its
    # corresponding classical bit for readout.
    # ===================================================================

    for i in range(num_qubits):
        qc.measure(i, i)

    # ===================================================================
    # STEP 6 : Run the simulation on AerSimulator.
    # ===================================================================
    # AerSimulator is Qiskit's high-performance local simulator.
    # transpile() optimizes the circuit for the simulator backend.
    # sim.run() executes the circuit for the specified number of shots.
    # ===================================================================

    # Create the simulator backend.
    sim: AerSimulator = AerSimulator()

    # Transpile (optimize) the circuit for the simulator.
    compiled_circuit: QuantumCircuit = transpile(qc, sim)

    # Run the simulation and wait for the result.
    result = sim.run(compiled_circuit, shots=shots).result()

    # ===================================================================
    # STEP 7 : Extract and return clean counts.
    # ===================================================================
    # result.get_counts() returns a dict like {"00": 512, "11": 512}.
    # Each key is a bitstring representing the measured state of all
    # qubits, and the value is how many times that outcome occurred.
    # ===================================================================

    counts: Dict[str, int] = result.get_counts(compiled_circuit)

    return counts
