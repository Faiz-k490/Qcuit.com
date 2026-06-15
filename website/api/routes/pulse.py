"""
Pulse Lab API — Phase 8.

Blueprint: ``pulse_bp`` (url_prefix ``/api/pulse``)

Endpoints
---------
GET  /api/pulse/presets
    List of available preset names.

POST /api/pulse/preset
    Body: ``{"name": "rabi" | "pi_pulse" | "sqrt_x"}``
    Returns the preset config dict (envelope kind, kwargs, duration, etc).

POST /api/pulse/simulate
    Body: ``{"envelope": "gaussian" | ..., "envelope_kwargs": {...},
            "duration": float, "dt": float, "detuning": float,
            "drag_alpha": float, "n_samples": int, "psi0": [c0, c1]?}``
    Returns the full TDSE result: Bloch trajectory samples + final state +
    π-pulse fidelity.

POST /api/pulse/calibrate
    Body: ``{"envelope": "gaussian", "target": "pi" | "sqrt_x",
            "duration": float, "sigma": float?}``
    Returns the amplitude that yields the requested rotation angle.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from api.pulse import (
    ENVELOPE_REGISTRY,
    PRESET_REGISTRY,
    pi_amplitude,
    simulate,
    sqrt_x_amplitude,
)


pulse_bp = Blueprint("pulse", __name__, url_prefix="/api/pulse")


@pulse_bp.route("/presets", methods=["GET"])
def list_presets():
    return jsonify({"presets": list(PRESET_REGISTRY.keys())})


@pulse_bp.route("/preset", methods=["POST"])
def get_preset():
    body = request.get_json(force=True) or {}
    name = body.get("name")
    builder = PRESET_REGISTRY.get(name)
    if builder is None:
        return jsonify({
            "error": f"Unknown preset {name!r}.",
            "available": list(PRESET_REGISTRY.keys()),
        }), 404
    return jsonify(builder())


def _build_envelope(body: dict):
    kind = body.get("envelope")
    if kind not in ENVELOPE_REGISTRY:
        raise ValueError(
            f"Unknown envelope {kind!r}. Available: {list(ENVELOPE_REGISTRY)}"
        )
    kwargs = body.get("envelope_kwargs") or {}
    return ENVELOPE_REGISTRY[kind](**kwargs)


@pulse_bp.route("/simulate", methods=["POST"])
def post_simulate():
    try:
        body = request.get_json(force=True) or {}
        env = _build_envelope(body)
        psi0 = body.get("psi0")
        psi0_tuple = None
        if psi0:
            if len(psi0) != 2:
                return jsonify({"error": "psi0 must be a 2-element complex pair"}), 400
            psi0_tuple = (complex(*psi0[0]) if isinstance(psi0[0], (list, tuple)) else complex(psi0[0]),
                          complex(*psi0[1]) if isinstance(psi0[1], (list, tuple)) else complex(psi0[1]))
        result = simulate(
            env,
            duration=body.get("duration"),
            dt=float(body.get("dt", 0.01)),
            detuning=float(body.get("detuning", 0.0)),
            drag_alpha=float(body.get("drag_alpha", 0.5)),
            n_samples=int(body.get("n_samples", 200)),
            psi0=psi0_tuple,
        )
        return jsonify(result.to_dict())
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500


@pulse_bp.route("/calibrate", methods=["POST"])
def post_calibrate():
    try:
        body = request.get_json(force=True) or {}
        envelope_kind = body.get("envelope", "gaussian")
        if envelope_kind not in ENVELOPE_REGISTRY:
            return jsonify({"error": f"Unknown envelope {envelope_kind!r}"}), 400
        target = body.get("target", "pi")
        duration = float(body.get("duration"))
        sigma = body.get("sigma")
        if sigma is not None:
            sigma = float(sigma)

        if target == "pi":
            amp = pi_amplitude(envelope_kind, duration=duration, sigma=sigma)
        elif target == "sqrt_x":
            amp = sqrt_x_amplitude(envelope_kind, duration=duration, sigma=sigma)
        else:
            return jsonify({"error": f"Unknown target {target!r}. Use 'pi' or 'sqrt_x'."}), 400

        return jsonify({
            "envelope": envelope_kind,
            "target": target,
            "duration": duration,
            "sigma": sigma,
            "amplitude": float(amp),
        })
    except (TypeError, ValueError) as exc:
        return jsonify({"error": str(exc)}), 400
