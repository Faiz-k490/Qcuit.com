"""
examples/hello_quantum.py - Your First Quantum Program with qcuit

This script demonstrates the core workflow of qcuit by creating a
**Bell State** - the simplest example of quantum entanglement.

What is a Bell State?
    Two qubits are entangled so that measuring one instantly determines
    the other.  You will always get "00" or "11", never "01" or "10".
    This is the foundation of quantum teleportation, superdense coding,
    and many quantum algorithms.

How it works (step by step):
    1. Create two qubits: "a" and "b".
    2. Apply a Hadamard gate to "a" (puts it in superposition).
    3. Apply a CNOT gate with "a" as control and "b" as target.
       This entangles the two qubits.
    4. Measure all qubits.
    5. Simulate 1024 times and print the results.

Expected output:
    You should see roughly ~512 counts of "00" and ~512 counts of "11".
    The exact numbers vary because quantum mechanics is probabilistic!
"""

# --- Import everything we need from the qcuit library. --------------------
from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation


def main() -> None:
    """Run the Bell State demo."""

    print("=" * 55)
    print("  qcuit - Hello Quantum!")
    print("  Creating a Bell State (Entangled Pair)")
    print("=" * 55)

    # --- Step 1: Declare your qubits. ------------------------------------
    # Give each qubit a friendly name. Under the hood, qcuit maps these
    # to Qiskit's integer indices automatically.
    a: Qubit = Qubit("a")
    b: Qubit = Qubit("b")

    # --- Step 2: Create a circuit with both qubits. ----------------------
    circ: Circuit = Circuit(a, b)

    # --- Step 3: Apply gates. --------------------------------------------
    # Hadamard on "a" puts it into superposition (equal chance of 0 or 1).
    circ.add(Apply(Hadamard, target=a))

    # CNOT with control="a", target="b" entangles them.
    # Now "b" will always match "a" when measured.
    circ.add(Apply(CNOT, target=b, control=a))

    # --- Step 4: Flag all qubits for measurement. ------------------------
    circ.measure_all()

    # --- Step 5: Visualize the circuit before running. -------------------
    print("\nCircuit diagram:")
    circ.draw()

    # --- Step 6: Run the simulation! -------------------------------------
    print("Running simulation (1024 shots)...\n")
    results = run_simulation(circ)

    # --- Step 7: Display the results. ------------------------------------
    print("Results:")
    print("-" * 35)
    for state, count in sorted(results.items()):
        # Build a simple bar chart in the terminal.
        bar = "#" * (count // 20)
        print(f"  |{state}> : {count:>4} shots  {bar}")
    print("-" * 35)

    # --- Explain what happened. ------------------------------------------
    print("\nWhat just happened?")
    print("  Qubit 'a' was put into superposition by the Hadamard gate.")
    print("  The CNOT gate then entangled 'a' and 'b'.")
    print("  As a result, they always collapse to the SAME value:")
    print("  both |00> or both |11> - never |01> or |10>.")
    print("  That's quantum entanglement!\n")


if __name__ == "__main__":
    main()
