"""Simple state-vector simulator with optional depolarizing noise.

This module provides utility functions to initialize a state, apply gates
(including controlled and swap/cz decompositions), and run a circuit defined
by a sequence of step dictionaries.

Conventions
- Qubit indexing: 0..N-1, where index 0 corresponds to the left-most factor in
  the Kronecker product when building full-operators.
- Circuit step schema (examples):
  {"gateType": "H", "qubit": 0}
  {"gateType": "RX", "qubit": 1, "theta": 1.234}
  {"gateType": "CNOT", "controls": [0], "targets": [1]}
  {"gateType": "CZ", "controls": [0], "targets": [1]}
  {"gateType": "SWAP", "targets": [0, 2]}
  {"gateType": "MEASUREMENT", "qubit": 1, "classicalBit": 0}
"""
from __future__ import annotations

import numpy as np
from . import gates


def initialize_state(num_qubits: int) -> np.ndarray:
    """Initializes the state vector to |0...0> of length 2**num_qubits."""
    state = np.zeros(2**num_qubits, dtype=np.complex128)
    state[0] = 1.0
    return state


def get_probabilities(state_vector: np.ndarray) -> dict[str, float]:
    """Calculates probabilities from the final state vector.

    Returns a dict mapping bitstrings (e.g., '00101') to non-zero probabilities.
    """
    probabilities = np.abs(state_vector) ** 2
    num_qubits = int(np.log2(len(state_vector)))
    results: dict[str, float] = {}
    for i, prob in enumerate(probabilities):
        if prob > 1e-12:  # include only significant probabilities
            binary_str = format(i, f"0{num_qubits}b")
            results[binary_str] = float(prob)
    return results


def _kron_n(op_list: list[np.ndarray]) -> np.ndarray:
    full = op_list[0]
    for op in op_list[1:]:
        full = np.kron(full, op)
    return full


def apply_gate(
    state_vector: np.ndarray, gate_matrix: np.ndarray, target_qubit: int, num_qubits: int
) -> np.ndarray:
    """Applies a single-qubit gate to the state vector."""
    op_list = [gates.I] * num_qubits
    op_list[target_qubit] = gate_matrix
    full_operator = _kron_n(op_list)
    return full_operator.dot(state_vector)


def apply_controlled_gate(
    state_vector: np.ndarray,
    controls: list[int],
    target: int,
    target_gate_matrix: np.ndarray,
    num_qubits: int,
) -> np.ndarray:
    """Applies a gate with any number of control qubits.

    Implements: U_full = (I - P_ctrl) + (P_ctrl @ U_target)
    where P_ctrl projects onto |1> for all control qubits.
    """
    P1 = np.array([[0, 0], [0, 1]], dtype=np.complex128)

    # Projector for all control qubits in the |1> state across all qubits
    projector_list = [gates.I] * num_qubits
    for c in controls:
        projector_list[c] = P1
    full_control_projector = _kron_n(projector_list)

    # (P_controls) @ (Gate_target)
    on_list = projector_list.copy()
    on_list[target] = target_gate_matrix
    full_op_on = _kron_n(on_list)

    # (I - P_controls) is the OFF-branch; it implicitly applies I on target
    I_full = np.identity(2**num_qubits, dtype=np.complex128)
    full_op_off = I_full - full_control_projector

    full_operator = full_op_off + full_op_on
    return full_operator.dot(state_vector)


def apply_swap(state_vector: np.ndarray, q1: int, q2: int, num_qubits: int) -> np.ndarray:
    """Applies SWAP as 3 CNOTs."""
    state = apply_controlled_gate(state_vector, [q1], q2, gates.X, num_qubits)
    state = apply_controlled_gate(state, [q2], q1, gates.X, num_qubits)
    state = apply_controlled_gate(state, [q1], q2, gates.X, num_qubits)
    return state


