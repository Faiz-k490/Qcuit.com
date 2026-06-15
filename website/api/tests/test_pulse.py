"""
Phase 8 — Pulse Lab tests.

Coverage:
    1. Envelopes are non-zero only within their support.
    2. ``pulse_area`` for a square envelope equals A * T exactly.
    3. ``pi_amplitude`` + simulate lands on |1⟩ to high fidelity (gaussian).
    4. ``sqrt_x_amplitude`` lands on the equator (⟨Z⟩ ≈ 0) for a gaussian.
    5. Rabi oscillation: square drive of duration 2π and amplitude 1 returns
       to |0⟩ (full Rabi cycle).
    6. Determinism: identical kwargs → identical trajectory samples.
    7. /api/pulse/presets lists the three canonical presets.
    8. /api/pulse/simulate runs end-to-end and returns the trajectory.
    9. /api/pulse/calibrate returns a positive amplitude.
    10. Library mirror imports cleanly.
"""

from __future__ import annotations

import math

import pytest

from api.pulse import (
    ENVELOPE_REGISTRY,
    PRESET_REGISTRY,
    bloch_from_state,
    gaussian,
    pi_amplitude,
    pi_pulse_preset,
    pulse_area,
    rabi_preset,
    simulate,
    sqrt_x_amplitude,
    sqrt_x_preset,
    square,
)


# ─── 1. Envelope support ────────────────────────────────────────────────────
def test_envelope_zero_outside_support() -> None:
    env = gaussian(duration=10.0)
    assert env(-1.0) == 0.0
    assert env(11.0) == 0.0
    assert env(5.0) > 0.0


# ─── 2. Square pulse area ───────────────────────────────────────────────────
def test_square_area_exact() -> None:
    env = square(duration=3.0, amplitude=2.0)
    assert pulse_area(env) == pytest.approx(6.0, rel=1e-12)


# ─── 3. π-pulse fidelity ────────────────────────────────────────────────────
def test_pi_pulse_lands_on_one() -> None:
    duration = 10.0
    amp = pi_amplitude("gaussian", duration=duration)
    env = gaussian(duration=duration, amplitude=amp)
    result = simulate(env, dt=0.002, detuning=0.0, n_samples=50)
    assert result.pi_pulse_fidelity > 0.999, f"fidelity={result.pi_pulse_fidelity}"
    _, _, z = bloch_from_state([result.final_state[0], result.final_state[1]])
    assert z < -0.99  # |1⟩ has ⟨Z⟩ = -1


# ─── 4. √X pulse lands on the equator ───────────────────────────────────────
def test_sqrt_x_lands_on_equator() -> None:
    duration = 10.0
    amp = sqrt_x_amplitude("gaussian", duration=duration)
    env = gaussian(duration=duration, amplitude=amp)
    result = simulate(env, dt=0.002, detuning=0.0, n_samples=50)
    _, _, z = bloch_from_state([result.final_state[0], result.final_state[1]])
    assert abs(z) < 0.05, f"expected ⟨Z⟩≈0 after √X, got {z}"


# ─── 5. Full Rabi cycle returns to |0⟩ ──────────────────────────────────────
def test_full_rabi_returns_to_ground() -> None:
    # Square drive amplitude 1 over duration 2π → θ = 2π → full rotation.
    env = square(duration=2.0 * math.pi, amplitude=1.0)
    result = simulate(env, dt=0.001, detuning=0.0, n_samples=20)
    _, _, z = bloch_from_state([result.final_state[0], result.final_state[1]])
    assert z > 0.99, f"expected ⟨Z⟩≈+1 after full Rabi cycle, got {z}"


# ─── 6. Determinism ─────────────────────────────────────────────────────────
def test_simulation_is_deterministic() -> None:
    env_a = gaussian(duration=10.0, amplitude=0.3)
    env_b = gaussian(duration=10.0, amplitude=0.3)
    a = simulate(env_a, dt=0.01, n_samples=20)
    b = simulate(env_b, dt=0.01, n_samples=20)
    assert [s.t for s in a.samples] == [s.t for s in b.samples]
    assert [s.z for s in a.samples] == [s.z for s in b.samples]


# ─── 7. /presets endpoint ───────────────────────────────────────────────────
class TestPresetsEndpoint:
    def test_lists_three_presets(self, client) -> None:
        resp = client.get("/api/pulse/presets")
        assert resp.status_code == 200
        body = resp.get_json()
        assert set(body["presets"]) == {"rabi", "pi_pulse", "sqrt_x"}

    def test_get_preset(self, client) -> None:
        resp = client.post("/api/pulse/preset", json={"name": "pi_pulse"})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["envelope"] == "gaussian"
        assert body["envelope_kwargs"]["duration"] > 0

    def test_unknown_preset(self, client) -> None:
        resp = client.post("/api/pulse/preset", json={"name": "nope"})
        assert resp.status_code == 404


# ─── 8. /simulate endpoint ──────────────────────────────────────────────────
def test_simulate_endpoint_returns_trajectory(client) -> None:
    body = pi_pulse_preset()
    resp = client.post("/api/pulse/simulate", json=body)
    assert resp.status_code == 200, resp.get_json()
    out = resp.get_json()
    assert out["envelope_name"] == "gaussian"
    assert len(out["samples"]) > 10
    # Should reach |1⟩ with high fidelity.
    assert out["pi_pulse_fidelity"] > 0.99


# ─── 9. /calibrate endpoint ─────────────────────────────────────────────────
def test_calibrate_returns_positive_amplitude(client) -> None:
    resp = client.post("/api/pulse/calibrate", json={
        "envelope": "gaussian",
        "target": "pi",
        "duration": 10.0,
    })
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["amplitude"] > 0.0


def test_calibrate_unknown_target(client) -> None:
    resp = client.post("/api/pulse/calibrate", json={
        "envelope": "gaussian",
        "target": "nope",
        "duration": 10.0,
    })
    assert resp.status_code == 400


# ─── 10. Library mirror ─────────────────────────────────────────────────────
def test_library_mirror_imports() -> None:
    import qcuit.pulse as Q

    assert Q.simulate is simulate
    assert Q.gaussian is gaussian
    assert "rabi" in Q.PRESET_REGISTRY


# ─── 11. Sanity: registry surface ───────────────────────────────────────────
def test_envelope_registry_has_three_kinds() -> None:
    assert set(ENVELOPE_REGISTRY.keys()) == {"square", "gaussian", "drag"}
    assert set(PRESET_REGISTRY.keys()) == {"rabi", "pi_pulse", "sqrt_x"}


# ─── 12. sqrt_x preset matches DRAG envelope shape ──────────────────────────
def test_sqrt_x_preset_is_drag() -> None:
    body = sqrt_x_preset()
    assert body["envelope"] == "drag"
    assert body["drag_alpha"] > 0
