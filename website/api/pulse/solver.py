"""
2-level TDSE integrator (RK4) in the rotating frame.

Hamiltonian (units: angular frequency = rad / time):

    H(t) = (Δ / 2) · σ_z + (Ω_I(t) / 2) · σ_x + (Ω_Q(t) / 2) · σ_y

with ``Ω_Q(t) = drag_alpha · Ω̇_I(t)`` whenever DRAG is enabled.

State convention
----------------
ψ = [c0, c1] complex, where |0⟩ ≡ [1, 0] and |1⟩ ≡ [0, 1].

⟨X⟩ = 2 Re(c0* c1)        ⟨Y⟩ = -2 Im(c0* c1)        ⟨Z⟩ = |c0|² - |c1|²

The integrator is pure NumPy and seed-free; the same envelope / params / dt
always produces the same Bloch trajectory (reproducibility pledge).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Tuple

import numpy as np

from .pulses import Envelope


@dataclass
class BlochSample:
    t: float
    x: float
    y: float
    z: float


@dataclass
class PulseResult:
    envelope_name: str
    duration: float
    dt: float
    detuning: float
    drag_alpha: float
    samples: List[BlochSample] = field(default_factory=list)
    final_state: Tuple[complex, complex] = (1.0 + 0j, 0.0 + 0j)
    pi_pulse_fidelity: float = 0.0

    def to_dict(self) -> dict:
        return {
            "envelope_name": self.envelope_name,
            "duration": self.duration,
            "dt": self.dt,
            "detuning": self.detuning,
            "drag_alpha": self.drag_alpha,
            "samples": [
                {"t": s.t, "x": s.x, "y": s.y, "z": s.z} for s in self.samples
            ],
            "final_state": {
                "c0_re": float(self.final_state[0].real),
                "c0_im": float(self.final_state[0].imag),
                "c1_re": float(self.final_state[1].real),
                "c1_im": float(self.final_state[1].imag),
            },
            "pi_pulse_fidelity": float(self.pi_pulse_fidelity),
        }


# ── Hamiltonian builder ────────────────────────────────────────────────
_SIGMA_X = np.array([[0, 1], [1, 0]], dtype=np.complex128)
_SIGMA_Y = np.array([[0, -1j], [1j, 0]], dtype=np.complex128)
_SIGMA_Z = np.array([[1, 0], [0, -1]], dtype=np.complex128)


def _hamiltonian(t: float, env: Envelope, detuning: float, drag_alpha: float) -> np.ndarray:
    omega_i = env(t)
    omega_q = drag_alpha * env.derivative(t) if env.name == "drag" else 0.0
    return (
        0.5 * detuning * _SIGMA_Z
        + 0.5 * omega_i * _SIGMA_X
        + 0.5 * omega_q * _SIGMA_Y
    )


def _dpsi(t: float, psi: np.ndarray, env: Envelope, detuning: float, drag_alpha: float) -> np.ndarray:
    return -1j * (_hamiltonian(t, env, detuning, drag_alpha) @ psi)


def bloch_from_state(psi: np.ndarray) -> Tuple[float, float, float]:
    c0, c1 = complex(psi[0]), complex(psi[1])
    x = 2.0 * (c0.conjugate() * c1).real
    y = -2.0 * (c0.conjugate() * c1).imag
    z = (c0.conjugate() * c0).real - (c1.conjugate() * c1).real
    return float(x), float(y), float(z)


def expectation_z(psi: np.ndarray) -> float:
    return bloch_from_state(psi)[2]


def simulate(
    envelope: Envelope,
    *,
    duration: float | None = None,
    dt: float = 0.01,
    detuning: float = 0.0,
    drag_alpha: float = 0.5,
    n_samples: int = 200,
    psi0: Tuple[complex, complex] | None = None,
) -> PulseResult:
    """Integrate the TDSE under ``envelope`` and return a Bloch trajectory.

    Parameters
    ----------
    envelope    : drive-pulse envelope. ``envelope.duration`` is used if
                  ``duration`` is None.
    dt          : integrator step (must be small relative to envelope dynamics).
    detuning    : qubit-drive frequency detuning Δ (rad / time-unit).
    drag_alpha  : DRAG quadrature scale; ignored for non-DRAG envelopes.
    n_samples   : number of points to record along the trajectory.
    psi0        : initial state (default |0⟩).
    """
    T = float(duration) if duration is not None else float(envelope.duration)
    if T <= 0:
        raise ValueError("duration must be positive")
    if dt <= 0:
        raise ValueError("dt must be positive")
    if n_samples < 2:
        raise ValueError("n_samples must be at least 2")

    psi = np.array(psi0 if psi0 is not None else (1.0 + 0j, 0.0 + 0j),
                   dtype=np.complex128)
    # Normalise input state defensively.
    norm = float(np.linalg.norm(psi))
    if norm == 0.0:
        raise ValueError("psi0 must be non-zero")
    psi = psi / norm

    n_steps = max(1, int(round(T / dt)))
    actual_dt = T / n_steps
    sample_every = max(1, n_steps // (n_samples - 1))

    samples: List[BlochSample] = []
    x, y, z = bloch_from_state(psi)
    samples.append(BlochSample(t=0.0, x=x, y=y, z=z))

    t = 0.0
    for step in range(1, n_steps + 1):
        # Classical RK4 on dψ/dt = -i H(t) ψ
        k1 = _dpsi(t, psi, envelope, detuning, drag_alpha)
        k2 = _dpsi(t + 0.5 * actual_dt, psi + 0.5 * actual_dt * k1,
                   envelope, detuning, drag_alpha)
        k3 = _dpsi(t + 0.5 * actual_dt, psi + 0.5 * actual_dt * k2,
                   envelope, detuning, drag_alpha)
        k4 = _dpsi(t + actual_dt, psi + actual_dt * k3,
                   envelope, detuning, drag_alpha)
        psi = psi + (actual_dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)

        # Re-normalise to fight numerical drift.
        n = float(np.linalg.norm(psi))
        if n > 0:
            psi = psi / n

        t += actual_dt
        if step % sample_every == 0 or step == n_steps:
            x, y, z = bloch_from_state(psi)
            samples.append(BlochSample(t=t, x=x, y=y, z=z))

    # π-pulse fidelity = ⟨1|ψ_final⟩² when starting from |0⟩.
    fidelity = float(abs(psi[1]) ** 2)

    return PulseResult(
        envelope_name=envelope.name,
        duration=T,
        dt=actual_dt,
        detuning=float(detuning),
        drag_alpha=float(drag_alpha),
        samples=samples,
        final_state=(complex(psi[0]), complex(psi[1])),
        pi_pulse_fidelity=fidelity,
    )
