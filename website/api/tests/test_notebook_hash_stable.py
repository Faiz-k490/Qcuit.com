"""
Phase 3 — Hash stability and idempotency.

Assertions:
    1. Identical inputs ⇒ identical hash.
    2. Re-saving identical inputs does **not** rewrite the on-disk file.
    3. Different seeds ⇒ different hashes.
"""

from __future__ import annotations

import time
from pathlib import Path


def _bell_inputs():
    circuit = {
        "numQubits": 2,
        "numClassical": 2,
        "numTimesteps": 8,
        "gates": {"q_0-0": {"id": "h", "gateType": "H", "qubit": 0, "timestep": 0}},
        "multiQubitGates": [
            {"id": "cx", "gateType": "CNOT", "controls": [0], "targets": [1], "timestep": 1}
        ],
        "measurements": [],
        "noiseLevel": 0.0,
    }
    noise_config = {"depolarizing": 0.0, "T1": 0.0, "T2": 0.0}
    return circuit, noise_config


def test_same_inputs_produce_same_hash(tmp_data_dir):
    from api.notebook import NotebookStore

    circuit, noise_config = _bell_inputs()
    results = {"probabilities": {"00": 0.5, "11": 0.5}, "statevector_real": [], "statevector_imag": [], "counts": {}}

    store = NotebookStore(root=Path(tmp_data_dir) / "notebook")
    a = store.save(circuit, noise_config, shots=1024, seed=42, results=results)
    b = store.save(circuit, noise_config, shots=1024, seed=42, results=results)

    assert a.run_hash == b.run_hash
    assert len(a.run_hash) == 64  # SHA-256 hex


def test_idempotent_save_does_not_rewrite(tmp_data_dir):
    from api.notebook import NotebookStore

    circuit, noise_config = _bell_inputs()
    results = {"probabilities": {"00": 0.5}, "statevector_real": [], "statevector_imag": [], "counts": {}}

    root = Path(tmp_data_dir) / "notebook"
    store = NotebookStore(root=root)
    first = store.save(circuit, noise_config, shots=1024, seed=7, results=results)

    path = root / f"{first.run_hash}.json"
    assert path.exists()
    mtime_before = path.stat().st_mtime_ns

    # Sleep a hair so mtime would *definitely* change if rewritten.
    time.sleep(0.01)

    second = store.save(circuit, noise_config, shots=1024, seed=7, results=results)
    assert second.run_hash == first.run_hash
    assert path.stat().st_mtime_ns == mtime_before
    # And the loaded created_at must match the first run, not a fresh one.
    assert second.created_at == first.created_at


def test_different_seed_changes_hash(tmp_data_dir):
    from api.notebook import NotebookStore

    circuit, noise_config = _bell_inputs()
    results = {"probabilities": {"00": 0.5}, "statevector_real": [], "statevector_imag": [], "counts": {}}

    store = NotebookStore(root=Path(tmp_data_dir) / "notebook")
    a = store.save(circuit, noise_config, shots=1024, seed=0, results=results)
    b = store.save(circuit, noise_config, shots=1024, seed=1, results=results)

    assert a.run_hash != b.run_hash
