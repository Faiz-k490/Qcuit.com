"""Headless benchmark runner for Qcuit research models."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any
import json
import random
import time

import numpy as np

from qcuit._optional import missing_extra
from qcuit.hep.metrics import binary_classification_metrics, parameter_count


def _torch():
    try:
        import torch
        from torch import nn, optim
    except ImportError as exc:
        raise missing_extra("torch", "hep", "Qcuit benchmark runner") from exc
    return torch, nn, optim


@dataclass
class BenchmarkReport:
    """Serializable benchmark result."""

    metrics: dict[str, float]
    history: list[dict[str, float]] = field(default_factory=list)
    config: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {"metrics": self.metrics, "history": self.history, "config": self.config}

    def to_json(self, path: str | Path) -> None:
        Path(path).write_text(json.dumps(self.to_dict(), indent=2))


def set_seed(seed: int) -> None:
    """Seed Python, NumPy, and Torch for reproducible research runs."""
    random.seed(seed)
    np.random.seed(seed)
    torch, _, _ = _torch()
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def _run_epoch(model: Any, loader: Any, *, optimizer: Any | None, loss_fn: Any, device: Any):
    torch, _, _ = _torch()
    is_train = optimizer is not None
    model.train(is_train)
    total_loss = 0.0
    total = 0
    correct = 0
    logits_all = []
    labels_all = []
    start = time.time()

    for batch in loader:
        batch = batch.to(device)
        if optimizer is not None:
            optimizer.zero_grad()
        logits = model.forward_batch(batch) if hasattr(model, "forward_batch") else model(
            scalars=batch.scalars,
            x=batch.p4s,
            edges=batch.edges,
            node_mask=batch.node_mask,
            edge_mask=batch.edge_mask,
            n_nodes=batch.n_nodes,
        )
        loss = loss_fn(logits, batch.labels)
        if optimizer is not None:
            loss.backward()
            optimizer.step()

        labels = batch.labels.detach().cpu()
        logits_cpu = logits.detach().cpu()
        total_loss += float(loss.item()) * labels.numel()
        total += int(labels.numel())
        correct += int((logits_cpu.argmax(dim=1) == labels).sum().item())
        logits_all.append(logits_cpu)
        labels_all.append(labels)

    logits_np = torch.cat(logits_all).numpy()
    labels_np = torch.cat(labels_all).numpy()
    metrics = binary_classification_metrics(labels_np, logits_np)
    metrics.update(
        {
            "loss": total_loss / max(total, 1),
            "accuracy": correct / max(total, 1),
            "seconds": time.time() - start,
        }
    )
    return metrics


def benchmark_classifier(
    model: Any,
    dataset: Any,
    *,
    epochs: int = 10,
    batch_size: int = 32,
    lr: float = 1e-3,
    weight_decay: float = 1e-2,
    seed: int = 0,
    device: str | None = None,
    out: str | Path | None = None,
) -> BenchmarkReport:
    """Train/evaluate a classifier and return reproducible benchmark metrics."""
    torch, nn, optim = _torch()
    set_seed(seed)
    run_device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
    model = model.to(run_device)
    loaders = dataset.dataloaders(batch_size=batch_size, seed=seed)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    loss_fn = nn.CrossEntropyLoss()

    history = []
    best_val = -1.0
    best_state = None
    for epoch in range(epochs):
        train_metrics = _run_epoch(model, loaders["train"], optimizer=optimizer, loss_fn=loss_fn, device=run_device)
        with torch.no_grad():
            val_metrics = _run_epoch(model, loaders["val"], optimizer=None, loss_fn=loss_fn, device=run_device)
        row = {
            "epoch": float(epoch),
            "train_loss": train_metrics["loss"],
            "train_accuracy": train_metrics["accuracy"],
            "val_loss": val_metrics["loss"],
            "val_accuracy": val_metrics["accuracy"],
            "val_auc": val_metrics["auc"],
        }
        history.append(row)
        if val_metrics["accuracy"] >= best_val:
            best_val = val_metrics["accuracy"]
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    if best_state is not None:
        model.load_state_dict(best_state)
    with torch.no_grad():
        test_metrics = _run_epoch(model, loaders["test"], optimizer=None, loss_fn=loss_fn, device=run_device)
    test_metrics["parameters"] = float(parameter_count(model))

    report = BenchmarkReport(
        metrics=test_metrics,
        history=history,
        config={
            "epochs": epochs,
            "batch_size": batch_size,
            "lr": lr,
            "weight_decay": weight_decay,
            "seed": seed,
            "device": str(run_device),
            "model": model.__class__.__name__,
        },
    )
    if out is not None:
        report.to_json(out)
    return report
