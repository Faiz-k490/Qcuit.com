"""Command-line entry points for Qcuit research workflows."""

from __future__ import annotations

import argparse
from pathlib import Path

from qcuit.benchmarks import benchmark_classifier, set_seed
from qcuit.hep import toy_quark_gluon_jets
from qcuit.models import LieEQGNN


def lie_eqgnn_demo(argv: list[str] | None = None) -> None:
    """Run the toy quark/gluon LieEQGNN benchmark from the shell."""
    parser = argparse.ArgumentParser(description="Run a toy Qcuit LieEQGNN quark/gluon benchmark.")
    parser.add_argument("--jets", type=int, default=64, help="Number of toy jets to generate.")
    parser.add_argument("--nodes", type=int, default=6, help="Maximum particle nodes per jet.")
    parser.add_argument("--epochs", type=int, default=10, help="Training epochs.")
    parser.add_argument("--batch-size", type=int, default=8, help="Training batch size.")
    parser.add_argument("--hidden", type=int, default=4, help="Hidden feature dimension.")
    parser.add_argument("--layers", type=int, default=2, help="LieEQGNN layers.")
    parser.add_argument("--backend", choices=["torch", "pennylane", "auto"], default="torch")
    parser.add_argument("--seed", type=int, default=11, help="Reproducibility seed.")
    parser.add_argument("--out", type=Path, default=None, help="Optional JSON report path.")
    args = parser.parse_args(argv)

    set_seed(args.seed)
    data = toy_quark_gluon_jets(num_jets=args.jets, n_nodes=args.nodes, seed=args.seed)
    model = LieEQGNN(
        n_scalar=data.n_scalar,
        n_hidden=args.hidden,
        n_layers=args.layers,
        quantum_blocks=["phi_e"],
        quantum_backend=args.backend,
    )
    report = benchmark_classifier(
        model,
        data,
        epochs=args.epochs,
        batch_size=args.batch_size,
        seed=args.seed,
        device="cpu",
        out=args.out,
    )

    print("Qcuit Lie-EQGNN toy quark/gluon benchmark")
    print("-" * 48)
    print(f"accuracy:   {report.metrics['accuracy']:.3f}")
    print(f"auc:        {report.metrics['auc']:.3f}")
    print(f"loss:       {report.metrics['loss']:.3f}")
    for efficiency in (0.3, 0.5):
        metric_key = f"background_rejection@{efficiency:g}"
        if metric_key in report.metrics:
            print(f"rej@{efficiency:g}:    {report.metrics[metric_key]:.3g}")
    print(f"parameters: {int(report.metrics['parameters'])}")
    if args.out is not None:
        print(f"report:     {args.out}")
    if args.backend != "pennylane":
        print("\nSwitch --backend pennylane after installing qcuit[hep,qml].")
