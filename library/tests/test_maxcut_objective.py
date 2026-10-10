"""MaxCut's descent objective must reward larger cuts."""
import numpy as np
import pytest

from qcuit.diff import Adam, qaoa_maxcut_preset, train


EDGES = [(0, 1), (1, 2), (2, 3), (3, 0)]
CUT_SIZES = np.array([
    sum(((bits >> i) & 1) != ((bits >> j) & 1) for i, j in EDGES)
    for bits in range(16)
])


def test_preset_loss_is_negative_cut_size_up_to_constant():
    preset = qaoa_maxcut_preset()
    for bits, cut_size in enumerate(CUT_SIZES):
        state = np.zeros(16, dtype=complex)
        state[bits] = 1
        assert preset["observable"].expectation(state) == pytest.approx(len(EDGES) / 2 - cut_size)


def test_default_training_improves_expected_cut_size():
    preset = qaoa_maxcut_preset()
    steps = list(train(preset["circuit_fn"], preset["init_params"], preset["observable"],
                       optimizer=Adam(lr=preset["optimizer_config"]["lr"]),
                       iterations=preset["max_iter"], seed=preset["seed"]))

    def expected_cut(step):
        state = preset["circuit_fn"](np.asarray(step["params"]), preset["num_qubits"])
        return float(np.dot(np.abs(state) ** 2, CUT_SIZES))

    assert expected_cut(steps[-1]) > expected_cut(steps[0])
