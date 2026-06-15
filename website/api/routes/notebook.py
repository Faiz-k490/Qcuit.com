"""
api.routes.notebook — Reproducibility Index endpoints (Phase 3).

Routes (all mounted under ``/api``):

    POST  /api/notebook/run            -> {run_hash, url, bibtex}
    GET   /api/notebook/<hash>         -> full artifact JSON
    GET   /api/notebook/<hash>/bibtex  -> text/plain BibTeX entry
    GET   /api/notebook/gallery        -> curated list

Determinism contract:
    Every ``run`` accepts a ``seed`` (int, default 0) and the response
    ``run_hash`` is computed by :mod:`qcuit.io.notebook` over a canonical
    JSON of (circuit, noise_config, shots, seed). Re-posting the same body
    is idempotent: no second file is written.
"""

from __future__ import annotations

from typing import Any, Dict, List

import numpy as np
from flask import Blueprint, Response, jsonify, request

from api.notebook import NotebookStore, GALLERY, build_bibtex


notebook_bp = Blueprint("notebook", __name__, url_prefix="/api/notebook")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _normalize_circuit(circuit: Dict[str, Any]) -> Dict[str, Any]:
    """Coerce the frontend CircuitState shape into the canonical form.

    We strip out runtime-only fields and leave the rest untouched so the
    canonical hash is stable across frontend versions.
    """
    return {
        "numQubits": int(circuit.get("numQubits", 1)),
        "numClassical": int(circuit.get("numClassical", circuit.get("numQubits", 1))),
        "numTimesteps": int(circuit.get("numTimesteps", 8)),
        "gates": circuit.get("gates", {}) or {},
        "multiQubitGates": circuit.get("multiQubitGates", []) or [],
        "measurements": circuit.get("measurements", []) or [],
        "noiseLevel": float(circuit.get("noiseLevel", 0.0)),
    }


def _normalize_noise(noise_config: Any) -> Dict[str, Any]:
    if isinstance(noise_config, dict):
        return {
            "depolarizing": float(noise_config.get("depolarizing", 0.0)),
            "T1": float(noise_config.get("T1", 0.0)),
            "T2": float(noise_config.get("T2", 0.0)),
        }
    # Numeric noise level (legacy).
    try:
        return {"depolarizing": float(noise_config), "T1": 0.0, "T2": 0.0}
    except (TypeError, ValueError):
        return {"depolarizing": 0.0, "T1": 0.0, "T2": 0.0}


