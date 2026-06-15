"""
Pulse-area calibration helpers.

For a real envelope :math:`\\Omega_I(t)` of duration ``T``, the on-resonance
rotation angle about the X axis is

    \\theta = \\int_0^T \\Omega_I(t)\\,dt.

A π-pulse needs ``\\theta = \\pi``; a √X pulse needs ``\\theta = \\pi/2``.
These helpers solve for the amplitude that lands on those targets given the
envelope shape and duration. They use a closed-form expression where the
integral is analytic (square, gaussian) and Simpson's rule otherwise.
"""

from __future__ import annotations

import math
from typing import Callable

from .pulses import Envelope, gaussian, square, drag


def _simpson(f: Callable[[float], float], a: float, b: float, n: int = 401) -> float:
    """Simpson's rule with an odd number of sample points."""
    if n % 2 == 0:
        n += 1
    h = (b - a) / (n - 1)
    s = f(a) + f(b)
    for i in range(1, n - 1):
        x = a + i * h
        s += (4.0 if i % 2 == 1 else 2.0) * f(x)
    return s * h / 3.0


def pulse_area(envelope: Envelope) -> float:
    """Integral of the envelope over its support."""
    if envelope.name == "square":
        return float(envelope.amplitude) * float(envelope.duration)
    if envelope.name == "gaussian":
        # For a Gaussian centred at T/2 with std σ, truncated to [0, T],
        # the area is amplitude · σ · √(2π) · (erf(T/(2√2 σ))) — but for the
        # default σ = T/4 the truncation is negligible, so we use the
        # closed-form ≈ amplitude · σ · √(2π) · erf(2/√2).
        # We compute it numerically to remain exact under any σ.
        return _simpson(envelope.f, 0.0, envelope.duration)
    # DRAG and any custom envelopes: numeric integration of the in-phase part.
    return _simpson(envelope.f, 0.0, envelope.duration)


def _amplitude_for_area(envelope_kind: str, target_area: float, *, duration: float,
                       sigma: float | None = None) -> float:
    """Solve for the peak amplitude that yields ``target_area`` under the
    given envelope shape and duration. Linear in amplitude → one-shot solve.
    """
    if envelope_kind == "square":
        return float(target_area) / float(duration)
    if envelope_kind == "gaussian":
        probe = gaussian(duration=duration, amplitude=1.0, sigma=sigma)
        return float(target_area) / pulse_area(probe)
    if envelope_kind == "drag":
        probe = drag(duration=duration, amplitude=1.0, sigma=sigma)
        return float(target_area) / pulse_area(probe)
    raise ValueError(f"Unknown envelope kind {envelope_kind!r}")


def pi_amplitude(envelope_kind: str, *, duration: float, sigma: float | None = None) -> float:
    """Amplitude that yields a θ=π rotation (population fully transferred)."""
    return _amplitude_for_area(envelope_kind, math.pi, duration=duration, sigma=sigma)


def sqrt_x_amplitude(envelope_kind: str, *, duration: float, sigma: float | None = None) -> float:
    """Amplitude that yields a θ=π/2 rotation (√X)."""
    return _amplitude_for_area(envelope_kind, math.pi / 2.0, duration=duration, sigma=sigma)
