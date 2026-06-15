"""
Drive-pulse envelopes for the Pulse Lab.

Every :class:`Envelope` exposes ``__call__(t)`` returning the real, in-phase
amplitude :math:`\\Omega_I(t)` of the rotating-frame drive in rad/ns (or any
consistent angular-frequency unit). The DRAG correction adds a quadrature
component :math:`\\Omega_Q(t) = \\alpha\\,\\dot{\\Omega}_I(t)` at solve time.

All envelopes are pure NumPy and produce identical samples for identical
parameters — required by the reproducibility pledge.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Dict


@dataclass(frozen=True)
class Envelope:
    """Real-valued drive envelope :math:`\\Omega_I(t)`.

    Attributes
    ----------
    name        : registry key (``"gaussian"``, ``"square"``, ``"drag"``).
    duration    : total pulse length :math:`T`. ``f(t) == 0`` for ``t < 0`` or
                  ``t > duration``.
    amplitude   : peak amplitude :math:`A`.
    f           : callable returning the envelope at time ``t``.
    df          : callable returning :math:`\\dot{\\Omega}_I(t)`. Used by DRAG.
    """

    name: str
    duration: float
    amplitude: float
    f: Callable[[float], float]
    df: Callable[[float], float]

    def __call__(self, t: float) -> float:
        if t < 0.0 or t > self.duration:
            return 0.0
        return float(self.f(t))

    def derivative(self, t: float) -> float:
        if t < 0.0 or t > self.duration:
            return 0.0
        return float(self.df(t))


# ── Square envelope ─────────────────────────────────────────────────────
def square(*, duration: float, amplitude: float = 1.0) -> Envelope:
    """Constant amplitude over ``[0, duration]``."""
    if duration <= 0:
        raise ValueError("duration must be positive")
    return Envelope(
        name="square",
        duration=float(duration),
        amplitude=float(amplitude),
        f=lambda t: amplitude,
        df=lambda t: 0.0,
    )


# ── Gaussian envelope ───────────────────────────────────────────────────
def gaussian(*, duration: float, amplitude: float = 1.0, sigma: float | None = None) -> Envelope:
    """Gaussian pulse centred at ``duration / 2`` with the given std.

    Defaults: ``sigma = duration / 4`` so the tails are ~2σ from the edges.
    """
    if duration <= 0:
        raise ValueError("duration must be positive")
    sig = float(sigma) if sigma is not None else duration / 4.0
    if sig <= 0:
        raise ValueError("sigma must be positive")
    t0 = duration / 2.0

    def _f(t: float) -> float:
        return amplitude * math.exp(-0.5 * ((t - t0) / sig) ** 2)

    def _df(t: float) -> float:
        return -(t - t0) / (sig * sig) * _f(t)

    return Envelope(
        name="gaussian",
        duration=float(duration),
        amplitude=float(amplitude),
        f=_f,
        df=_df,
    )


# ── DRAG: gaussian + quadrature correction ──────────────────────────────
def drag(*, duration: float, amplitude: float = 1.0, sigma: float | None = None,
         drag_alpha: float = 0.5) -> Envelope:
    """DRAG-shaped pulse.

    The in-phase component is gaussian; the quadrature correction is added by
    the solver via :attr:`Envelope.derivative` and the ``drag_alpha``
    parameter passed at solve time. ``drag_alpha`` is stored on the envelope
    via the closure for convenience; the solver reads it from its own arg.
    """
    g = gaussian(duration=duration, amplitude=amplitude, sigma=sigma)
    return Envelope(
        name="drag",
        duration=g.duration,
        amplitude=g.amplitude,
        f=g.f,
        df=g.df,
    )


ENVELOPE_REGISTRY: Dict[str, Callable[..., Envelope]] = {
    "square": square,
    "gaussian": gaussian,
    "drag": drag,
}
