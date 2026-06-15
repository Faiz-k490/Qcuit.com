"""
Stabiliser code definitions.

A :class:`Code` describes the qubit layout, stabiliser group, and logical
operators for one of four canonical codes:

    - REPETITION_3   (3 data qubits, 2 Z-stabilisers, distance 1 against bit flips)
    - STEANE_7       (7 data qubits, 6 stabilisers, distance 3 CSS code)
    - SHOR_9         (9 data qubits, 8 stabilisers, distance 3, concatenated)
    - SURFACE_D3     (9 data qubits in a 3x3 grid, 8 stabilisers, distance 3
                      rotated surface code)

Each :class:`Stabiliser` lists the qubits it acts on and the Pauli (X or Z).
Y-stabilisers are absent in CSS codes; Y-errors are detected via the AND of
the X- and Z-stabiliser fingerprints.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass(frozen=True)
class Stabiliser:
    name: str
    pauli: str          # 'X' or 'Z'
    qubits: Tuple[int, ...]
    # Optional 2D coordinate (for the surface code lattice).
    pos: Tuple[float, float] | None = None


@dataclass
class Code:
    name: str
    num_data: int
    stabilisers: List[Stabiliser]
    logical_x: Tuple[int, ...]    # qubits the logical X acts on
    logical_z: Tuple[int, ...]    # qubits the logical Z acts on
    distance: int
    # Optional 2D coordinates for data qubits (used by the SVG renderer).
    data_positions: List[Tuple[float, float]] = field(default_factory=list)
    description: str = ""
    decoder: str = "lookup"       # 'lookup' or 'surface_match'

    # ─── Helpers ──────────────────────────────────────────────────────────
    @property
    def num_stabilisers(self) -> int:
        return len(self.stabilisers)

    def stabilisers_by_pauli(self, pauli: str) -> List[Stabiliser]:
        return [s for s in self.stabilisers if s.pauli == pauli]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "num_data": int(self.num_data),
            "distance": int(self.distance),
            "stabilisers": [
                {
                    "name": s.name,
                    "pauli": s.pauli,
                    "qubits": list(s.qubits),
                    "pos": list(s.pos) if s.pos is not None else None,
                }
                for s in self.stabilisers
            ],
            "logical_x": list(self.logical_x),
            "logical_z": list(self.logical_z),
            "data_positions": [list(p) for p in self.data_positions],
            "description": self.description,
            "decoder": self.decoder,
        }


# ────────────────────────────────────────────────────────────────────────────
# Repetition-3 (bit-flip)
# ────────────────────────────────────────────────────────────────────────────
REPETITION_3 = Code(
    name="repetition_3",
    num_data=3,
    stabilisers=[
        Stabiliser("Z01", "Z", (0, 1)),
        Stabiliser("Z12", "Z", (1, 2)),
    ],
    logical_x=(0, 1, 2),       # X̄ = X0 X1 X2
    logical_z=(0,),            # Z̄ = Z0 (any single Z works)
    distance=3,                # corrects single bit-flip
    data_positions=[(0.0, 0.0), (1.0, 0.0), (2.0, 0.0)],
    description="3-qubit repetition code, corrects a single X (bit-flip) error.",
    decoder="lookup",
)


# ────────────────────────────────────────────────────────────────────────────
# Steane-7 (CSS, distance 3)
# ────────────────────────────────────────────────────────────────────────────
# Standard Steane-7 stabilisers (Hamming-code construction).
_STEANE_X_PARITIES = [
    (3, 4, 5, 6),
    (1, 2, 5, 6),
    (0, 2, 4, 6),
]
_STEANE_Z_PARITIES = list(_STEANE_X_PARITIES)  # CSS — same parities for Z

STEANE_7 = Code(
    name="steane_7",
    num_data=7,
    stabilisers=(
        [Stabiliser(f"X{i}", "X", q) for i, q in enumerate(_STEANE_X_PARITIES)] +
        [Stabiliser(f"Z{i}", "Z", q) for i, q in enumerate(_STEANE_Z_PARITIES)]
    ),
    logical_x=tuple(range(7)),
    logical_z=tuple(range(7)),
    distance=3,
    data_positions=[
        (0.0, 0.0),  # 0
        (1.0, 0.0),  # 1
        (2.0, 0.0),  # 2
        (0.0, 1.0),  # 3
        (1.0, 1.0),  # 4
        (2.0, 1.0),  # 5
        (1.0, 2.0),  # 6
    ],
    description="Steane-7 CSS code, distance 3, corrects any single-qubit error.",
    decoder="lookup",
)


# ────────────────────────────────────────────────────────────────────────────
# Shor-9 (concatenated bit + phase flip, distance 3)
# ────────────────────────────────────────────────────────────────────────────
# Block layout: qubits 0,1,2 | 3,4,5 | 6,7,8.
SHOR_9 = Code(
    name="shor_9",
    num_data=9,
    stabilisers=[
        # Z-stabilisers within each block (detect X-errors)
        Stabiliser("Z01", "Z", (0, 1)),
        Stabiliser("Z12", "Z", (1, 2)),
        Stabiliser("Z34", "Z", (3, 4)),
        Stabiliser("Z45", "Z", (4, 5)),
        Stabiliser("Z67", "Z", (6, 7)),
        Stabiliser("Z78", "Z", (7, 8)),
        # X-stabilisers across blocks (detect Z-errors)
        Stabiliser("Xab", "X", (0, 1, 2, 3, 4, 5)),
        Stabiliser("Xbc", "X", (3, 4, 5, 6, 7, 8)),
    ],
    logical_x=(0, 1, 2, 3, 4, 5, 6, 7, 8),
    logical_z=(0, 3, 6),
    distance=3,
    data_positions=[
        (0.0, 0.0), (1.0, 0.0), (2.0, 0.0),
        (0.0, 1.0), (1.0, 1.0), (2.0, 1.0),
        (0.0, 2.0), (1.0, 2.0), (2.0, 2.0),
    ],
    description="Shor-9 concatenated bit-flip + phase-flip code, distance 3.",
    decoder="lookup",
)


# ────────────────────────────────────────────────────────────────────────────
# Rotated surface code d=3 (9 data qubits in a 3×3 grid)
# ────────────────────────────────────────────────────────────────────────────
# Layout (data qubit indices on a 3×3 grid):
#
#       0 - 1 - 2
#       |   |   |
#       3 - 4 - 5
#       |   |   |
#       6 - 7 - 8
#
# This is the well-known *Surface-17* layout (Tomita-Svore 2014): rough
# (Z) boundaries on top/bottom rows, smooth (X) boundaries on left/right
# columns. 4 Z-stabilisers + 4 X-stabilisers; every pair commutes; every
# qubit is covered by both an X- and a Z-stabiliser; minimum-weight logical
# operator has weight 3 (a single row for L̄_Z, a single column for L̄_X).
_SURFACE_Z_STABS = [
    ("Z_a", (1, 2)),                # top boundary (rough, weight 2)
    ("Z_b", (0, 1, 3, 4)),          # bulk top-left
    ("Z_c", (4, 5, 7, 8)),          # bulk bottom-right
    ("Z_d", (6, 7)),                # bottom boundary (rough, weight 2)
]
_SURFACE_X_STABS = [
    ("X_a", (0, 3)),                # left boundary (smooth, weight 2)
    ("X_b", (1, 2, 4, 5)),          # bulk top-right
    ("X_c", (3, 4, 6, 7)),          # bulk bottom-left
    ("X_d", (5, 8)),                # right boundary (smooth, weight 2)
]

SURFACE_D3 = Code(
    name="surface_d3",
    num_data=9,
    stabilisers=(
        [Stabiliser(n, "Z", q, pos=(
            (sum(_p[0] for _p in [(qi % 3, qi // 3) for qi in q]) / len(q)),
            (sum(_p[1] for _p in [(qi % 3, qi // 3) for qi in q]) / len(q)),
        )) for n, q in _SURFACE_Z_STABS]
        +
        [Stabiliser(n, "X", q, pos=(
            (sum(qi % 3 for qi in q) / len(q)),
            (sum(qi // 3 for qi in q) / len(q)),
        )) for n, q in _SURFACE_X_STABS]
    ),
    # With Z-stabilisers on the top/bottom rows and X-stabilisers on the
    # left/right columns, L̄_X spans rough-rough (top row) and L̄_Z spans
    # smooth-smooth (left column).
    logical_x=(0, 1, 2),    # top row
    logical_z=(0, 3, 6),    # left column
    distance=3,
    data_positions=[(c, r) for r in range(3) for c in range(3)],
    description="Rotated surface code (d=3, Surface-17) on 9 data qubits.",
    # For d=3 the exhaustive single-qubit lookup table is *minimum-weight* by
    # construction, so it strictly dominates a greedy nearest-pair matcher
    # (which can pick a recovery in the wrong homology class for the centre
    # qubit). Higher-distance surface codes would switch to ``surface_match``.
    decoder="lookup",
)


CODE_REGISTRY: Dict[str, Code] = {
    REPETITION_3.name: REPETITION_3,
    STEANE_7.name: STEANE_7,
    SHOR_9.name: SHOR_9,
    SURFACE_D3.name: SURFACE_D3,
}
