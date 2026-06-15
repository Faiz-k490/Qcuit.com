"""High-energy physics helpers for Qcuit.

This package is intentionally headless and notebook/HPC friendly.  It contains
Lorentz geometry utilities, jet graph data loading, and classification metrics
used by the Lie-EQGNN research workflow.
"""

from qcuit.hep.data import (
    JetBatch,
    JetDataset,
    collate_jets,
    four_vectors_from_ptetaphim,
    load_jetclass,
    load_top_tagging,
    toy_quark_gluon_jets,
)
from qcuit.hep.lorentz import (
    apply_lorentz_transform,
    check_metric_invariance,
    invariant_metric_from_generators,
    lorentz_boost,
    minkowski_dot,
    minkowski_metric,
    minkowski_norm,
    psi,
)
from qcuit.hep.metrics import (
    background_rejection,
    binary_classification_metrics,
    build_roc,
    parameter_count,
)

__all__ = [
    "JetBatch",
    "JetDataset",
    "collate_jets",
    "four_vectors_from_ptetaphim",
    "load_jetclass",
    "load_top_tagging",
    "toy_quark_gluon_jets",
    "apply_lorentz_transform",
    "check_metric_invariance",
    "invariant_metric_from_generators",
    "lorentz_boost",
    "minkowski_dot",
    "minkowski_metric",
    "minkowski_norm",
    "psi",
    "background_rejection",
    "binary_classification_metrics",
    "build_roc",
    "parameter_count",
]
