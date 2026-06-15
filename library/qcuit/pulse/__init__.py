"""
qcuit.pulse — Pulse-level simulator (library mirror).

Re-exports :mod:`api.pulse` so notebooks can run the same TDSE solver
offline::

    from qcuit.pulse import simulate, gaussian, pi_amplitude
    env = gaussian(duration=10.0, amplitude=pi_amplitude("gaussian", duration=10.0))
    result = simulate(env)
"""

from __future__ import annotations

try:
    from api.pulse import (  # type: ignore
        Envelope,
        gaussian,
        square,
        drag,
        ENVELOPE_REGISTRY,
        BlochSample,
        PulseResult,
        simulate,
        expectation_z,
        bloch_from_state,
        pulse_area,
        pi_amplitude,
        sqrt_x_amplitude,
        rabi_preset,
        pi_pulse_preset,
        sqrt_x_preset,
        PRESET_REGISTRY,
    )
except Exception as exc:  # pragma: no cover - website compatibility surface
    raise ImportError(
        "qcuit.pulse is still website-API backed. The standalone pip package "
        "currently ships qcuit.hep, qcuit.models, qcuit.quantum, qcuit.diff, "
        "qcuit.qnn, and qcuit.benchmarks."
    ) from exc

__all__ = [
    "Envelope",
    "gaussian",
    "square",
    "drag",
    "ENVELOPE_REGISTRY",
    "BlochSample",
    "PulseResult",
    "simulate",
    "expectation_z",
    "bloch_from_state",
    "pulse_area",
    "pi_amplitude",
    "sqrt_x_amplitude",
    "rabi_preset",
    "pi_pulse_preset",
    "sqrt_x_preset",
    "PRESET_REGISTRY",
]
