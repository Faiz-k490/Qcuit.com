"""Lie-equivariant quantum graph neural network templates."""

from __future__ import annotations

from typing import Any, Iterable

from qcuit.models._torch_utils import torch_nn
from qcuit.models.lorentznet import LGEB, LorentzNet
from qcuit.quantum.layers import DressedQuantumLayer

torch, nn = torch_nn()


def _normalize_blocks(blocks: Iterable[str] | str | None) -> set[str]:
    if blocks is None:
        return set()
    if isinstance(blocks, str):
        if blocks in {"quantum", "full_quantum", "all"}:
            return {"phi_e", "phi_h", "phi_x", "phi_m"}
        return {blocks}
    return set(blocks)


class QLieGEB(LGEB):
    """Lorentz-equivariant block with optional quantum submodules."""

    def __init__(
        self,
        n_input: int,
        n_output: int,
        n_hidden: int,
        *,
        n_node_attr: int = 0,
        dropout: float = 0.0,
        c_weight: float = 1.0,
        last_layer: bool = False,
        metric: str | Any | None = "minkowski",
        include_x: bool = False,
        quantum_blocks: Iterable[str] | str | None = None,
        quantum_backend: str = "auto",
        quantum_depth: int = 2,
    ) -> None:
        super().__init__(
            n_input,
            n_output,
            n_hidden,
            n_node_attr=n_node_attr,
            dropout=dropout,
            c_weight=c_weight,
            last_layer=last_layer,
            metric=metric,
            include_x=include_x,
        )
        self.quantum_blocks = _normalize_blocks(quantum_blocks)
        if "phi_e" in self.quantum_blocks:
            self.phi_e = DressedQuantumLayer(self.message_dim, depth=quantum_depth, backend=quantum_backend)
        if "phi_h" in self.quantum_blocks:
            self.phi_h = nn.Sequential(
                nn.Linear(self.message_dim + n_input + n_node_attr, self.message_dim, bias=False),
                nn.BatchNorm1d(self.message_dim),
                nn.ReLU(),
                DressedQuantumLayer(self.message_dim, depth=quantum_depth, backend=quantum_backend),
                nn.Linear(self.message_dim, n_output, bias=False),
            )
        if "phi_x" in self.quantum_blocks and not last_layer:
            down = nn.Linear(self.message_dim, 1, bias=False)
            nn.init.xavier_uniform_(down.weight, gain=0.001)
            self.phi_x = nn.Sequential(
                DressedQuantumLayer(self.message_dim, depth=quantum_depth, backend=quantum_backend),
                down,
            )
        if "phi_m" in self.quantum_blocks:
            self.phi_m = nn.Sequential(
                nn.Linear(self.message_dim, 1),
                DressedQuantumLayer(1, depth=1, backend=quantum_backend),
            )


class LieEQGNN(LorentzNet):
    """Lie-equivariant quantum GNN for HEP graph classification.

    ``quantum_blocks`` can contain any of ``phi_e``, ``phi_h``, ``phi_x``, or
    ``phi_m``.  Passing ``"all"`` replaces all eligible classical MLP blocks.
    """

    def __init__(
        self,
        n_scalar: int,
        n_hidden: int,
        *,
        n_class: int = 2,
        n_layers: int = 6,
        c_weight: float = 1e-3,
        dropout: float = 0.0,
        metric: str | Any | None = "minkowski",
        include_x: bool = False,
        quantum_blocks: Iterable[str] | str | None = None,
        quantum_backend: str = "auto",
        quantum_depth: int = 2,
    ) -> None:
        nn.Module.__init__(self)
        self.n_hidden = int(n_hidden)
        self.n_layers = int(n_layers)
        self.embedding = nn.Linear(n_scalar, n_hidden)
        self.blocks = nn.ModuleList(
            [
                QLieGEB(
                    n_hidden,
                    n_hidden,
                    n_hidden,
                    n_node_attr=n_scalar,
                    dropout=dropout,
                    c_weight=c_weight,
                    last_layer=(idx == n_layers - 1),
                    metric=metric,
                    include_x=include_x,
                    quantum_blocks=quantum_blocks,
                    quantum_backend=quantum_backend,
                    quantum_depth=quantum_depth,
                )
                for idx in range(n_layers)
            ]
        )
        self.graph_dec = nn.Sequential(
            nn.Linear(n_hidden, n_hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(n_hidden, n_class),
        )
