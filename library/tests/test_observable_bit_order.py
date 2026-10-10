"""Indexed observables must address the same qubits as circuit gates."""
import numpy as np
import pytest

from qcuit.diff import Hamiltonian, qaoa_maxcut_hamiltonian, real_amplitudes_ansatz


@pytest.mark.parametrize("num_qubits", [1, 2, 3, 4])
def test_indexed_z_matches_each_rotated_circuit_qubit(num_qubits):
    circuit, _ = real_amplitudes_ansatz(num_qubits, layers=1)
    for rotated in range(num_qubits):
        params = np.zeros(num_qubits)
        params[rotated] = np.pi
        state = circuit(params, num_qubits)
        for measured in range(num_qubits):
            observable = Hamiltonian.from_string(f"Z{measured}", num_qubits=num_qubits)
            expected = -1.0 if measured == rotated else 1.0
            assert observable.expectation(state) == pytest.approx(expected)


@pytest.mark.parametrize("operator,phase", [("X", 1.0), ("Y", 1j)])
@pytest.mark.parametrize("target", [0, 1, 2])
def test_indexed_pauli_matches_little_endian_statevector(operator, phase, target):
    state = np.zeros(8, dtype=complex)
    state[0] = 1 / np.sqrt(2)
    state[1 << target] = phase / np.sqrt(2)
    observable = Hamiltonian.from_string(f"{operator}{target}", num_qubits=3)
    assert observable.expectation(state) == pytest.approx(1.0)


def test_asymmetric_maxcut_edges_match_qubit_labels_for_every_basis_state():
    edges = [(0, 1), (0, 2)]
    observable = qaoa_maxcut_hamiltonian(edges=edges, num_qubits=4)
    for bits in range(16):
        state = np.zeros(16, dtype=complex)
        state[bits] = 1
        expected = sum(-0.5 * (-1) ** (((bits >> i) & 1) + ((bits >> j) & 1))
                       for i, j in edges)
        assert observable.expectation(state) == pytest.approx(expected)


def test_explicit_pauli_labels_keep_rightmost_qubit_zero():
    state = np.zeros(8, dtype=complex)
    state[1] = 1
    observable = Hamiltonian.from_terms(3, [(1.0, "IIZ")])
    assert observable.expectation(state) == pytest.approx(-1.0)
