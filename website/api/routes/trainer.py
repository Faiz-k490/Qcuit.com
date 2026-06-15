"""
Trainer API — Server-Sent Events streaming for variational training runs.

Blueprint: ``trainer_bp`` (url_prefix ``/api/trainer``)

Endpoints
---------
POST /api/trainer/run
    Accepts a JSON body describing the training config (or a preset name).
    Returns an SSE stream (``text/event-stream``), or a JSON array if the
    request has ``Accept: application/json``.

POST /api/trainer/preset
    Accepts ``{"name": "vqe_h2"}``, returns the preset config for frontend
    pre-population (JSON-serialisable subset — no callable objects).
"""

from __future__ import annotations

import json
from typing import Iterator

import numpy as np
from flask import Blueprint, Response, jsonify, request, stream_with_context

from api.diffsim import (
    Adam,
    SGD,
    train,
    Hamiltonian,
    real_amplitudes_ansatz,
    hardware_efficient_ansatz,
    single_qubit_rotation,
)
from api.diffsim.presets import PRESET_REGISTRY

trainer_bp = Blueprint("trainer", __name__, url_prefix="/api/trainer")


# ── Helpers ──────────────────────────────────────────────────────────────────

_ANSATZ_BUILDERS = {
    "real_amplitudes": real_amplitudes_ansatz,
    "hardware_efficient": hardware_efficient_ansatz,
    "single_qubit_rotation": lambda **_kw: single_qubit_rotation(),
}


def _build_optimizer(cfg: dict):
    """Instantiate an optimizer from a JSON-friendly config dict."""
    opt_type = cfg.get("type", "adam").lower()
    if opt_type == "sgd":
        return SGD(lr=cfg.get("lr", 0.1))
    # Default to Adam
    return Adam(
        lr=cfg.get("lr", 0.05),
        beta1=cfg.get("beta1", 0.9),
        beta2=cfg.get("beta2", 0.999),
        eps=cfg.get("eps", 1e-8),
    )


def _read_optimizer_field(body: dict) -> dict | None:
    """Pull optimizer config from any of the supported body keys.

    Accepts ``optimizer``, ``optimizer_config``, or nested under ``override``.
    Normalises ``name`` -> ``type`` so both naming conventions work.
    """
    raw = body.get("optimizer") or body.get("optimizer_config")
    if raw is None:
        return None
    cfg = dict(raw)
    if "name" in cfg and "type" not in cfg:
        cfg["type"] = cfg.pop("name")
    return cfg


def _config_from_request(body: dict) -> dict:
    """Resolve request body into a unified config dict.

    Three accepted shapes:
      1. ``{"preset": "vqe_h2", "seed": 42}`` — pure preset.
      2. ``{"preset": "vqe_h2", "optimizer": {...}, "max_iter": N, ...}`` —
         preset + per-field overrides (keys: ``optimizer``,
         ``optimizer_config``, ``max_iter``, ``init_params``, ``seed``).
      3. Fully custom: ``{"ansatz": ..., "ansatz_kwargs": ..., ...}``.
    """
    preset_name = body.get("preset")
    if preset_name:
        builder = PRESET_REGISTRY.get(preset_name)
        if builder is None:
            raise ValueError(
                f"Unknown preset {preset_name!r}. "
                f"Available: {list(PRESET_REGISTRY.keys())}"
            )
        seed = int(body.get("seed", 42))
        cfg = builder(seed=seed)

        # Apply per-field overrides if present.
        opt_override = _read_optimizer_field(body)
        if opt_override is not None:
            cfg["optimizer_config"] = opt_override
        if "max_iter" in body:
            cfg["max_iter"] = int(body["max_iter"])
        if "init_params" in body and body["init_params"]:
            cfg["init_params"] = np.asarray(body["init_params"], dtype=float)
        return cfg

    # ── Custom config ────────────────────────────────────────────────────
    ansatz_name = body.get("ansatz") or body.get("ansatz_name") or "real_amplitudes"
    ansatz_kwargs = body.get("ansatz_kwargs") or {}
    # Provide gentle default for ansatz_kwargs when only num_qubits is given.
    if "num_qubits" in body and "num_qubits" not in ansatz_kwargs:
        ansatz_kwargs = {**ansatz_kwargs, "num_qubits": int(body["num_qubits"])}
    if ansatz_name in ("real_amplitudes", "hardware_efficient") and "layers" not in ansatz_kwargs:
        ansatz_kwargs["layers"] = 2

    builder_fn = _ANSATZ_BUILDERS.get(ansatz_name)
    if builder_fn is None:
        raise ValueError(
            f"Unknown ansatz {ansatz_name!r}. "
            f"Available: {list(_ANSATZ_BUILDERS.keys())}"
        )

    circuit_fn, num_params = builder_fn(**ansatz_kwargs)
    num_qubits = int(body.get("num_qubits", ansatz_kwargs.get("num_qubits", 4)))

    # Init params — accept from body or generate randomly.
    init_params_raw = body.get("init_params")
    seed = int(body.get("seed", 42))
    if init_params_raw is not None and len(init_params_raw) > 0:
        init_params = np.asarray(init_params_raw, dtype=float)
    else:
        rng = np.random.default_rng(seed)
        init_params = rng.uniform(-np.pi, np.pi, size=num_params)

    # Observable — accept from body or default to vqe_h2.
    ham_str = body.get("hamiltonian_str")
    if ham_str:
        observable = Hamiltonian.from_string(ham_str, num_qubits=num_qubits)
    else:
        from api.diffsim.observables import vqe_h2_hamiltonian
        observable = vqe_h2_hamiltonian()

    optimizer_cfg = _read_optimizer_field(body) or {"type": "adam", "lr": 0.05}
    max_iter = int(body.get("max_iter", 60))

    return {
        "ansatz_name": ansatz_name,
        "ansatz_kwargs": ansatz_kwargs,
        "circuit_fn": circuit_fn,
        "num_params": int(num_params),
        "init_params": init_params,
        "observable": observable,
        "num_qubits": num_qubits,
        "optimizer_config": optimizer_cfg,
        "max_iter": max_iter,
        "seed": seed,
    }


