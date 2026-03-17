"""
qcuit/core.py - Core Building Blocks

This module defines the three foundational pieces of any qcuit program:

    1. **QcuitError** - A friendly custom exception that replaces Qiskit's
       intimidating tracebacks with plain-English guidance.
    2. **Qubit** - A named quantum bit.
    3. **Circuit** - A container that holds qubits and the sequence of gate
       operations you want to perform on them.

Quick start::

    from qcuit import Qubit, Circuit, Apply, Hadamard

    q = Qubit("my_qubit")
    circ = Circuit(q)
    circ.add(Apply(Hadamard, target=q))
    circ.measure_all()
    circ.draw()
"""

from __future__ import annotations

from typing import List


# ---------------------------------------------------------------------------
# QcuitError - Beginner-friendly custom exception
# ---------------------------------------------------------------------------


class QcuitError(Exception):
    """A beginner-friendly exception for the qcuit library.

    Instead of letting Qiskit throw a wall of scary traceback text,
    qcuit catches common mistakes early and raises a ``QcuitError``
    with a helpful, human-readable message that tells you exactly
    what went wrong and how to fix it.

    Example output::

        QcuitError: It looks like you tried to use a CNOT gate without
        specifying a control qubit.
          Try: Apply(CNOT, target=q_b, control=q_a)
    """

    def __init__(self, message: str) -> None:
        # Prefix every message so it is immediately recognizable in the terminal.
        super().__init__(f"\n\n  Qcuit Error: {message}\n")


# ---------------------------------------------------------------------------
# Qubit - A named quantum bit
# ---------------------------------------------------------------------------


class Qubit:
    """A single quantum bit (qubit) identified by a human-readable name.

    In plain English:
        A classical bit is either 0 or 1.  A **qubit** can be 0, 1, or
        a *superposition* of both at the same time - until you measure it.

        In qcuit you create a qubit by giving it a friendly name.  The
        library keeps track of the mapping to Qiskit's integer indices
        behind the scenes so you never have to think about it.

    Args:
        name: A descriptive string label for this qubit (e.g. ``"alice"``).

    Raises:
        QcuitError: If the name is empty or not a string.

    Example::

        from qcuit import Qubit

        alice = Qubit("alice")
        bob   = Qubit("bob")
    """

    def __init__(self, name: str) -> None:
        # --- Validation: make sure the user passes a valid name. -----------
        if not isinstance(name, str) or not name.strip():
            raise QcuitError(
                "A Qubit needs a non-empty string name.\n"
                '  Try: Qubit("my_qubit")'
            )

        self.name: str = name

    def __repr__(self) -> str:
        """Return a clean string so print(qubit) is useful."""
        return f'Qubit("{self.name}")'


# ---------------------------------------------------------------------------
# Circuit - The quantum program
# ---------------------------------------------------------------------------


