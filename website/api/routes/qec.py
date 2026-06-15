"""
QEC Sandbox API — Phase 7.

Blueprint: ``qec_bp`` (url_prefix ``/api/qec``)

Endpoints
---------
GET  /api/qec/codes
    List of available code names.

POST /api/qec/code
    Body: ``{"name": "repetition_3" | "steane_7" | "shor_9" | "surface_d3"}``
    Returns the JSON-serialisable :class:`Code` description (qubit layout,
    stabilisers, logical operators).

POST /api/qec/syndrome
    Body: ``{"code": "...", "errors": [{"pauli": "X", "qubit": 1}, ...]}``
    Returns ``{"syndrome": [...], "stabiliser_names": [...]}``.

POST /api/qec/decode
    Body: ``{"code": "...", "syndrome": [0,1,...]}``
    Returns ``{"recovery": {...}}``.

POST /api/qec/run
    Body: ``{"code": "...", "errors": [...]}``
    Returns the full inject → measure → decode → verify pipeline output
    (see :func:`api.qec.run_round`).
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from api.qec import (
    CODE_REGISTRY,
    decode_for,
    parse_errors,
    run_round,
    syndrome_for,
)


qec_bp = Blueprint("qec", __name__, url_prefix="/api/qec")


@qec_bp.route("/codes", methods=["GET"])
def list_codes():
    return jsonify({"codes": list(CODE_REGISTRY.keys())})


@qec_bp.route("/code", methods=["POST"])
def get_code():
    try:
        body = request.get_json(force=True) or {}
        name = body.get("name")
        if not name:
            return jsonify({"error": "Missing 'name' field."}), 400
        code = CODE_REGISTRY.get(name)
        if code is None:
            return jsonify({
                "error": f"Unknown code {name!r}.",
                "available": list(CODE_REGISTRY.keys()),
            }), 404
        return jsonify(code.to_dict())
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@qec_bp.route("/syndrome", methods=["POST"])
def get_syndrome():
    try:
        body = request.get_json(force=True) or {}
        name = body.get("code")
        code = CODE_REGISTRY.get(name)
        if code is None:
            return jsonify({"error": f"Unknown code {name!r}."}), 404
        errors = body.get("errors", [])
        err = parse_errors(code.num_data, errors)
        s = syndrome_for(code, err)
        return jsonify({
            "syndrome": s,
            "stabiliser_names": [st.name for st in code.stabilisers],
            "errors": err.to_dict(),
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@qec_bp.route("/decode", methods=["POST"])
def post_decode():
    try:
        body = request.get_json(force=True) or {}
        name = body.get("code")
        code = CODE_REGISTRY.get(name)
        if code is None:
            return jsonify({"error": f"Unknown code {name!r}."}), 404
        syndrome = body.get("syndrome", [])
        if len(syndrome) != code.num_stabilisers:
            return jsonify({
                "error": (
                    f"Syndrome length {len(syndrome)} != "
                    f"num_stabilisers {code.num_stabilisers}"
                )
            }), 400
        recovery = decode_for(code, syndrome)
        return jsonify({"recovery": recovery.to_dict(), "decoder": code.decoder})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400


@qec_bp.route("/run", methods=["POST"])
def post_run():
    try:
        body = request.get_json(force=True) or {}
        name = body.get("code")
        errors = body.get("errors", [])
        result = run_round(name, errors)
        return jsonify(result)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400
