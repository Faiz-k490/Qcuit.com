"""The website's indexed observables use the simulator's little-endian qubits."""
import numpy as np
import pytest

from api.diffsim import Hamiltonian, qaoa_maxcut_hamiltonian, real_amplitudes_ansatz


@pytest.mark.parametrize("target", [0, 1, 2])
def test_indexed_z_matches_the_rotated_circuit_qubit(target):
    circuit, _ = real_amplitudes_ansatz(3, layers=1)
    params = np.zeros(3)
    params[target] = np.pi
    state = circuit(params, 3)
    for measured in range(3):
        observable = Hamiltonian.from_string(f"Z{measured}", num_qubits=3)
        assert observable.expectation(state) == pytest.approx(-1 if measured == target else 1)


def test_asymmetric_maxcut_edges_match_every_basis_state():
    edges = [(0, 1), (0, 2)]
    observable = qaoa_maxcut_hamiltonian(edges=edges, num_qubits=4)
    for bits in range(16):
        state = np.zeros(16, dtype=complex)
        state[bits] = 1
        expected = sum(-0.5 * (-1) ** (((bits >> i) & 1) + ((bits >> j) & 1))
                       for i, j in edges)
        assert observable.expectation(state) == pytest.approx(expected)
