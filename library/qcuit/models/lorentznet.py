"""LorentzNet baseline packaged for Qcuit HEP benchmarks."""

from __future__ import annotations

from typing import Any

from qcuit.hep.lorentz import minkowski_dot, minkowski_norm, psi, resolve_metric
from qcuit.models._torch_utils import torch_nn, unsorted_segment_mean, unsorted_segment_sum

torch, nn = torch_nn()


class LGEB(nn.Module):
    """Lorentz Group Equivariant Block."""

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
    ) -> None:
        super().__init__()
        self.c_weight = c_weight
        self.include_x = include_x
        self.last_layer = last_layer
        self.metric = metric
        edge_attr = 10 if include_x else 2
        message_dim = n_input * 2 + edge_attr
        self.message_dim = message_dim

        self.phi_e = nn.Sequential(
            nn.Linear(message_dim, message_dim, bias=False),
            nn.BatchNorm1d(message_dim),
            nn.ReLU(),
            nn.Linear(message_dim, message_dim),
            nn.ReLU(),
        )
        self.phi_h = nn.Sequential(
            nn.Linear(message_dim + n_input + n_node_attr, n_hidden),
            nn.BatchNorm1d(n_hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(n_hidden, n_output),
        )
        if not last_layer:
            layer = nn.Linear(message_dim, 1, bias=False)
            nn.init.xavier_uniform_(layer.weight, gain=0.001)
            self.phi_x = nn.Sequential(nn.Linear(message_dim, message_dim), nn.ReLU(), layer)
        self.phi_m = nn.Sequential(nn.Linear(message_dim, 1), nn.Sigmoid())

    def metric_for(self, x: Any):
        return resolve_metric(self.metric, like=x)

    def minkowski_feats(self, edges: list[Any], x: Any):
        i, j = edges
        x_diff = x[i] - x[j]
        metric = self.metric_for(x)
        norms = psi(minkowski_norm(x_diff, metric=metric)).unsqueeze(1)
        dots = psi(minkowski_dot(x[i], x[j], metric=metric)).unsqueeze(1)
        return norms, dots, x_diff

    def m_model(self, hi: Any, hj: Any, norms: Any, dots: Any, xi: Any | None = None, xj: Any | None = None):
        pieces = [hi, hj, norms, dots]
        if self.include_x:
            pieces.extend([xi, xj])
        out = self.phi_e(torch.cat(pieces, dim=1))
        return out * self.phi_m(out)

    def h_model(self, h: Any, edges: list[Any], m: Any, node_attr: Any):
        i, _ = edges
        agg = unsorted_segment_sum(m, i, num_segments=h.size(0))
        return h + self.phi_h(torch.cat([h, agg, node_attr], dim=1))

    def x_model(self, x: Any, edges: list[Any], x_diff: Any, m: Any):
        i, _ = edges
        trans = torch.clamp(x_diff * self.phi_x(m), min=-100, max=100)
        agg = unsorted_segment_mean(trans, i, num_segments=x.size(0))
        return x + agg * self.c_weight

    def forward(self, h: Any, x: Any, edges: list[Any], node_attr: Any):
        i, j = edges
        norms, dots, x_diff = self.minkowski_feats(edges, x)
        if self.include_x:
            m = self.m_model(h[i], h[j], norms, dots, x[i], x[j])
        else:
            m = self.m_model(h[i], h[j], norms, dots)
        if not self.last_layer:
            x = self.x_model(x, edges, x_diff, m)
        h = self.h_model(h, edges, m, node_attr)
        return h, x, m


class LorentzNet(nn.Module):
    """LorentzNet graph classifier for jet tagging."""

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
    ) -> None:
        super().__init__()
        self.n_hidden = int(n_hidden)
        self.n_layers = int(n_layers)
        self.embedding = nn.Linear(n_scalar, n_hidden)
        self.blocks = nn.ModuleList(
            [
                LGEB(
                    n_hidden,
                    n_hidden,
                    n_hidden,
                    n_node_attr=n_scalar,
                    dropout=dropout,
                    c_weight=c_weight,
                    last_layer=(idx == n_layers - 1),
                    metric=metric,
                    include_x=include_x,
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

    def forward(self, scalars: Any, x: Any, edges: list[Any], node_mask: Any, edge_mask: Any | None = None, n_nodes: int = 1):
        h = self.embedding(scalars)
        for block in self.blocks:
            h, x, _ = block(h, x, edges, node_attr=scalars)
        mask = node_mask.to(dtype=h.dtype)
        h = (h * mask).view(-1, n_nodes, self.n_hidden)
        mask = mask.view(-1, n_nodes, 1)
        pooled = h.sum(dim=1) / mask.sum(dim=1).clamp(min=1.0)
        return self.graph_dec(pooled)

    def forward_batch(self, batch: Any):
        return self(
            scalars=batch.scalars,
            x=batch.p4s,
            edges=batch.edges,
            node_mask=batch.node_mask,
            edge_mask=batch.edge_mask,
            n_nodes=batch.n_nodes,
        )
