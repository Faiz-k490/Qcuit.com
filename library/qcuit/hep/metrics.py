"""Classification and resource metrics for HEP QML benchmarks."""

from __future__ import annotations

from typing import Any

import numpy as np


def parameter_count(model: Any, *, trainable_only: bool = True) -> int:
    """Count model parameters for fair classical/quantum comparisons."""
    params = model.parameters()
    if trainable_only:
        return int(sum(p.numel() for p in params if getattr(p, "requires_grad", False)))
    return int(sum(p.numel() for p in params))


def build_roc(labels: Any, scores: Any, target_efficiencies: list[float] | None = None) -> dict[str, Any]:
    """Build ROC arrays and background rejection at target signal efficiencies."""
    from sklearn.metrics import roc_auc_score, roc_curve

    target_efficiencies = target_efficiencies or [0.3, 0.5]
    y = np.asarray(labels).reshape(-1)
    s = np.asarray(scores).reshape(-1)
    fpr, tpr, thresholds = roc_curve(y, s)
    auc = float(roc_auc_score(y, s)) if len(np.unique(y)) > 1 else float("nan")
    rejection = {}
    for eff in target_efficiencies:
        candidates = np.flatnonzero(tpr >= eff)
        if candidates.size:
            idx = int(candidates[np.argmin(tpr[candidates] - eff)])
        else:
            idx = int(np.argmax(tpr))
        rejection[str(eff)] = float(1.0 / max(fpr[idx], 1e-12))
    return {
        "fpr": fpr,
        "tpr": tpr,
        "thresholds": thresholds,
        "auc": auc,
        "background_rejection": rejection,
    }


def background_rejection(labels: Any, scores: Any, target_efficiency: float = 0.3) -> float:
    """Return ``1 / false_positive_rate`` at a target signal efficiency."""
    return float(build_roc(labels, scores, [target_efficiency])["background_rejection"][str(target_efficiency)])


def _background_rejection_metric_key(target_efficiency: float) -> str:
    return f"background_rejection@{target_efficiency:g}"


def binary_classification_metrics(
    labels: Any,
    logits_or_scores: Any,
    target_efficiencies: list[float] | None = None,
) -> dict[str, float]:
    """Return accuracy, AUC, and fixed-efficiency rejection metrics."""
    target_efficiencies = [0.3, 0.5] if target_efficiencies is None else list(target_efficiencies)
    values = np.asarray(logits_or_scores)
    labels_np = np.asarray(labels).reshape(-1)
    if values.ndim == 2 and values.shape[1] >= 2:
        exp = np.exp(values - np.max(values, axis=1, keepdims=True))
        probs = exp / exp.sum(axis=1, keepdims=True)
        scores = probs[:, 1]
        pred = np.argmax(values, axis=1)
    else:
        scores = values.reshape(-1)
        pred = (scores >= 0.5).astype(int)
    acc = float(np.mean(pred == labels_np))
    metrics = {"accuracy": acc}
    if len(np.unique(labels_np)) > 1:
        roc = build_roc(labels_np, scores, target_efficiencies)
        metrics["auc"] = float(roc["auc"])
        for efficiency, rejection in roc["background_rejection"].items():
            metrics[_background_rejection_metric_key(float(efficiency))] = float(rejection)
    else:
        metrics["auc"] = float("nan")
        for efficiency in target_efficiencies:
            metrics[_background_rejection_metric_key(efficiency)] = float("nan")
    return metrics