class Circuit:
    """A quantum circuit - the program that describes your computation.

    In plain English:
        Think of a ``Circuit`` as a recipe.  You list the qubits (the
        ingredients) and then add gate operations (the steps) one by one.
        When you are ready, you flag the circuit for measurement and hand
        it to the simulator to cook.

    Args:
        *qubits: One or more ``Qubit`` objects that this circuit operates on.

    Raises:
        QcuitError: If no qubits are provided, or if a non-Qubit object is
                    passed.

    Example::

        from qcuit import Qubit, Circuit, Apply, Hadamard

        a = Qubit("a")
        b = Qubit("b")
        circ = Circuit(a, b)
        circ.add(Apply(Hadamard, target=a))
        circ.measure_all()
    """

    def __init__(self, *qubits: Qubit) -> None:
        # --- Validation: at least one qubit required. ----------------------
        if len(qubits) == 0:
            raise QcuitError(
                "A Circuit needs at least one Qubit.\n"
                '  Try: Circuit(Qubit("a"))'
            )

        # Make sure every argument is actually a Qubit.
        for q in qubits:
            if not isinstance(q, Qubit):
                raise QcuitError(
                    f"Expected a Qubit object but got {type(q).__name__}.\n"
                    '  Try: Circuit(Qubit("a"), Qubit("b"))'
                )

        # Store the qubits in the order they were provided.
        # This order defines the qubit-index mapping used by the backend.
        self.qubits: tuple[Qubit, ...] = qubits

        # Internal list of Apply operations - the gate sequence.
        from qcuit.gates import Apply  # local import to avoid circular deps
        self._operations: List[Apply] = []

        # Flag that tracks whether measure_all() has been called.
        self._measure: bool = False

    # ------------------------------------------------------------------
    # add() - append a gate operation
    # ------------------------------------------------------------------

    def add(self, operation: "Apply") -> None:
        """Add a gate operation to the circuit.

        In plain English:
            Each call to ``add()`` is like writing the next line of your
            quantum recipe.  The operation describes which gate to apply
            and to which qubit(s).

        Args:
            operation: An ``Apply`` object that wraps a gate and its
                       target / control qubits.

        Raises:
            QcuitError: If the operation is not an ``Apply`` instance, or if
                        the referenced qubits are not part of this circuit.

        Example::

            circ.add(Apply(Hadamard, target=a))
        """
        from qcuit.gates import Apply  # local import to avoid circular deps

        # --- Validation: must be an Apply object. --------------------------
        if not isinstance(operation, Apply):
            raise QcuitError(
                "Circuit.add() expects an Apply object.\n"
                "  Try: circ.add(Apply(Hadamard, target=my_qubit))"
            )

        # --- Validation: qubits must belong to this circuit. ---------------
        if operation.target not in self.qubits:
            raise QcuitError(
                f'Qubit "{operation.target.name}" is not part of this circuit.\n'
                "  Make sure you passed it when creating the Circuit."
            )
        if operation.control is not None and operation.control not in self.qubits:
            raise QcuitError(
                f'Control qubit "{operation.control.name}" is not part of this circuit.\n'
                "  Make sure you passed it when creating the Circuit."
            )

        # All checks passed - append the operation.
        self._operations.append(operation)

    # ------------------------------------------------------------------
    # measure_all() - flag every qubit for measurement
    # ------------------------------------------------------------------

    def measure_all(self) -> None:
        """Flag every qubit in the circuit for measurement.

        In plain English:
            Measurement collapses a qubit's superposition into a definite
            0 or 1.  Calling ``measure_all()`` tells the simulator that
            you want to read out every qubit at the end of the circuit.

        Raises:
            QcuitError: If ``measure_all()`` has already been called.

        Example::

            circ.measure_all()
        """
        if self._measure:
            raise QcuitError(
                "measure_all() has already been called on this circuit.\n"
                "  You only need to call it once."
            )
        self._measure = True

    # ------------------------------------------------------------------
    # draw() - ASCII circuit visualization
    # ------------------------------------------------------------------

    def draw(self) -> None:
        """Print a simple ASCII diagram of the circuit to the terminal.

        In plain English:
            Before you run a simulation, it is really helpful to *see*
            what your circuit looks like.  ``draw()`` prints a text
            timeline showing each qubit as a horizontal wire with the
            gates placed in order.

        Notation:
            - ``[H]``   = Hadamard gate
            - ``[X]``   = Pauli-X gate
            - ``[*]``   = CNOT control qubit (the "if" side)
            - ``[+]``   = CNOT target qubit  (the "flip" side)
            - ``[M]``   = Measurement

        Example output::

            Qubit(a): ---[H]---[*]---[M]
            Qubit(b): ---------[+]---[M]
        """
        from qcuit.gates import CNOT

        # Build a timeline list for each qubit.
        # Each entry is a gate label string for that time step.
        # We use the qubit's index in self.qubits for lookup.
        qubit_timelines: dict[str, List[str]] = {
            q.name: [] for q in self.qubits
        }

        # Walk through every operation and place gate symbols.
        for op in self._operations:
            if op.gate is CNOT:
                # CNOT touches two wires at the same time step.
                # Place [*] on the control wire and [+] on the target wire.
                for q in self.qubits:
                    if q is op.control:
                        qubit_timelines[q.name].append("[*]")
                    elif q is op.target:
                        qubit_timelines[q.name].append("[+]")
                    else:
                        # Other wires get a blank spacer to keep alignment.
                        qubit_timelines[q.name].append("---")
            else:
                # Single-qubit gate: place the label on the target wire.
                label = f"[{op.gate.label}]"
                for q in self.qubits:
                    if q is op.target:
                        qubit_timelines[q.name].append(label)
                    else:
                        qubit_timelines[q.name].append("---")

        # If measurement is flagged, add [M] to every wire.
        if self._measure:
            for q in self.qubits:
                qubit_timelines[q.name].append("[M]")

        # --- Render the ASCII art to the terminal. -------------------------
        # Find the longest qubit name for alignment padding.
        max_name_len: int = max(len(q.name) for q in self.qubits)

        print()  # blank line for breathing room
        for q in self.qubits:
            # Pad the qubit label so all wires line up.
            padded_name: str = q.name.ljust(max_name_len)
            # Join each gate symbol with dashes to form the wire.
            wire: str = "---".join(qubit_timelines[q.name])
            print(f"  Qubit({padded_name}): ---{wire}")
        print()  # trailing blank line
