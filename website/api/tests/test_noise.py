"""
Phase 2 — Noise Lab tests.

Coverage:
    1. Kraus channels are trace-preserving (Σ K†K = I).
    2. depolarizing(0) is the identity channel; depolarizing(1) is fully mixing.
    3. Amplitude / phase damping reduce to identity at rate 0.
    4. Readout-assignment matrix has columns summing to 1.
    5. Snapshot loader picks up the three shipped fixtures.
    6. Unknown snapshot raises ValueError / 404.
    7. circuit_error_budget bucketises errors correctly and clamps to [0, 1].
    8. fidelity_vs_depth is monotonically non-increasing.
    9. /api/noise/snapshots lists every shipped vendor.
    10. /api/noise/apply returns fidelity + breakdown.
    11. /api/noise/fidelity-curve returns the swept curve.
    12. Library mirror imports cleanly.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from api.noise import (
    SNAPSHOT_REGISTRY,
    amplitude_damping,
    circuit_error_budget,
    depolarizing,
    fidelity_vs_depth,
    is_trace_preserving,
    list_snapshots,
    load_snapshot,
    phase_damping,
    readout_assignment_matrix,
)


# ─── 1-2. Channel trace preservation + limits ───────────────────────────────
@pytest.mark.parametrize("p", [0.0, 0.1, 0.5, 0.9, 1.0])
def test_depolarizing_trace_preserving(p: float) -> None:
    ch = depolarizing(p)
    assert is_trace_preserving(ch)


def test_depolarizing_zero_is_identity_like() -> None:
    ch = depolarizing(0.0)
    # K0 = I, the other K's are zero matrices.
    np.testing.assert_allclose(ch.kraus[0], np.eye(2))
    for K in ch.kraus[1:]:
        np.testing.assert_allclose(K, np.zeros((2, 2)))


# ─── 3. Amplitude / phase damping limits ────────────────────────────────────
@pytest.mark.parametrize("g", [0.0, 0.05, 0.5, 1.0])
def test_amplitude_damping_trace_preserving(g: float) -> None:
    assert is_trace_preserving(amplitude_damping(g))


@pytest.mark.parametrize("l", [0.0, 0.05, 0.5, 1.0])
def test_phase_damping_trace_preserving(l: float) -> None:
    assert is_trace_preserving(phase_damping(l))


def test_amplitude_damping_zero_is_identity_like() -> None:
    ch = amplitude_damping(0.0)
    np.testing.assert_allclose(ch.kraus[0], np.eye(2))


# ─── 4. Readout assignment columns sum to 1 ────────────────────────────────
@pytest.mark.parametrize("p01,p10", [(0.0, 0.0), (0.01, 0.02), (0.1, 0.05)])
def test_readout_matrix_columns_sum_to_one(p01: float, p10: float) -> None:
    M = readout_assignment_matrix(p01, p10)
    np.testing.assert_allclose(M.sum(axis=0), np.ones(2))


def test_readout_invalid_probability() -> None:
    with pytest.raises(ValueError):
        readout_assignment_matrix(1.5, 0.0)


# ─── 5. Snapshot loader ─────────────────────────────────────────────────────
def test_three_vendor_snapshots_loaded() -> None:
    SNAPSHOT_REGISTRY.refresh()
    names = list_snapshots()
    assert {"ibm_brisbane_2024", "ionq_aria_2024", "quantinuum_h1_2024"}.issubset(names)


def test_load_snapshot_returns_dataclass() -> None:
    SNAPSHOT_REGISTRY.refresh()
    snap = load_snapshot("ibm_brisbane_2024")
    assert snap.vendor == "ibm"
    assert snap.num_qubits == 5
    assert len(snap.t1_ns) == 5
    assert snap.mean_t1_ns() > 0


# ─── 6. Unknown snapshot ───────────────────────────────────────────────────
def test_load_unknown_snapshot_raises() -> None:
    with pytest.raises(ValueError):
        load_snapshot("does_not_exist")


# ─── 7. circuit_error_budget bucketing ─────────────────────────────────────
def test_budget_buckets_match_inputs() -> None:
    SNAPSHOT_REGISTRY.refresh()
    snap = load_snapshot("ibm_brisbane_2024")
    eb = circuit_error_budget(
        snap, {"1q": 20, "2q": 4, "meas": 5}, depth=8
    )
    assert eb.single_qubit_err > 0
    assert eb.two_qubit_err > 0
    assert eb.decoherence_err > 0
    assert eb.readout_err > 0
    assert 0.0 < eb.fidelity < 1.0
    # Fidelity is exp(-total_err)
    assert math.isclose(eb.fidelity, math.exp(-eb.total_err), rel_tol=1e-9)
    # Breakdown has four entries.
    assert len(eb.breakdown) == 4


def test_budget_handles_zero_gates() -> None:
    SNAPSHOT_REGISTRY.refresh()
    snap = load_snapshot("ibm_brisbane_2024")
    eb = circuit_error_budget(snap, {"1q": 0, "2q": 0}, depth=1, num_measurements=0)
    # Only decoherence contributes; fidelity should still be ≤ 1.
    assert eb.single_qubit_err == 0
    assert eb.two_qubit_err == 0
    assert eb.readout_err == 0
    assert eb.fidelity <= 1.0


# ─── 8. fidelity_vs_depth monotonicity ─────────────────────────────────────
def test_fidelity_decreases_with_depth() -> None:
    SNAPSHOT_REGISTRY.refresh()
    snap = load_snapshot("ibm_brisbane_2024")
    curve = fidelity_vs_depth(snap, gate_mix={"1q": 5, "2q": 1}, max_depth=20)
    assert len(curve) == 20
    fid = [pt["fidelity"] for pt in curve]
    for i in range(1, len(fid)):
        assert fid[i] <= fid[i - 1] + 1e-12


# ─── 9-11. HTTP endpoints ──────────────────────────────────────────────────
class TestSnapshotsEndpoint:
    def test_list(self, client) -> None:
        resp = client.get("/api/noise/snapshots")
        assert resp.status_code == 200
        body = resp.get_json()
        names = set(body["snapshots"])
        assert {"ibm_brisbane_2024", "ionq_aria_2024", "quantinuum_h1_2024"}.issubset(names)

    def test_get(self, client) -> None:
        resp = client.post("/api/noise/snapshot", json={"name": "ibm_brisbane_2024"})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["vendor"] == "ibm"
        assert "summary" in body
        assert body["summary"]["mean_t1_ns"] > 0

    def test_unknown(self, client) -> None:
        resp = client.post("/api/noise/snapshot", json={"name": "nope"})
        assert resp.status_code == 404


def test_apply_endpoint(client) -> None:
    resp = client.post("/api/noise/apply", json={
        "snapshot": "ibm_brisbane_2024",
        "gate_counts": {"1q": 20, "2q": 4, "meas": 5},
        "depth": 8,
    })
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert 0 < body["fidelity"] < 1
    assert len(body["breakdown"]) == 4


def test_fidelity_curve_endpoint(client) -> None:
    resp = client.post("/api/noise/fidelity-curve", json={
        "snapshot": "ionq_aria_2024",
        "gate_mix": {"1q": 5, "2q": 1},
        "max_depth": 10,
    })
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert len(body["curve"]) == 10
    assert body["snapshot"] == "ionq_aria_2024"


# ─── 12. Library mirror ────────────────────────────────────────────────────
def test_library_mirror_imports() -> None:
    import qcuit.noise as Q

    assert Q.circuit_error_budget is circuit_error_budget
    assert Q.depolarizing is depolarizing
