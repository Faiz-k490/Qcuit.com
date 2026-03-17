"""
qcuit - The most beginner-friendly quantum computing library.

Write quantum programs in plain English. Under the hood, qcuit translates
your code into Qiskit and runs it on the AerSimulator.

Quick start::

    from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
    from qcuit.backend import run_simulation

    a = Qubit("a")
    b = Qubit("b")

    circ = Circuit(a, b)
    circ.add(Apply(Hadamard, target=a))
    circ.add(Apply(CNOT, target=b, control=a))
    circ.measure_all()
    circ.draw()

    results = run_simulation(circ)
    print(results)
"""

# Public API - everything a beginner needs, importable from one place.
from qcuit.core import Qubit, Circuit, QcuitError
from qcuit.gates import Apply, Hadamard, PauliX, CNOT

__all__ = [
    "Qubit",
    "Circuit",
    "QcuitError",
    "Apply",
    "Hadamard",
    "PauliX",
    "CNOT",
]

__version__ = "0.1.0"
