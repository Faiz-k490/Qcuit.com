"""
Noise Lab API — Phase 2.

Blueprint: ``noise_bp`` (url_prefix ``/api/noise``)

Endpoints
---------
GET  /api/noise/snapshots
    Names of all calibration snapshots discovered on disk.

POST /api/noise/snapshot
    Body: ``{"name": "ibm_brisbane_2024"}``
    Returns the full :class:`CalibrationSnapshot` payload plus summary
    statistics.

POST /api/noise/apply
    Body: ``{"snapshot": str, "gate_counts": {"1q": int, "2q": int, "meas": int},
            "depth": int}``
    Returns the per-channel error budget and total fidelity.

POST /api/noise/fidelity-curve
    Body: ``{"snapshot": str, "gate_mix": {"1q": int, "2q": int},
            "max_depth": int, "step": int?}``
    Returns ``[{"depth": d, "fidelity": F, "total_err": ε}, ...]``.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from api.noise import (
    SNAPSHOT_REGISTRY,
    circuit_error_budget,
    fidelity_vs_depth,
    list_snapshots,
    load_snapshot,
)


noise_bp = Blueprint("noise", __name__, url_prefix="/api/noise")


@noise_bp.route("/snapshots", methods=["GET"])
def get_snapshots():
    SNAPSHOT_REGISTRY.refresh()
    return jsonify({"snapshots": list_snapshots()})


@noise_bp.route("/snapshot", methods=["POST"])
def post_snapshot():
    body = request.get_json(force=True) or {}
    name = body.get("name")
    if not name:
        return jsonify({"error": "Missing 'name' field."}), 400
    try:
        snap = load_snapshot(name)
    except ValueError as exc:
        return jsonify({"error": str(exc), "available": list_snapshots()}), 404
    return jsonify(snap.to_dict())


@noise_bp.route("/apply", methods=["POST"])
def post_apply():
    try:
        body = request.get_json(force=True) or {}
        name = body.get("snapshot")
        if not name:
            return jsonify({"error": "Missing 'snapshot' field."}), 400
        snap = load_snapshot(name)
        gate_counts = body.get("gate_counts") or {}
        depth = int(body.get("depth", 1))
        num_meas = body.get("num_measurements")
        if num_meas is not None:
            num_meas = int(num_meas)
        eb = circuit_error_budget(
            snap, gate_counts, depth=depth, num_measurements=num_meas
        )
        return jsonify(eb.to_dict())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


@noise_bp.route("/fidelity-curve", methods=["POST"])
def post_fidelity_curve():
    try:
        body = request.get_json(force=True) or {}
        name = body.get("snapshot")
        if not name:
            return jsonify({"error": "Missing 'snapshot' field."}), 400
        snap = load_snapshot(name)
        gate_mix = body.get("gate_mix") or {"1q": 5, "2q": 1}
        max_depth = int(body.get("max_depth", 50))
        step = int(body.get("step", 1))
        curve = fidelity_vs_depth(
            snap, gate_mix=gate_mix, max_depth=max_depth, step=step
        )
        return jsonify({"curve": curve, "snapshot": snap.name})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
