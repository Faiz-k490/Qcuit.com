import torch
import pytest

from qcuit.hep import JetDataset, collate_jets, four_vectors_from_ptetaphim, load_top_tagging, toy_quark_gluon_jets


def test_jet_dataset_collates_flat_model_batch():
    p4s = torch.tensor(
        [
            [[5.0, 1.0, 0.0, 0.0], [4.0, 0.0, 1.0, 0.0], [0.0, 0.0, 0.0, 0.0]],
            [[6.0, 1.0, 1.0, 0.0], [3.0, 0.0, 0.0, 1.0], [2.0, 0.1, 0.2, 0.3]],
        ]
    )
    scalars = torch.ones(2, 3, 1)
    labels = torch.tensor([0, 1])
    dataset = JetDataset.from_arrays(p4s, scalars, labels)
    loader = torch.utils.data.DataLoader(dataset, batch_size=2, collate_fn=collate_jets)

    batch = next(iter(loader))

    assert batch.p4s.shape == (6, 4)
    assert batch.scalars.shape == (6, 1)
    assert batch.node_mask.shape == (6, 1)
    assert batch.edges[0].numel() == batch.edges[1].numel()


def test_toy_quark_gluon_jets_is_balanced_and_batched():
    dataset = toy_quark_gluon_jets(num_jets=12, n_nodes=4, seed=2)
    batch = collate_jets([dataset[0], dataset[1]])

    assert len(dataset) == 12
    assert int(dataset.labels.sum()) == 6
    assert batch.p4s.shape == (8, 4)


def test_from_kinematics_pads_jagged_lists_and_sorts_by_pt():
    dataset = JetDataset.from_kinematics(
        pt=[[1.0, 4.0], [2.0]],
        eta=[[0.0, 0.1], [0.2]],
        phi=[[0.0, 0.0], [0.0]],
        mass=[[0.1, 0.2], [0.3]],
        labels=[0, 1],
        max_nodes=3,
    )

    assert dataset.p4s.shape == (2, 3, 4)
    assert dataset.scalars.shape == (2, 3, 4)
    assert dataset.labels.tolist() == [0, 1]
    assert dataset.node_mask.squeeze(-1).sum().item() == 3
    assert dataset.scalars[0, 0, 0].item() == pytest.approx(4.0)


def test_four_vectors_from_ptetaphim_returns_energy_px_py_pz():
    p4s = four_vectors_from_ptetaphim([[3.0]], [[0.0]], [[0.0]], [[4.0]])

    assert p4s.shape == (1, 1, 4)
    assert p4s[0, 0, 0] == pytest.approx(5.0)
    assert p4s[0, 0, 1] == pytest.approx(3.0)
    assert p4s[0, 0, 2] == pytest.approx(0.0)
    assert p4s[0, 0, 3] == pytest.approx(0.0)


def test_load_top_tagging_reads_common_hdf5_keys(tmp_path):
    h5py = pytest.importorskip("h5py")
    path = tmp_path / "top_tagging_smoke.h5"
    p4s = torch.zeros(3, 4, 4).numpy()
    p4s[:, :, 0] = 1.0
    labels = torch.tensor([[1, 0], [0, 1], [1, 0]]).numpy()

    with h5py.File(path, "w") as handle:
        handle.create_dataset("X", data=p4s)
        handle.create_dataset("y", data=labels)

    dataset = load_top_tagging(path, max_nodes=2, limit=2)

    assert len(dataset) == 2
    assert dataset.p4s.shape == (2, 2, 4)
    assert dataset.labels.tolist() == [0, 1]
    assert dataset.scalars.shape == (2, 2, 2)


def test_to_pyg_data_list_exports_or_reports_missing_extra():
    dataset = toy_quark_gluon_jets(num_jets=6, n_nodes=3)

    try:
        graphs = dataset.to_pyg_data_list()
    except ImportError as exc:
        assert "qcuit[pyg]" in str(exc)
    else:
        assert len(graphs) == 6
        assert graphs[0].edge_index.shape[0] == 2
        assert graphs[0].p4.shape[-1] == 4
