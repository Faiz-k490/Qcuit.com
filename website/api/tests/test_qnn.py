"""
QML Lab QNN tests.

Coverage:
    1. Encoders preserve normalisation and produce different states for
       different inputs.
    2. QNNModel forward/predict shapes and value ranges.
    3. Parameter-shift gradient through QNN matches finite difference.
    4. XOR preset trains to >= 0.85 accuracy in 25 Adam iters.
    5. /preset endpoint returns valid preset config.
    6. /train JSON fallback returns trajectory + done event.
    7. /predict produces labels in {-1,+1}.
    8. /export emits valid PennyLane and Qiskit-ML code stubs.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from api.qnn import (
    QNNModel,
    angle_encoder,
    moons_dataset,
    parity_preset,
    qnn_train,
    real_amplitudes_ansatz,
    xor_dataset,
    xor_preset,
    zz_feature_map,
    to_pennylane,
    to_qiskit_ml,
)
from api.qnn.models import _z0_hamiltonian
from api.diffsim.optimizer import Adam


# ─── 1. Encoders ─────────────────────────────────────────────────────────────
class TestEncoders:
    def test_angle_encoder_preserves_normalisation(self):
        enc = angle_encoder(num_qubits=3)
        x = np.array([0.1, 0.5, 0.9])
        psi = enc.apply(None, x)
        assert math.isclose(np.linalg.norm(psi), 1.0, abs_tol=1e-9)

    def test_angle_encoder_distinguishes_inputs(self):
        enc = angle_encoder(num_qubits=2)
        psi_a = enc.apply(None, np.array([0.0, 0.0]))
        psi_b = enc.apply(None, np.array([np.pi, np.pi]))
        # Should not be the same up to global phase.
        assert not np.allclose(np.abs(psi_a), np.abs(psi_b))

    def test_zz_feature_map_normalised(self):
        enc = zz_feature_map(num_qubits=2, reps=1)
        psi = enc.apply(None, np.array([0.7, 1.2]))
        assert math.isclose(np.linalg.norm(psi), 1.0, abs_tol=1e-9)


# ─── 2. QNN forward / predict ────────────────────────────────────────────────
class TestQNNForward:
    def test_forward_state_normalised(self):
        enc = angle_encoder(2)
        ans = real_amplitudes_ansatz(2, 2)
        model = QNNModel(encoder=enc, ansatz=ans)
        theta = np.zeros(model.num_params)
        psi = model.forward_state(np.array([0.3, 0.5]), theta)
        assert math.isclose(np.linalg.norm(psi), 1.0, abs_tol=1e-9)

    def test_predict_value_in_range(self):
        enc = angle_encoder(2)
        ans = real_amplitudes_ansatz(2, 2)
        model = QNNModel(encoder=enc, ansatz=ans)
        theta = np.array([0.1, 0.2, 0.3, 0.4])
        v = model.predict_value(np.array([0.5, 0.5]), theta)
        assert -1.0 - 1e-9 <= v <= 1.0 + 1e-9

    def test_qubit_mismatch_raises(self):
        enc = angle_encoder(2)
        ans = real_amplitudes_ansatz(3, 2)
        with pytest.raises(ValueError):
            QNNModel(encoder=enc, ansatz=ans)


# ─── 3. Gradient correctness ─────────────────────────────────────────────────
class TestQNNGradient:
    def test_grad_matches_finite_difference(self):
        enc = angle_encoder(2)
        ans = real_amplitudes_ansatz(2, 2)
        model = QNNModel(encoder=enc, ansatz=ans)

        rng = np.random.default_rng(0)
        X = rng.uniform(0, np.pi, size=(4, 2))
        y = np.array([1.0, -1.0, 1.0, -1.0])
        theta = rng.uniform(-np.pi, np.pi, size=ans.num_params)

        grad_ps = model.grad(X, y, theta)

        # Finite difference reference.
        h = 1e-3
        grad_fd = np.zeros_like(theta)
        for k in range(theta.size):
            tp = theta.copy(); tp[k] += h
            tm = theta.copy(); tm[k] -= h
            lp, _, _ = model.loss(X, y, tp)
            lm, _, _ = model.loss(X, y, tm)
            grad_fd[k] = (lp - lm) / (2 * h)

        assert np.allclose(grad_ps, grad_fd, atol=1e-4), (
            f"PS {grad_ps} vs FD {grad_fd}"
        )


# ─── 4. XOR convergence ──────────────────────────────────────────────────────
class TestXORConverges:
    def test_xor_preset_reaches_high_accuracy(self):
        cfg = xor_preset(seed=11)
        steps = list(qnn_train(
            cfg["model"], cfg["dataset"]["X"], cfg["dataset"]["y"],
            cfg["init_theta"],
            optimizer=Adam(lr=cfg["optimizer_config"]["lr"]),
            iterations=cfg["max_iter"],
            seed=cfg["seed"],
        ))
        final = steps[-1]
        assert final["accuracy"] >= 0.85, (
            f"XOR did not converge: final acc = {final['accuracy']}, "
            f"final loss = {final['loss']}"
        )
        # Loss must monotonically decrease overall.
        assert final["loss"] < steps[0]["loss"]


# ─── 5. /preset endpoint ─────────────────────────────────────────────────────
class TestPresetEndpoint:
    def test_xor_preset_returns_valid_config(self, client):
        resp = client.post("/api/qnn/preset", json={"name": "xor"})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["encoder"]["name"] == "angle"
        assert body["dataset"]["name"] == "xor"
        assert body["num_qubits"] == 2
        assert len(body["init_theta"]) == body["num_params"]
        assert len(body["dataset"]["X"]) == body["dataset"]["num_samples"]

    def test_unknown_preset_returns_404(self, client):
        resp = client.post("/api/qnn/preset", json={"name": "nope"})
        assert resp.status_code == 404


# ─── 6. /train JSON fallback ─────────────────────────────────────────────────
class TestTrainEndpoint:
    def test_train_returns_trajectory(self, client):
        resp = client.post(
            "/api/qnn/train",
            json={"preset": "xor", "seed": 42, "max_iter": 4},
            headers={"Accept": "application/json"},
        )
        assert resp.status_code == 200
        steps = resp.get_json()
        assert isinstance(steps, list)
        # init + 4 iters + done event
        assert len(steps) == 4 + 1 + 1
        # All non-terminal steps have loss + accuracy.
        for s in steps[:-1]:
            assert "loss" in s
            assert "accuracy" in s
            assert "iter" in s
        assert steps[-1]["done"] is True
        assert steps[-1]["final_accuracy"] is not None


# ─── 7. /predict ─────────────────────────────────────────────────────────────
class TestPredictEndpoint:
    def test_predict_returns_labels(self, client):
        cfg = xor_preset(seed=0)
        resp = client.post(
            "/api/qnn/predict",
            json={
                "preset": "xor",
                "theta": cfg["init_theta"].tolist(),
                "x": [[0.0, 0.0], [np.pi, 0.0]],
            },
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert len(body["predictions"]) == 2
        for p in body["predictions"]:
            assert p in (-1, 1)
        for v in body["values"]:
            assert -1.0 - 1e-9 <= v <= 1.0 + 1e-9


# ─── 8. /export ──────────────────────────────────────────────────────────────
class TestExportEndpoint:
    def test_export_pennylane(self, client):
        cfg = xor_preset(seed=0)
        resp = client.post(
            "/api/qnn/export",
            json={
                "preset": "xor",
                "theta": cfg["init_theta"].tolist(),
                "framework": "pennylane",
            },
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert "import pennylane" in body["code"]
        assert "qml.qnode" in body["code"]

    def test_export_qiskit_ml(self, client):
        cfg = xor_preset(seed=0)
        resp = client.post(
            "/api/qnn/export",
            json={
                "preset": "xor",
                "theta": cfg["init_theta"].tolist(),
                "framework": "qiskit_ml",
            },
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert "qiskit" in body["code"].lower()

    def test_export_pennylane_direct(self):
        cfg = xor_preset(seed=0)
        code = to_pennylane(cfg["model"], cfg["init_theta"])
        assert "qml.qnode" in code
        assert "PauliZ(0)" in code

    def test_export_qiskit_ml_direct(self):
        cfg = xor_preset(seed=0)
        code = to_qiskit_ml(cfg["model"], cfg["init_theta"])
        assert "EstimatorQNN" in code


# ─── 9. Library package compatibility ───────────────────────────────────────
def test_library_package_imports():
    import qcuit.qnn as Q

    cfg = Q.xor_preset(seed=0)
    assert cfg["model"].num_qubits == xor_preset(seed=0)["model"].num_qubits
    assert cfg["dataset"]["X"].shape == xor_dataset()["X"].shape
    assert callable(Q.qnn_train)
    assert callable(Q.to_pennylane)


# ─── 10. Determinism ─────────────────────────────────────────────────────────
def test_same_seed_same_trajectory():
    cfg1 = xor_preset(seed=7)
    cfg2 = xor_preset(seed=7)
    s1 = list(qnn_train(
        cfg1["model"], cfg1["dataset"]["X"], cfg1["dataset"]["y"],
        cfg1["init_theta"], optimizer=Adam(lr=0.1), iterations=4, seed=7,
    ))
    s2 = list(qnn_train(
        cfg2["model"], cfg2["dataset"]["X"], cfg2["dataset"]["y"],
        cfg2["init_theta"], optimizer=Adam(lr=0.1), iterations=4, seed=7,
    ))
    assert np.allclose([x["loss"] for x in s1], [x["loss"] for x in s2], atol=1e-12)
