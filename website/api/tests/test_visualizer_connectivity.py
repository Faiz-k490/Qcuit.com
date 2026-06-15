from __future__ import annotations


def _bell_payload():
    return {
        "numQubits": 2,
        "numClassical": 2,
        "gates": {
            "h-0-0": {
                "id": "h-0-0",
                "gateType": "H",
                "target": 0,
                "timestep": 0,
            }
        },
        "multiQubitGates": [
            {
                "id": "cx-0-1-1",
                "gateType": "CNOT",
                "control": 0,
                "target": 1,
                "timestep": 1,
            }
        ],
        "measurements": [],
        "noiseLevel": 0,
    }


def test_health_endpoints(client):
    for path in ("/health", "/api/health"):
        resp = client.get(path)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "ok"
        assert body["service"] == "qcuit-api"


def test_visualizer_simulate_endpoint_accepts_frontend_payload(client):
    resp = client.post("/api/simulate", json=_bell_payload())
    assert resp.status_code == 200
    body = resp.get_json()
    assert "probabilities" in body
    assert "code" in body
    assert {"qiskit", "braket", "openqasm"} <= set(body["code"])


def test_visualizer_statevector_endpoint_accepts_frontend_payload(client):
    resp = client.post("/api/statevector", json=_bell_payload())
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["num_states"] >= 1
    assert "qsphere" in body


def test_visualizer_estimate_endpoint_accepts_frontend_payload(client):
    resp = client.post("/api/estimate", json=_bell_payload())
    assert resp.status_code == 200
    body = resp.get_json()
    assert "gate_count" in body


def test_deterministic_explainer_endpoint_accepts_frontend_payload(client):
    resp = client.post("/api/explain", json=_bell_payload())
    assert resp.status_code == 200
    body = resp.get_json()
    assert "verdict" in body
    assert "columns" in body
    assert "top_outcomes" in body
