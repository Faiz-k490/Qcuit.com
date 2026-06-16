import torch
import pytest

from qcuit.benchmarks import benchmark_classifier
from qcuit.hep.metrics import binary_classification_metrics
from qcuit.hep import JetDataset
from qcuit.models import LorentzNet


def test_binary_classification_metrics_include_background_rejection():
    metrics = binary_classification_metrics(
        labels=[0, 0, 1, 1],
        logits_or_scores=[0.1, 0.2, 0.8, 0.9],
    )

    assert metrics["accuracy"] == 1.0
    assert metrics["auc"] == 1.0
    assert metrics["background_rejection@0.3"] == pytest.approx(1.0e12)
    assert metrics["background_rejection@0.5"] == pytest.approx(1.0e12)


def test_background_rejection_requires_target_signal_efficiency():
    metrics = binary_classification_metrics(
        labels=[0, 1],
        logits_or_scores=[0.9, 0.1],
    )

    assert metrics["auc"] == 0.0
    assert metrics["background_rejection@0.3"] == pytest.approx(1.0)
    assert metrics["background_rejection@0.5"] == pytest.approx(1.0)


def test_benchmark_classifier_returns_report_schema():
    p4s = torch.tensor(
        [
            [[5.0, 1.0, 0.0, 0.0], [4.0, 0.0, 1.0, 0.0]],
            [[6.0, 1.0, 1.0, 0.0], [3.0, 0.0, 0.0, 1.0]],
            [[7.0, 0.5, 0.2, 0.1], [2.0, 0.2, 0.1, 0.4]],
            [[4.0, 0.1, 0.3, 0.2], [3.0, 0.4, 0.2, 0.1]],
            [[8.0, 1.2, 0.2, 0.0], [5.0, 0.0, 0.4, 0.3]],
            [[9.0, 0.2, 1.1, 0.2], [4.0, 0.5, 0.1, 0.1]],
        ]
    )
    scalars = torch.randn(6, 2, 1)
    labels = torch.tensor([0, 1, 0, 1, 0, 1])
    dataset = JetDataset.from_arrays(p4s, scalars, labels)
    model = LorentzNet(n_scalar=dataset.n_scalar, n_hidden=2, n_layers=1)

    report = benchmark_classifier(model, dataset, epochs=1, batch_size=2, seed=4, device="cpu")

    assert "accuracy" in report.metrics
    assert "background_rejection@0.3" in report.metrics
    assert "background_rejection@0.5" in report.metrics
    assert "parameters" in report.metrics
    assert report.config["model"] == "LorentzNet"
    assert len(report.history) == 1
