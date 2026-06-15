"""
api.pulse — Pulse-level simulator (Phase 8, Pillar E).

Public surface:

    Envelopes:   gaussian, square, drag, ENVELOPE_REGISTRY
    Solver:      simulate(envelope, params, *, duration, dt, detuning, phi0,
                          drag_alpha, n_samples)
    Calibration: pi_amplitude(envelope, **kwargs), sqrt_x_amplitude(...)
    Presets:     rabi_preset, pi_pulse_preset, sqrt_x_preset, PRESET_REGISTRY

The reference implementation lives here; ``qcuit.pulse`` re-exports it so
notebooks can run the same TDSE solver offline.
"""

from __future__ import annotations

from .pulses import (
    Envelope,
    gaussian,
    square,
    drag,
    ENVELOPE_REGISTRY,
)
from .solver import (
    BlochSample,
    PulseResult,
    simulate,
    expectation_z,
    bloch_from_state,
)
from .calibration import (
    pulse_area,
    pi_amplitude,
    sqrt_x_amplitude,
)
from .presets import (
    rabi_preset,
    pi_pulse_preset,
    sqrt_x_preset,
    PRESET_REGISTRY,
)

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
