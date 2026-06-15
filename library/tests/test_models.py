import torch

from qcuit.hep import JetDataset, collate_jets
from qcuit.models import LieEQGNN, LorentzNet
from qcuit.quantum import DressedQuantumLayer


def _batch():
    p4s = torch.tensor(
        [
            [[5.0, 1.0, 0.0, 0.0], [4.0, 0.0, 1.0, 0.0], [3.0, 0.0, 0.0, 1.0]],
            [[6.0, 1.0, 1.0, 0.0], [3.0, 0.0, 0.0, 1.0], [2.0, 0.1, 0.2, 0.3]],
        ]
    )
    scalars = torch.randn(2, 3, 2)
    labels = torch.tensor([0, 1])
    dataset = JetDataset.from_arrays(p4s, scalars, labels)
    return collate_jets([dataset[0], dataset[1]]), dataset


def test_torch_quantum_layer_shape():
    layer = DressedQuantumLayer(4, depth=2, backend="torch")
    out = layer(torch.randn(5, 4))

    assert out.shape == (5, 4)


def test_lorentznet_forward_shape():
    batch, dataset = _batch()
    model = LorentzNet(n_scalar=dataset.n_scalar, n_hidden=4, n_layers=1)

    logits = model.forward_batch(batch)

    assert logits.shape == (2, 2)


def test_lie_eqgnn_quantum_block_forward_shape():
    batch, dataset = _batch()
    model = LieEQGNN(
        n_scalar=dataset.n_scalar,
        n_hidden=4,
        n_layers=1,
        quantum_blocks=["phi_e"],
        quantum_backend="torch",
    )

    logits = model.forward_batch(batch)

    assert logits.shape == (2, 2)
