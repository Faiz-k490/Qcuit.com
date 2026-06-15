"""Quark/gluon Lie-EQGNN smoke demo.

This is the smallest useful payload for the HEP pivot: generate a toy jet
dataset, instantiate a LieEQGNN with a quantum ``phi_e`` block, and run the
headless benchmark runner.  Use ``quantum_backend="pennylane"`` after installing
``qcuit[hep,qml]`` for a real PennyLane qnode; the default here uses the fast
Torch surrogate so the example runs on any CPU-only development machine.
"""

from __future__ import annotations

from qcuit.cli import lie_eqgnn_demo


def main() -> None:
    lie_eqgnn_demo([])


if __name__ == "__main__":
    main()
