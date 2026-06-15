"""
api.notebook.gallery — Curated benchmark Notebooks (seed gallery).

Each entry is a small reference circuit shipped with the platform so users
can pull up a canonical, hashable run from day one. The entries below are
*specifications* of inputs; their actual Notebook artifacts are built on
demand by ``/api/notebook/gallery`` so the SHA-256 of every gallery entry
is computed from the same canonical hash function used everywhere else.
"""

from __future__ import annotations

from typing import Any, Dict, List


def _gate(g: str, qubit: int, timestep: int, **extra) -> Dict[str, Any]:
    g_id = f"preset-{g.lower()}-{qubit}-{timestep}"
    payload = {"id": g_id, "gateType": g, "qubit": qubit, "timestep": timestep}
    payload.update(extra)
    return payload


def _multi(g: str, controls: List[int], targets: List[int], timestep: int) -> Dict[str, Any]:
    return {
        "id": f"preset-{g.lower()}-{controls}-{targets}-{timestep}",
        "gateType": g,
        "controls": controls,
        "targets": targets,
        "timestep": timestep,
    }


def _circuit(
    num_qubits: int,
    gates: Dict[str, Dict[str, Any]],
    multi: List[Dict[str, Any]],
) -> Dict[str, Any]:
    return {
        "numQubits": num_qubits,
        "numClassical": num_qubits,
        "numTimesteps": max(8, 2 * num_qubits),
        "gates": gates,
        "multiQubitGates": multi,
        "measurements": [],
        "noiseLevel": 0.0,
    }


# ---------------------------------------------------------------------------
# Curated 10-entry seed gallery
# ---------------------------------------------------------------------------

GALLERY: List[Dict[str, Any]] = [
    {
        "slug": "bell",
        "title": "Bell state |Φ⁺⟩",
        "summary": "Two-qubit maximally-entangled state from H + CNOT.",
        "tags": ["entanglement", "foundational"],
        "circuit": _circuit(
            2,
            {"q_0-0": _gate("H", 0, 0)},
            [_multi("CNOT", [0], [1], 1)],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "ghz3",
        "title": "GHZ-3",
        "summary": "Three-qubit GHZ state (1/√2)(|000⟩+|111⟩).",
        "tags": ["entanglement", "multi-qubit"],
        "circuit": _circuit(
            3,
            {"q_0-0": _gate("H", 0, 0)},
            [_multi("CNOT", [0], [1], 1), _multi("CNOT", [1], [2], 2)],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "qft3",
        "title": "QFT-3",
        "summary": "Quantum Fourier Transform on 3 qubits (Hadamard + controlled phases).",
        "tags": ["algorithm", "fourier"],
        # Simplified QFT-3 ladder; controlled phases approximated by CZ for the
        # gallery preview (full implementation lives in the curriculum).
        "circuit": _circuit(
            3,
            {
                "q_0-0": _gate("H", 0, 0),
                "q_1-2": _gate("H", 1, 2),
                "q_2-4": _gate("H", 2, 4),
            },
            [
                _multi("CZ", [0], [1], 1),
                _multi("CZ", [0], [2], 3),
                _multi("CZ", [1], [2], 5),
            ],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "grover3",
        "title": "Grover (3-qubit, single iteration)",
        "summary": "Equal superposition + oracle + diffuser sketch.",
        "tags": ["algorithm", "search"],
        "circuit": _circuit(
            3,
            {
                "q_0-0": _gate("H", 0, 0),
                "q_1-0": _gate("H", 1, 0),
                "q_2-0": _gate("H", 2, 0),
                "q_0-2": _gate("H", 0, 2),
                "q_1-2": _gate("H", 1, 2),
                "q_2-2": _gate("H", 2, 2),
            },
            [_multi("CZ", [0, 1], [2], 1)],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "vqe_h2",
        "title": "VQE H₂ (sketch)",
        "summary": "Hardware-efficient ansatz on 2 qubits — placeholder for Phase 5.",
        "tags": ["variational", "chemistry"],
        "circuit": _circuit(
            2,
            {
                "q_0-0": _gate("RY", 0, 0, theta=0.5),
                "q_1-0": _gate("RY", 1, 0, theta=0.5),
                "q_0-2": _gate("RY", 0, 2, theta=0.3),
                "q_1-2": _gate("RY", 1, 2, theta=0.3),
            },
            [_multi("CNOT", [0], [1], 1)],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "deutsch_jozsa",
        "title": "Deutsch–Jozsa (2+1 qubits)",
        "summary": "Constant-vs-balanced oracle determined in one query.",
        "tags": ["algorithm", "oracle"],
        "circuit": _circuit(
            3,
            {
                "q_0-0": _gate("H", 0, 0),
                "q_1-0": _gate("H", 1, 0),
                "q_2-0": _gate("X", 2, 0),
                "q_2-1": _gate("H", 2, 1),
                "q_0-3": _gate("H", 0, 3),
                "q_1-3": _gate("H", 1, 3),
            },
            [_multi("CNOT", [0], [2], 2), _multi("CNOT", [1], [2], 2)],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "phase_estimation",
        "title": "Phase Estimation (2-bit)",
        "summary": "Two-qubit register estimating phase of a controlled-Z.",
        "tags": ["algorithm", "phase"],
        "circuit": _circuit(
            3,
            {
                "q_0-0": _gate("H", 0, 0),
                "q_1-0": _gate("H", 1, 0),
                "q_2-0": _gate("X", 2, 0),
                "q_0-2": _gate("H", 0, 2),
                "q_1-2": _gate("H", 1, 2),
            },
            [_multi("CZ", [0], [2], 1), _multi("CZ", [1], [2], 1)],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "teleportation",
        "title": "Teleportation",
        "summary": "Bell-pair + Bell-measurement scheme (3 qubits).",
        "tags": ["protocol", "entanglement"],
        "circuit": _circuit(
            3,
            {
                "q_0-0": _gate("H", 0, 0),
                "q_1-1": _gate("H", 1, 1),
            },
            [
                _multi("CNOT", [1], [2], 2),
                _multi("CNOT", [0], [1], 3),
            ],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "bernstein_vazirani",
        "title": "Bernstein–Vazirani (s=101)",
        "summary": "Recover the hidden 3-bit string s in a single oracle query.",
        "tags": ["algorithm", "oracle"],
        "circuit": _circuit(
            4,
            {
                "q_0-0": _gate("H", 0, 0),
                "q_1-0": _gate("H", 1, 0),
                "q_2-0": _gate("H", 2, 0),
                "q_3-0": _gate("X", 3, 0),
                "q_3-1": _gate("H", 3, 1),
                "q_0-3": _gate("H", 0, 3),
                "q_1-3": _gate("H", 1, 3),
                "q_2-3": _gate("H", 2, 3),
            },
            [
                _multi("CNOT", [0], [3], 2),
                _multi("CNOT", [2], [3], 2),
            ],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
    {
        "slug": "qec_repetition",
        "title": "Repetition code (distance 3)",
        "summary": "Three-qubit X-error repetition code — encode + parity sketch.",
        "tags": ["qec", "repetition"],
        "circuit": _circuit(
            3,
            {"q_0-0": _gate("H", 0, 0)},
            [
                _multi("CNOT", [0], [1], 1),
                _multi("CNOT", [0], [2], 2),
            ],
        ),
        "noise_config": {"depolarizing": 0.0, "T1": 0, "T2": 0},
        "shots": 1024,
        "seed": 0,
    },
]