def _build_circuit_steps(circuit: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Flatten the frontend gates dict into the executor's step list."""

    def _normalize_gate(gate: Dict[str, Any]) -> Dict[str, Any]:
        g = dict(gate)
        if "control" in g and "controls" not in g:
            g["controls"] = [g.pop("control")]
        if "target" in g and "targets" not in g:
            g["targets"] = [g.pop("target")]
        if "control2" in g:
            g.setdefault("controls", []).append(g.pop("control2"))
        return g

    steps: List[Dict[str, Any]] = (
        [_normalize_gate(g) for g in (circuit.get("gates", {}) or {}).values()]
        + [_normalize_gate(g) for g in circuit.get("multiQubitGates", []) or []]
        + [_normalize_gate(m) for m in circuit.get("measurements", []) or []]
    )
    return sorted(steps, key=lambda s: s.get("timestep", 0))


def _run_and_collect(
    circuit: Dict[str, Any], noise_config: Dict[str, Any], shots: int, seed: int
) -> Dict[str, Any]:
    """Execute the circuit and assemble the ``results`` block.

    Deterministic with respect to ``seed`` — we set ``np.random.seed`` before
    invoking the executor so any sampling inside the kernel is reproducible.
    """
    from api.circuit_executor import run_simulation

    np.random.seed(int(seed) & 0xFFFFFFFF)

    num_qubits = int(circuit.get("numQubits", 1))
    steps = _build_circuit_steps(circuit)
    noise_level = float(noise_config.get("depolarizing", 0.0))

    probabilities, statevector = run_simulation(num_qubits, steps, noise_level)

    # Build approximate shot counts from probabilities (deterministic given seed).
    counts: Dict[str, int] = {}
    if probabilities:
        keys = list(probabilities.keys())
        probs = np.array([probabilities[k] for k in keys], dtype=float)
        # Renormalise to guard against tiny FP drift.
        s = probs.sum()
        if s > 0:
            probs = probs / s
        samples = np.random.choice(len(keys), size=int(shots), p=probs)
        for idx in samples:
            counts[keys[idx]] = counts.get(keys[idx], 0) + 1

    return {
        "probabilities": probabilities,
        "statevector_real": [float(z.real) for z in statevector.tolist()],
        "statevector_imag": [float(z.imag) for z in statevector.tolist()],
        "counts": counts,
    }


def _circuit_depth(circuit: Dict[str, Any]) -> int:
    timesteps = set()
    for g in (circuit.get("gates", {}) or {}).values():
        timesteps.add(int(g.get("timestep", 0)))
    for g in circuit.get("multiQubitGates", []) or []:
        timesteps.add(int(g.get("timestep", 0)))
    return len(timesteps)


def _base_url() -> str:
    """Best-effort canonical base URL for permalinks."""
    # Honour an explicit env override (e.g. QCUIT_PUBLIC_URL=https://qcuit.com).
    import os

    env = os.environ.get("QCUIT_PUBLIC_URL")
    if env:
        return env.rstrip("/")
    # Fall back to the request host so dev (localhost:5001) still works.
    if request:
        return f"{request.scheme}://{request.host}"
    return "https://qcuit.com"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@notebook_bp.route("/run", methods=["POST"])
def run_notebook():
    """Run a circuit and persist a Notebook artifact."""
    try:
        body = request.get_json(force=True) or {}
        circuit = _normalize_circuit(body.get("circuit") or body)
        noise_config = _normalize_noise(
            body.get("noise_config", body.get("noiseLevel", circuit.get("noiseLevel", 0.0)))
        )
        shots = int(body.get("shots", 1024))
        seed = int(body.get("seed", 0))

        results = _run_and_collect(circuit, noise_config, shots, seed)

        store = NotebookStore()
        notebook = store.save(
            circuit=circuit,
            noise_config=noise_config,
            shots=shots,
            seed=seed,
            results=results,
            metadata={
                "kernel": "statevector",
                "num_qubits": int(circuit.get("numQubits", 1)),
                "depth": _circuit_depth(circuit),
            },
        )

        permalink = f"{_base_url()}/n/{notebook.run_hash}"
        bibtex = build_bibtex(notebook, base_url=_base_url())

        return jsonify(
            {
                "run_hash": notebook.run_hash,
                "url": permalink,
                "bibtex": bibtex,
                "schema_version": notebook.schema_version,
                "created_at": notebook.created_at,
            }
        )
    except Exception as e:  # noqa: BLE001 - we want the message on the wire
        return jsonify({"error": str(e)}), 400


@notebook_bp.route("/<run_hash>", methods=["GET"])
def get_notebook(run_hash: str):
    """Return the full Notebook artifact JSON for ``run_hash``."""
    store = NotebookStore()
    notebook = store.load(run_hash)
    if notebook is None:
        return jsonify({"error": "Notebook not found", "run_hash": run_hash}), 404
    return jsonify(notebook.to_dict())


@notebook_bp.route("/<run_hash>/bibtex", methods=["GET"])
def get_notebook_bibtex(run_hash: str):
    """Return a text/plain BibTeX entry for ``run_hash``."""
    store = NotebookStore()
    notebook = store.load(run_hash)
    if notebook is None:
        return Response(f"% Notebook {run_hash} not found\n", status=404, mimetype="text/plain")
    bibtex = build_bibtex(notebook, base_url=_base_url())
    return Response(bibtex, mimetype="text/plain")


@notebook_bp.route("/gallery", methods=["GET"])
def list_gallery():
    """Return the curated benchmark gallery."""
    # We *don't* eagerly persist gallery notebooks; they materialise on first
    # /run. The hash is precomputed so the frontend can show a permalink that
    # works once the user (or anyone) runs that exact preset.
    from qcuit.io.notebook import canonical_hash  # type: ignore

    items = []
    for entry in GALLERY:
        circuit = _normalize_circuit(entry["circuit"])
        noise_config = _normalize_noise(entry["noise_config"])
        run_hash = canonical_hash(
            {
                "circuit": circuit,
                "noise_config": noise_config,
                "shots": int(entry["shots"]),
                "seed": int(entry["seed"]),
            }
        )
        items.append(
            {
                "slug": entry["slug"],
                "title": entry["title"],
                "summary": entry["summary"],
                "tags": entry["tags"],
                "shots": int(entry["shots"]),
                "seed": int(entry["seed"]),
                "run_hash": run_hash,
                "url": f"{_base_url()}/n/{run_hash}",
                "circuit": circuit,
                "noise_config": noise_config,
            }
        )
    return jsonify({"items": items, "count": len(items)})
