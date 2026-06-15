"""
Phase 3 — BibTeX emitter.

Assertions:
    1. The BibTeX entry starts with ``@misc{qcuit_<short_hash>,``.
    2. It contains ``note         = {SHA-256: <full_hash>}``.
    3. Endpoint returns ``Content-Type: text/plain``.
"""

from __future__ import annotations

import re
from pathlib import Path


def _make_notebook(tmp_data_dir):
    from api.notebook import NotebookStore

    circuit = {
        "numQubits": 1,
        "numClassical": 1,
        "numTimesteps": 4,
        "gates": {"q_0-0": {"id": "h", "gateType": "H", "qubit": 0, "timestep": 0}},
        "multiQubitGates": [],
        "measurements": [],
        "noiseLevel": 0.0,
    }
    noise_config = {"depolarizing": 0.0, "T1": 0.0, "T2": 0.0}
    results = {"probabilities": {"0": 0.5, "1": 0.5}}

    store = NotebookStore(root=Path(tmp_data_dir) / "notebook")
    return store.save(circuit, noise_config, shots=1024, seed=0, results=results)


def test_bibtex_starts_with_qcuit_key(tmp_data_dir):
    from api.notebook import build_bibtex

    notebook = _make_notebook(tmp_data_dir)
    out = build_bibtex(notebook)
    assert out.startswith(f"@misc{{qcuit_{notebook.run_hash[:8]},")


def test_bibtex_contains_sha256_note(tmp_data_dir):
    from api.notebook import build_bibtex

    notebook = _make_notebook(tmp_data_dir)
    out = build_bibtex(notebook)
    # Match the SHA-256 note line (whitespace-tolerant).
    assert re.search(rf"note\s*=\s*\{{SHA-256:\s*{notebook.run_hash}\}}", out)


def test_bibtex_endpoint_returns_text_plain(client, tmp_data_dir):
    # Persist a notebook first (round-trip via the /run endpoint to keep this
    # an integration check).
    body = {
        "circuit": {
            "numQubits": 1,
            "numClassical": 1,
            "numTimesteps": 4,
            "gates": {"q_0-0": {"id": "h", "gateType": "H", "qubit": 0, "timestep": 0}},
            "multiQubitGates": [],
            "measurements": [],
            "noiseLevel": 0.0,
        },
        "noise_config": {"depolarizing": 0.0, "T1": 0.0, "T2": 0.0},
        "shots": 256,
        "seed": 0,
    }
    resp = client.post("/api/notebook/run", json=body)
    assert resp.status_code == 200, resp.get_json()
    run_hash = resp.get_json()["run_hash"]

    bib_resp = client.get(f"/api/notebook/{run_hash}/bibtex")
    assert bib_resp.status_code == 200
    assert bib_resp.mimetype == "text/plain"
    assert run_hash in bib_resp.get_data(as_text=True)
