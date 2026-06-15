"""
QML Lab QNN API.

Blueprint: ``qnn_bp`` (url_prefix ``/api/qnn``)

Endpoints
---------
POST /api/qnn/preset
    Body: ``{"name": "xor" | "parity" | "moons", "seed": 42}``.
    Returns a JSON-serialisable description of the preset (no callables).

POST /api/qnn/train
    Body: ``{"preset": ..., "seed": ..., "max_iter": ..., "optimizer": {...}}``
    or a fully custom config (``{"encoder": ..., "ansatz": ..., "dataset": ...}``).
    Returns an SSE stream of ``{iter, loss, accuracy, ...}`` dicts, or a JSON
    array when ``Accept: application/json`` is set.

POST /api/qnn/predict
    Body: ``{"preset": ..., "theta": [...], "x": [[...], ...]}``.
    Returns ``{"predictions": [...], "values": [...]}`` for each input.

POST /api/qnn/export
    Body: ``{"preset": ..., "theta": [...], "framework": "pennylane" | "qiskit_ml"}``.
    Returns ``{"code": "..."}``.

GET  /api/qnn/datasets
    List of available built-in datasets.
"""

from __future__ import annotations

import json
from typing import Iterator

import numpy as np
from flask import Blueprint, Response, jsonify, request, stream_with_context

from api.diffsim.optimizer import Adam, SGD
from api.qnn import (
    DATASET_REGISTRY,
    QNNModel,
    qnn_train,
    to_pennylane,
    to_qiskit_ml,
)
from api.qnn.ansatze import ANSATZ_REGISTRY
from api.qnn.encoders import ENCODER_REGISTRY
from api.qnn.presets import PRESET_REGISTRY


qnn_bp = Blueprint("qnn", __name__, url_prefix="/api/qnn")


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _build_optimizer(cfg: dict):
    opt_type = (cfg.get("type") or cfg.get("name") or "adam").lower()
    if opt_type == "sgd":
        return SGD(lr=float(cfg.get("lr", 0.1)))
    return Adam(
        lr=float(cfg.get("lr", 0.1)),
        beta1=float(cfg.get("beta1", 0.9)),
        beta2=float(cfg.get("beta2", 0.999)),
        eps=float(cfg.get("eps", 1e-8)),
    )


def _build_encoder(spec: dict):
    name = spec.get("name", "angle")
    builder = ENCODER_REGISTRY.get(name)
    if builder is None:
        raise ValueError(f"Unknown encoder {name!r}. Available: {list(ENCODER_REGISTRY)}")
    kwargs = {k: v for k, v in spec.items() if k != "name"}
    return builder(**kwargs)


def _build_ansatz(spec: dict):
    name = spec.get("name", "real_amplitudes")
    builder = ANSATZ_REGISTRY.get(name)
    if builder is None:
        raise ValueError(f"Unknown ansatz {name!r}. Available: {list(ANSATZ_REGISTRY)}")
    kwargs = {k: v for k, v in spec.items() if k != "name"}
    return builder(**kwargs)


def _build_dataset(spec) -> dict:
    """``spec`` may be either a string name or ``{name, kwargs}``."""
    if isinstance(spec, str):
        name, kwargs = spec, {}
    else:
        name = spec.get("name", "xor")
        kwargs = {k: v for k, v in spec.items() if k != "name"}
    builder = DATASET_REGISTRY.get(name)
    if builder is None:
        raise ValueError(f"Unknown dataset {name!r}. Available: {list(DATASET_REGISTRY)}")
    return builder(**kwargs)


def _resolve_config(body: dict) -> dict:
    """Return a config dict with: model, X, y, init_theta, optimizer_config,
    max_iter, seed, preset_name (optional)."""
    preset_name = body.get("preset")
    if preset_name:
        builder = PRESET_REGISTRY.get(preset_name)
        if builder is None:
            raise ValueError(f"Unknown preset {preset_name!r}.")
        seed = int(body.get("seed", 42))
        cfg = builder(seed=seed)
        if "max_iter" in body:
            cfg["max_iter"] = int(body["max_iter"])
        if "optimizer" in body:
            cfg["optimizer_config"] = dict(body["optimizer"])
        if "init_theta" in body and body["init_theta"]:
            cfg["init_theta"] = np.asarray(body["init_theta"], dtype=float)
        return {
            "preset": preset_name,
            "model": cfg["model"],
            "X": cfg["dataset"]["X"],
            "y": cfg["dataset"]["y"],
            "dataset_name": cfg["dataset"]["name"],
            "init_theta": np.asarray(cfg["init_theta"], dtype=float),
            "optimizer_config": cfg["optimizer_config"],
            "max_iter": cfg["max_iter"],
            "seed": seed,
        }

    # Custom config.
    encoder = _build_encoder(body.get("encoder", {"name": "angle", "num_qubits": 2}))
    ansatz = _build_ansatz(body.get("ansatz", {"name": "real_amplitudes",
                                               "num_qubits": encoder.num_qubits,
                                               "layers": 2}))
    dataset = _build_dataset(body.get("dataset", "xor"))
    model = QNNModel(encoder=encoder, ansatz=ansatz)
    seed = int(body.get("seed", 42))
    init_theta = body.get("init_theta")
    if init_theta is None or len(init_theta) == 0:
        rng = np.random.default_rng(seed)
        init_theta = rng.uniform(-np.pi, np.pi, size=ansatz.num_params)
    else:
        init_theta = np.asarray(init_theta, dtype=float)

    return {
        "preset": None,
        "model": model,
        "X": dataset["X"],
        "y": dataset["y"],
        "dataset_name": dataset["name"],
        "init_theta": init_theta,
        "optimizer_config": body.get("optimizer", {"type": "adam", "lr": 0.1}),
        "max_iter": int(body.get("max_iter", 25)),
        "seed": seed,
    }


