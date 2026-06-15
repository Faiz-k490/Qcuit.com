"""
Phase 3 — End-to-end smoke test via the Flask test client.

Assertions:
    1. POST /api/notebook/run for a Bell state returns 200 + a valid hash.
    2. GET /api/notebook/<hash> returns probabilities ≈ {"00": 0.5, "11": 0.5}.
    3. GET /api/notebook/<unknown> returns 404.
"""

from __future__ import annotations


def _bell_body():
    return {
        "circuit": {
            "numQubits": 2,
            "numClassical": 2,
            "numTimesteps": 8,
            "gates": {"q_0-0": {"id": "h", "gateType": "H", "qubit": 0, "timestep": 0}},
            "multiQubitGates": [
                {"id": "cx", "gateType": "CNOT", "controls": [0], "targets": [1], "timestep": 1}
            ],
            "measurements": [],
            "noiseLevel": 0.0,
        },
        "noise_config": {"depolarizing": 0.0, "T1": 0.0, "T2": 0.0},
        "shots": 1024,
        "seed": 0,
    }


def test_post_bell_returns_valid_hash(client):
    resp = client.post("/api/notebook/run", json=_bell_body())
    assert resp.status_code == 200, resp.get_json()
    body = resp.get_json()
    assert "run_hash" in body and len(body["run_hash"]) == 64
    assert "url" in body and body["run_hash"] in body["url"]
    assert "bibtex" in body and body["bibtex"].startswith("@misc{")


def test_get_bell_artifact_has_correct_probabilities(client):
    posted = client.post("/api/notebook/run", json=_bell_body()).get_json()
    run_hash = posted["run_hash"]

    resp = client.get(f"/api/notebook/{run_hash}")
    assert resp.status_code == 200
    data = resp.get_json()

    probs = data["results"]["probabilities"]
    # Bell state |Φ⁺⟩ has probabilities 0.5 / 0.5 on |00⟩ and |11⟩.
    assert abs(probs.get("00", 0) - 0.5) < 1e-6
    assert abs(probs.get("11", 0) - 0.5) < 1e-6
    # And no spurious 01 / 10 amplitude.
    assert probs.get("01", 0) < 1e-6
    assert probs.get("10", 0) < 1e-6

    # Metadata block populated.
    md = data["metadata"]
    assert md["num_qubits"] == 2
    assert md["kernel"] == "statevector"


def test_get_unknown_hash_returns_404(client):
    resp = client.get("/api/notebook/" + "0" * 64)
    assert resp.status_code == 404


def test_gallery_endpoint_returns_ten_items(client):
    resp = client.get("/api/notebook/gallery")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["count"] == 10
    # Every entry must carry a precomputed 64-char hash and a permalink.
    for item in body["items"]:
        assert len(item["run_hash"]) == 64
        assert item["run_hash"] in item["url"]
