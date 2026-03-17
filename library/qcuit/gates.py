"""
qcuit/gates.py — Quantum Gate Definitions

This module defines the fundamental quantum gates supported by qcuit.
Each gate is represented as a simple Python class. Under the hood, the
backend translator maps these to their Qiskit equivalents.

Think of a quantum gate like a light switch for a qubit:
it changes the qubit's state in a specific, predictable way.

Supported Gates:
    - Hadamard: Puts a qubit into superposition (both 0 and 1 at once).
    - PauliX:   Flips a qubit's state (like a NOT gate in classical computing).
    - CNOT:     Flips a target qubit ONLY if a control qubit is |1⟩.
"""

from __future__ import annotations

from typing import Optional, Type


# ---------------------------------------------------------------------------
# Gate Classes
# ---------------------------------------------------------------------------
# Each gate class is intentionally minimal — it's just a label.
# The actual matrix math happens in Qiskit; we only need to know
# *which* gate the user wants so the backend can translate it.
# ---------------------------------------------------------------------------


class Hadamard:
    """The Hadamard gate — the gateway to quantum weirdness.

    In plain English:
        A classical bit is either 0 or 1.  The Hadamard gate puts a qubit
        into **superposition**, meaning it has an equal chance of being
        measured as 0 *or* 1.  It's the most common first step in almost
        every quantum algorithm.

    Qiskit equivalent:
        ``qc.h(qubit)``

    Example::

        from qcuit import Hadamard, Apply, Qubit

        q = Qubit("my_qubit")
        op = Apply(Hadamard, target=q)
    """

    # A human-readable label used by draw() and error messages.
    label: str = "H"


class PauliX:
    """The Pauli-X gate — a quantum NOT gate.

    In plain English:
        If your qubit is |0⟩, the Pauli-X gate flips it to |1⟩, and
        vice-versa.  It's the quantum equivalent of flipping a classical
        bit.

    Qiskit equivalent:
        ``qc.x(qubit)``

    Example::

        from qcuit import PauliX, Apply, Qubit

        q = Qubit("my_qubit")
        op = Apply(PauliX, target=q)
    """

    label: str = "X"


class CNOT:
    """The Controlled-NOT (CNOT) gate — the engine of entanglement.

    In plain English:
        The CNOT gate operates on **two** qubits.  It flips the *target*
        qubit **only** when the *control* qubit is |1⟩.  This conditional
        relationship is what creates **entanglement** — a spooky link where
        measuring one qubit instantly tells you the state of the other.

    Qiskit equivalent:
        ``qc.cx(control_qubit, target_qubit)``

    Important:
        When you use ``Apply(CNOT, ...)``, you **must** supply both a
        ``target`` and a ``control`` qubit.  If you forget the control,
        qcuit will raise a friendly ``QcuitError`` before anything breaks.

    Example::

        from qcuit import CNOT, Apply, Qubit

        a = Qubit("a")
        b = Qubit("b")
        op = Apply(CNOT, target=b, control=a)
    """

    label: str = "CNOT"


# ---------------------------------------------------------------------------
# Gate type alias — used for type hints throughout the library.
# This union type represents any gate class that qcuit understands.
# ---------------------------------------------------------------------------

GateType = Type[Hadamard] | Type[PauliX] | Type[CNOT]


# ---------------------------------------------------------------------------
# Apply — the operation wrapper
# ---------------------------------------------------------------------------


class Apply:
    """Describes a single gate operation to be added to a circuit.

    ``Apply`` is the bridge between a gate and the qubits it acts on.
    You tell it *which* gate, *which* target qubit, and (for multi-qubit
    gates like CNOT) *which* control qubit.

    Args:
        gate:    The gate class to apply (e.g. ``Hadamard``, ``PauliX``,
                 ``CNOT``).
        target:  The qubit the gate acts on.
        control: (Optional) The control qubit — required for ``CNOT``.

    Raises:
        QcuitError: If ``CNOT`` is used without a ``control`` qubit, or if
                    a single-qubit gate is given a ``control`` qubit it
                    doesn't need.

    Example::

        from qcuit import Hadamard, CNOT, Apply, Qubit

        a = Qubit("a")
        b = Qubit("b")

        Apply(Hadamard, target=a)          # single-qubit gate
        Apply(CNOT, target=b, control=a)   # two-qubit gate
    """

    def __init__(
        self,
        gate: GateType,
        target: "Qubit",                   # forward reference (defined in core.py)
        control: Optional["Qubit"] = None,
    ) -> None:
        # Import here to avoid circular imports between gates.py and core.py
        from qcuit.core import QcuitError

        # --- Validation: catch mistakes early with friendly messages --------

        # CNOT *requires* a control qubit.
        if gate is CNOT and control is None:
            raise QcuitError(
                "It looks like you tried to use a CNOT gate without specifying "
                "a control qubit.\n"
                "  Try: Apply(CNOT, target=q_b, control=q_a)"
            )

        # Single-qubit gates should NOT have a control qubit.
        if gate is not CNOT and control is not None:
            raise QcuitError(
                f"The {gate.label} gate is a single-qubit gate and does not "
                f"accept a control qubit.\n"
                f"  Try: Apply({gate.__name__}, target=your_qubit)"
            )

        # Store the validated operation details.
        self.gate: GateType = gate
        self.target: "Qubit" = target
        self.control: Optional["Qubit"] = control

    def __repr__(self) -> str:
        """Human-readable representation for debugging."""
        if self.control is not None:
            return (
                f"Apply({self.gate.label}, target={self.target.name}, "
                f"control={self.control.name})"
            )
        return f"Apply({self.gate.label}, target={self.target.name})"