# ─── /preset ────────────────────────────────────────────────────────────────
@qnn_bp.route("/preset", methods=["POST"])
def get_preset():
    try:
        body = request.get_json(force=True) or {}
        name = body.get("name")
        if not name:
            return jsonify({"error": "Missing 'name' field."}), 400
        builder = PRESET_REGISTRY.get(name)
        if builder is None:
            return jsonify({
                "error": f"Unknown preset {name!r}.",
                "available": list(PRESET_REGISTRY.keys()),
            }), 404
        seed = int(body.get("seed", 42))
        cfg = builder(seed=seed)

        return jsonify({
            "name": cfg["name"],
            "encoder": cfg["encoder"].to_dict(),
            "ansatz": cfg["ansatz"].to_dict(),
            "dataset": {
                "name": cfg["dataset"]["name"],
                "feature_dim": cfg["dataset"]["feature_dim"],
                "num_samples": int(cfg["dataset"]["X"].shape[0]),
                "X": cfg["dataset"]["X"].tolist(),
                "y": cfg["dataset"]["y"].tolist(),
            },
            "init_theta": cfg["init_theta"].tolist(),
            "num_params": int(cfg["ansatz"].num_params),
            "num_qubits": int(cfg["ansatz"].num_qubits),
            "optimizer": cfg["optimizer_config"],
            "max_iter": int(cfg["max_iter"]),
            "seed": int(cfg["seed"]),
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ─── /train (SSE or JSON) ───────────────────────────────────────────────────
def _sse_train(cfg: dict) -> Iterator[str]:
    optimizer = _build_optimizer(cfg["optimizer_config"])
    final = None
    for step in qnn_train(
        cfg["model"], cfg["X"], cfg["y"], cfg["init_theta"],
        optimizer=optimizer, iterations=cfg["max_iter"], seed=cfg["seed"],
    ):
        final = step
        yield f"data: {json.dumps(step)}\n\n"
    yield f"data: {json.dumps({'done': True, 'final_loss': float(final['loss']) if final else None, 'final_accuracy': float(final['accuracy']) if final else None, 'final_params': list(final['params']) if final else []})}\n\n"


@qnn_bp.route("/train", methods=["POST"])
def train_qnn():
    try:
        body = request.get_json(force=True) or {}
        cfg = _resolve_config(body)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    accept = request.headers.get("Accept", "")
    if "application/json" in accept and "text/event-stream" not in accept:
        try:
            optimizer = _build_optimizer(cfg["optimizer_config"])
            steps = list(qnn_train(
                cfg["model"], cfg["X"], cfg["y"], cfg["init_theta"],
                optimizer=optimizer, iterations=cfg["max_iter"], seed=cfg["seed"],
            ))
            final = steps[-1] if steps else None
            steps.append({
                "done": True,
                "final_loss": float(final["loss"]) if final else None,
                "final_accuracy": float(final["accuracy"]) if final else None,
                "final_params": list(final["params"]) if final else [],
            })
            return jsonify(steps)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    return Response(
        stream_with_context(_sse_train(cfg)),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── /predict ───────────────────────────────────────────────────────────────
@qnn_bp.route("/predict", methods=["POST"])
def predict_qnn():
    try:
        body = request.get_json(force=True) or {}
        cfg = _resolve_config(body)
        theta = np.asarray(body.get("theta", cfg["init_theta"]), dtype=float)
        X_in = np.asarray(body["x"], dtype=float)
        if X_in.ndim == 1:
            X_in = X_in.reshape(1, -1)

        model = cfg["model"]
        values = [model.predict_value(X_in[i], theta) for i in range(X_in.shape[0])]
        labels = [int(np.sign(v) if v != 0 else 1) for v in values]
        return jsonify({"values": values, "predictions": labels})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


# ─── /export ────────────────────────────────────────────────────────────────
@qnn_bp.route("/export", methods=["POST"])
def export_qnn():
    try:
        body = request.get_json(force=True) or {}
        cfg = _resolve_config(body)
        theta = np.asarray(body.get("theta", cfg["init_theta"]), dtype=float)
        framework = (body.get("framework") or "pennylane").lower()

        if framework == "pennylane":
            code = to_pennylane(cfg["model"], theta)
        elif framework in ("qiskit_ml", "qiskit-ml", "qiskit"):
            code = to_qiskit_ml(cfg["model"], theta)
        else:
            return jsonify({"error": f"Unknown framework {framework!r}."}), 400
        return jsonify({"framework": framework, "code": code})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


# ─── /datasets ──────────────────────────────────────────────────────────────
@qnn_bp.route("/datasets", methods=["GET"])
def list_datasets():
    return jsonify({"datasets": list(DATASET_REGISTRY.keys())})