def apply_cz(state_vector: np.ndarray, control: int, target: int, num_qubits: int) -> np.ndarray:
    """Applies CZ via H(target) - CNOT(control,target) - H(target)."""
    state = apply_gate(state_vector, gates.H, target, num_qubits)
    state = apply_controlled_gate(state, [control], target, gates.X, num_qubits)
    state = apply_gate(state, gates.H, target, num_qubits)
    return state


def apply_depolarizing_noise(
    state_vector: np.ndarray, qubit: int, noise_level: float, num_qubits: int
) -> np.ndarray:
    """Applies a simple depolarizing channel to a single qubit.

    With probability p/3 each, apply X, Y, or Z; otherwise apply I.
    """
    if noise_level <= 0:
        return state_vector

    p_gate = noise_level / 3.0
    rand_val = np.random.rand()

    if rand_val < p_gate:
        gate_matrix = gates.X
    elif rand_val < 2 * p_gate:
        gate_matrix = gates.Y
    elif rand_val < 3 * p_gate:
        gate_matrix = gates.Z
    else:
        return state_vector

    return apply_gate(state_vector, gate_matrix, qubit, num_qubits)


def run_simulation(
    num_qubits: int, circuit_steps: list[dict], noise_level: float = 0.0
) -> tuple[dict[str, float], np.ndarray]:
    """Main simulation function.

    Returns (probabilities_dict, final_state_vector)
    """
    state = initialize_state(num_qubits)

    # Gate type normalization map
    gate_type_map = {
        'S†': 'SDG', 'S\u2020': 'SDG', 'SDAGGER': 'SDG',
        'T†': 'TDG', 'T\u2020': 'TDG', 'TDAGGER': 'TDG',
        'CCX': 'CCNOT', 'TOFFOLI': 'CCNOT',
        'CX': 'CNOT',
        'M': 'MEASUREMENT',
    }

    for step in circuit_steps:
        raw_gate_type = step.get("gateType", "")
        gate_type = gate_type_map.get(raw_gate_type.upper(), raw_gate_type.upper())
        involved_qubits_in_step: set[int] = set()

        if gate_type == "MEASUREMENT":
            # No state change for pure state-vector simulation
            pass

        elif gate_type in ("CNOT", "CCNOT"):
            controls = step["controls"]
            target = step["targets"][0]  # one target
            state = apply_controlled_gate(state, controls, target, gates.X, num_qubits)
            involved_qubits_in_step.update(controls)
            involved_qubits_in_step.add(target)

        elif gate_type == "CZ":
            control = step["controls"][0]
            target = step["targets"][0]
            state = apply_cz(state, control, target, num_qubits)
            involved_qubits_in_step.add(control)
            involved_qubits_in_step.add(target)

        elif gate_type == "SWAP":
            q1 = step["targets"][0]
            q2 = step["targets"][1]
            state = apply_swap(state, q1, q2, num_qubits)
            involved_qubits_in_step.add(q1)
            involved_qubits_in_step.add(q2)

        elif gate_type in ("RX", "RY", "RZ"):
            theta = float(step.get("theta", 0.0))
            qubit = step["qubit"]
            gate_func = getattr(gates, gate_type)
            gate_matrix = gate_func(theta)
            state = apply_gate(state, gate_matrix, qubit, num_qubits)
            involved_qubits_in_step.add(qubit)

        else:  # Single-qubit gates (H, X, Y, Z, S, T, SDG, TDG, etc.)
            qubit = step["qubit"]
            gate_matrix = getattr(gates, gate_type)
            state = apply_gate(state, gate_matrix, qubit, num_qubits)
            involved_qubits_in_step.add(qubit)

        # Apply noise after each gate operation
        if noise_level > 0 and gate_type != "MEASUREMENT":
            for q in sorted(involved_qubits_in_step):
                state = apply_depolarizing_noise(state, q, noise_level, num_qubits)

    probabilities = get_probabilities(state)
    return probabilities, state
