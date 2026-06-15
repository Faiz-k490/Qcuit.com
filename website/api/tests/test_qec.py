"""
Phase 7 — QEC Sandbox tests.

Coverage:
    1. No errors → all-zero syndrome on every code.
    2. Single-qubit X / Y / Z errors are corrected by the lookup decoder
       on repetition / Steane / Shor.
    3. Surface d=3 corrects every weight-1 X and Z error.
    4. Logical-error detection: applying a logical X (e.g., X0X1X2 on
       repetition_3) leaves the syndrome at zero but is_logical_error == True.
    5. /api/qec/codes lists all four codes.
    6. /api/qec/syndrome and /api/qec/decode round-trip a single-qubit error.
    7. /api/qec/run reports success on all single-qubit errors per code.
    8. Library mirror imports cleanly.
"""

from __future__ import annotations

import pytest

from api.qec import (
    CODE_REGISTRY,
    ErrorPattern,
    REPETITION_3,
    STEANE_7,
    SHOR_9,
    SURFACE_D3,
    apply_recovery,
    decode_for,
    parse_errors,
    run_round,
    syndrome_for,
)
from api.qec.simulator import is_logical_error


# ─── 1. Trivial syndromes ───────────────────────────────────────────────────
@pytest.mark.parametrize("code_name", list(CODE_REGISTRY.keys()))
def test_no_error_zero_syndrome(code_name: str) -> None:
    code = CODE_REGISTRY[code_name]
    err = ErrorPattern(num_qubits=code.num_data)
    s = syndrome_for(code, err)
    assert s == [0] * code.num_stabilisers


# ─── 2-3. Single-error correction on every code ────────────────────────────
@pytest.mark.parametrize("code_name", list(CODE_REGISTRY.keys()))
@pytest.mark.parametrize("pauli", ["X", "Z", "Y"])
def test_single_error_corrected(code_name: str, pauli: str) -> None:
    code = CODE_REGISTRY[code_name]

    # Repetition-3 only protects against X errors.
    if code_name == "repetition_3" and pauli in ("Z", "Y"):
        pytest.skip("repetition_3 does not protect against Z / Y errors")

    for q in range(code.num_data):
        err = ErrorPattern(num_qubits=code.num_data)
        err.add(pauli, q)
        s = syndrome_for(code, err)
        recovery = decode_for(code, s)
        residual = apply_recovery(err, recovery)
        assert not is_logical_error(code, residual), (
            f"{code_name}: failed to correct {pauli} on qubit {q}; "
            f"syndrome={s}, recovery x={recovery.x_bits}, z={recovery.z_bits}, "
            f"residual x={residual.x_bits}, z={residual.z_bits}"
        )


# ─── 4. Logical operators leave zero syndrome but are logical errors ───────
def test_logical_x_on_repetition_is_logical_error() -> None:
    err = parse_errors(3, [
        {"pauli": "X", "qubit": 0},
        {"pauli": "X", "qubit": 1},
        {"pauli": "X", "qubit": 2},
    ])
    assert syndrome_for(REPETITION_3, err) == [0, 0]
    assert is_logical_error(REPETITION_3, err)


def test_single_z_on_repetition_is_logical_error() -> None:
    """Z on qubit 0 commutes with all Z-stabilisers (zero syndrome) but
    anti-commutes with logical X̄ = X0X1X2 → logical error."""
    err = parse_errors(3, [{"pauli": "Z", "qubit": 0}])
    assert syndrome_for(REPETITION_3, err) == [0, 0]
    assert is_logical_error(REPETITION_3, err)


# ─── 5. /codes endpoint ─────────────────────────────────────────────────────
class TestCodesEndpoint:
    def test_lists_all_codes(self, client) -> None:
        resp = client.get("/api/qec/codes")
        assert resp.status_code == 200
        body = resp.get_json()
        assert set(body["codes"]) == {"repetition_3", "steane_7", "shor_9", "surface_d3"}

    def test_get_code_returns_layout(self, client) -> None:
        resp = client.post("/api/qec/code", json={"name": "steane_7"})
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["num_data"] == 7
        assert len(body["stabilisers"]) == 6
        assert body["distance"] == 3
        assert len(body["data_positions"]) == 7

    def test_get_unknown_code_404(self, client) -> None:
        resp = client.post("/api/qec/code", json={"name": "nope"})
        assert resp.status_code == 404


# ─── 6. /syndrome + /decode round-trip ──────────────────────────────────────
class TestSyndromeDecodeRoundTrip:
    def test_steane_round_trip(self, client) -> None:
        # Inject X on qubit 3 → measure → decode → check recovery
        s_resp = client.post(
            "/api/qec/syndrome",
            json={"code": "steane_7", "errors": [{"pauli": "X", "qubit": 3}]},
        )
        assert s_resp.status_code == 200
        s_body = s_resp.get_json()
        assert sum(s_body["syndrome"]) > 0  # non-trivial

        d_resp = client.post(
            "/api/qec/decode",
            json={"code": "steane_7", "syndrome": s_body["syndrome"]},
        )
        assert d_resp.status_code == 200
        d_body = d_resp.get_json()
        # Recovery should put an X on qubit 3.
        assert d_body["recovery"]["x_bits"][3] == 1

    def test_decode_rejects_wrong_length_syndrome(self, client) -> None:
        resp = client.post(
            "/api/qec/decode",
            json={"code": "steane_7", "syndrome": [0, 1]},
        )
        assert resp.status_code == 400


# ─── 7. /run pipeline succeeds on every single-qubit error ─────────────────
@pytest.mark.parametrize("code_name", list(CODE_REGISTRY.keys()))
def test_run_round_succeeds_for_single_x_errors(code_name: str, client) -> None:
    code = CODE_REGISTRY[code_name]
    for q in range(code.num_data):
        resp = client.post("/api/qec/run", json={
            "code": code_name,
            "errors": [{"pauli": "X", "qubit": q}],
        })
        assert resp.status_code == 200, resp.get_json()
        body = resp.get_json()
        assert body["success"] is True, (
            f"{code_name}: failed to recover X on qubit {q}: {body}"
        )


# ─── 8. Library mirror parity ───────────────────────────────────────────────
def test_library_mirror_imports() -> None:
    import qcuit.qec as Q
    assert Q.REPETITION_3 is REPETITION_3
    assert Q.run_round is run_round


# ─── 9. /run endpoint also handles Z and Y on the bigger codes ─────────────
@pytest.mark.parametrize("code_name", ["steane_7", "shor_9", "surface_d3"])
@pytest.mark.parametrize("pauli", ["X", "Y", "Z"])
def test_run_round_succeeds_on_z_y_for_distance3_codes(code_name: str, pauli: str, client) -> None:
    code = CODE_REGISTRY[code_name]
    for q in range(code.num_data):
        resp = client.post("/api/qec/run", json={
            "code": code_name,
            "errors": [{"pauli": pauli, "qubit": q}],
        })
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True, (
            f"{code_name}: failed to recover {pauli} on qubit {q}"
        )


# ─── 10. Determinism: same input → same output ─────────────────────────────
def test_run_round_deterministic() -> None:
    a = run_round("steane_7", [{"pauli": "Y", "qubit": 4}])
    b = run_round("steane_7", [{"pauli": "Y", "qubit": 4}])
    assert a == b