def _sse_generate(cfg: dict) -> Iterator[str]:
    """Yield SSE-formatted ``data: {...}`` lines from a training run."""
    optimizer = _build_optimizer(cfg["optimizer_config"])
    final = None
    for step in train(
        circuit_fn=cfg["circuit_fn"],
        init_params=cfg["init_params"],
        observable=cfg["observable"],
        optimizer=optimizer,
        iterations=cfg["max_iter"],
        seed=cfg.get("seed", 0),
    ):
        final = step
        yield f"data: {json.dumps(step)}\n\n"
    # Terminal event so the client knows training is done.
    terminal = {
        "done": True,
        "final_loss": float(final["loss"]) if final else None,
        "final_params": list(final["params"]) if final else [],
    }
    yield f"data: {json.dumps(terminal)}\n\n"


# ── Routes ───────────────────────────────────────────────────────────────────

@trainer_bp.route("/run", methods=["POST"])
def run_training():
    """Launch a training run, streaming results as SSE or returning JSON."""
    try:
        body = request.get_json(force=True)
        cfg = _config_from_request(body)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    # JSON fallback: collect all steps and return as an array.
    accept = request.headers.get("Accept", "")
    if "application/json" in accept and "text/event-stream" not in accept:
        try:
            optimizer = _build_optimizer(cfg["optimizer_config"])
            steps = list(
                train(
                    circuit_fn=cfg["circuit_fn"],
                    init_params=cfg["init_params"],
                    observable=cfg["observable"],
                    optimizer=optimizer,
                    iterations=cfg["max_iter"],
                    seed=cfg.get("seed", 0),
                )
            )
            # Append a terminal entry mirroring the SSE shape.
            final = steps[-1] if steps else None
            steps.append({
                "done": True,
                "final_loss": float(final["loss"]) if final else None,
                "final_params": list(final["params"]) if final else [],
            })
            return jsonify(steps)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    # SSE stream (default).
    return Response(
        stream_with_context(_sse_generate(cfg)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@trainer_bp.route("/preset", methods=["POST"])
def get_preset():
    """Return the JSON-serialisable config for a named preset."""
    try:
        body = request.get_json(force=True)
        name = body.get("name")
        if not name:
            return jsonify({"error": "Missing 'name' field."}), 400

        builder = PRESET_REGISTRY.get(name)
        if builder is None:
            return jsonify({
                "error": f"Unknown preset {name!r}.",
                "available": list(PRESET_REGISTRY.keys()),
            }), 404

        seed = body.get("seed", 42)
        cfg = builder(seed=seed)

        # Normalise optimizer key so the frontend can read either alias.
        opt_cfg = dict(cfg["optimizer_config"])
        if "type" in opt_cfg and "name" not in opt_cfg:
            opt_cfg["name"] = opt_cfg["type"]

        return jsonify({
            "ansatz_name": cfg["ansatz_name"],
            "ansatz_kwargs": cfg.get("ansatz_kwargs", {}),
            "num_params": cfg["num_params"],
            "num_qubits": cfg["num_qubits"],
            "init_params": cfg["init_params"].tolist(),
            "optimizer": opt_cfg,
            "optimizer_config": opt_cfg,  # alias for legacy frontends
            "max_iter": cfg["max_iter"],
            "hamiltonian": cfg["observable"].to_dict(),
            "seed": cfg["seed"],
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
