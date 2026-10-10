"""The website trainer minimizes its observable, so larger cuts need lower loss."""
import numpy as np
import pytest

from api.diffsim import qaoa_maxcut_preset


def test_preset_loss_is_negative_cut_size_up_to_constant():
    observable = qaoa_maxcut_preset()["observable"]
    edges = [(0, 1), (1, 2), (2, 3), (3, 0)]
    for bits in range(16):
        state = np.zeros(16, dtype=complex)
        state[bits] = 1
        cut_size = sum(((bits >> i) & 1) != ((bits >> j) & 1) for i, j in edges)
        assert observable.expectation(state) == pytest.approx(len(edges) / 2 - cut_size)
