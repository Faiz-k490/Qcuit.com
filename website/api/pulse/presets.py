"""
Pulse Lab presets.

Each preset returns a JSON-serialisable dict the frontend can hand back to
``/api/pulse/simulate`` unchanged. The names mirror the textbook trinity:

    * ``rabi``     — long square drive showing many oscillations.
    * ``pi_pulse`` — calibrated gaussian π-pulse.
    * ``sqrt_x``   — calibrated DRAG √X pulse.
"""

from __future__ import annotations

import math
from typing import Callable, Dict

from .calibration import pi_amplitude, sqrt_x_amplitude


def rabi_preset() -> dict:
    """Square drive with amplitude 1 rad/ns over 4π time-units → 2 full Rabi
    cycles starting from |0⟩."""
    return {
        "name": "rabi",
        "label": "Rabi oscillation",
        "envelope": "square",
        "envelope_kwargs": {"duration": 4.0 * math.pi, "amplitude": 1.0},
        "duration": 4.0 * math.pi,
        "dt": 0.01,
        "detuning": 0.0,
        "drag_alpha": 0.0,
        "description": "Long resonant square drive showing two Rabi cycles.",
    }


def pi_pulse_preset() -> dict:
    """Gaussian π-pulse calibrated to land on |1⟩."""
    duration = 10.0
    amp = pi_amplitude("gaussian", duration=duration)
    return {
        "name": "pi_pulse",
        "label": "π-pulse (gaussian)",
        "envelope": "gaussian",
        "envelope_kwargs": {
            "duration": duration,
            "amplitude": amp,
            "sigma": duration / 4.0,
        },
        "duration": duration,
        "dt": 0.005,
        "detuning": 0.0,
        "drag_alpha": 0.0,
        "description": (
            "Gaussian pulse with amplitude chosen so the integrated area equals π. "
            "Starting from |0⟩, the state is driven to |1⟩."
        ),
    }


def sqrt_x_preset() -> dict:
    """DRAG √X pulse calibrated to land on (|0⟩ - i|1⟩)/√2."""
    duration = 10.0
    amp = sqrt_x_amplitude("drag", duration=duration)
    return {
        "name": "sqrt_x",
        "label": "√X pulse (DRAG)",
        "envelope": "drag",
        "envelope_kwargs": {
            "duration": duration,
            "amplitude": amp,
            "sigma": duration / 4.0,
        },
        "duration": duration,
        "dt": 0.005,
        "detuning": 0.0,
        "drag_alpha": 0.5,
        "description": (
            "DRAG-shaped envelope with area π/2 and a quadrature correction "
            "proportional to dΩ/dt. Lands on (|0⟩ − i|1⟩)/√2."
        ),
    }


PRESET_REGISTRY: Dict[str, Callable[[], dict]] = {
    "rabi": rabi_preset,
    "pi_pulse": pi_pulse_preset,
    "sqrt_x": sqrt_x_preset,
}
