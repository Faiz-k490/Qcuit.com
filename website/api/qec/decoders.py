"""
Decoders for the QEC sandbox.

Two decoder families are exposed:

    1. ``lookup_decode`` — exhaustive single-qubit lookup. For a code with
       distance 3, every weight-1 Pauli error has a unique syndrome; we build
       a syndrome→recovery map at first use and consult it. This is exact
       for the four canonical small codes shipped here.

    2. ``surface_match_decode`` — greedy nearest-neighbour matching of
       syndrome violations on the surface code lattice. Conceptually similar
       to MWPM but kept simple: each violated stabiliser is paired with its
       closest neighbour (Manhattan distance) and the X/Z chain between them
       is added to the recovery. For d=3 this is exact for any single error.
"""

from __future__ import annotations

from functools import lru_cache
from itertools import product
from typing import List, Sequence, Tuple

from .codes import Code, Stabiliser
from .simulator import ErrorPattern, syndrome_for


# ──────────────────────────────────────────────────────────────────────────
# Lookup decoder
# ──────────────────────────────────────────────────────────────────────────
def _enumerate_weight1_errors(code: Code) -> List[ErrorPattern]:
    """All single-qubit X, Y, Z errors plus the identity error."""
    out: List[ErrorPattern] = [ErrorPattern(num_qubits=code.num_data)]
    for q in range(code.num_data):
        for p in ("X", "Y", "Z"):
            e = ErrorPattern(num_qubits=code.num_data)
            e.add(p, q)
            out.append(e)
    return out


@lru_cache(maxsize=8)
def _build_lookup_table(code_name: str) -> dict:
    from .codes import CODE_REGISTRY  # local import to avoid cycles
    code = CODE_REGISTRY[code_name]
    table = {}
    # Identity error first → empty syndrome maps to identity recovery.
    for err in _enumerate_weight1_errors(code):
        s = tuple(syndrome_for(code, err))
        # Prefer the lowest-weight recovery for a syndrome that already exists.
        if s not in table:
            table[s] = err
    return table


def lookup_decode(code: Code, syndrome: Sequence[int]) -> ErrorPattern:
    """Look up the canonical weight-≤1 recovery for a given syndrome."""
    table = _build_lookup_table(code.name)
    s = tuple(int(b) for b in syndrome)
    if s in table:
        return table[s]
    # Unknown syndrome (weight ≥ 2 error): try a greedy 2-qubit search.
    for q1, p1 in product(range(code.num_data), ("X", "Y", "Z")):
        for q2, p2 in product(range(code.num_data), ("X", "Y", "Z")):
            if q1 == q2:
                continue
            e = ErrorPattern(num_qubits=code.num_data)
            e.add(p1, q1)
            e.add(p2, q2)
            if tuple(syndrome_for(code, e)) == s:
                return e
    return ErrorPattern(num_qubits=code.num_data)  # fallback


# ──────────────────────────────────────────────────────────────────────────
# Surface-code greedy matcher
# ──────────────────────────────────────────────────────────────────────────
def _data_pos(code: Code, q: int) -> Tuple[float, float]:
    return code.data_positions[q]


def _violated(code: Code, syndrome: Sequence[int]) -> Tuple[List[Stabiliser], List[Stabiliser]]:
    """Split violated stabilisers into (X-type, Z-type) lists."""
    x_viol: List[Stabiliser] = []
    z_viol: List[Stabiliser] = []
    for stab, bit in zip(code.stabilisers, syndrome):
        if not bit:
            continue
        (x_viol if stab.pauli == "X" else z_viol).append(stab)
    return x_viol, z_viol


def _greedy_pair(stabs: List[Stabiliser]) -> List[Tuple[Stabiliser, Stabiliser | None]]:
    """Greedy pairing of violated stabilisers by Manhattan distance.

    Odd one out is paired with ``None`` (which the chain builder maps to
    the nearest boundary).
    """
    remaining = list(stabs)
    pairs: List[Tuple[Stabiliser, Stabiliser | None]] = []
    while remaining:
        a = remaining.pop(0)
        if not remaining:
            pairs.append((a, None))
            break
        # Closest by Manhattan in stabiliser-coordinate space.
        best_idx = 0
        best_d = float("inf")
        for i, b in enumerate(remaining):
            if a.pos is None or b.pos is None:
                d = 0
            else:
                d = abs(a.pos[0] - b.pos[0]) + abs(a.pos[1] - b.pos[1])
            if d < best_d:
                best_d = d
                best_idx = i
        b = remaining.pop(best_idx)
        pairs.append((a, b))
    return pairs


def surface_match_decode(code: Code, syndrome: Sequence[int]) -> ErrorPattern:
    """Greedy MWPM-style decoder for the surface code."""
    recovery = ErrorPattern(num_qubits=code.num_data)
    x_viol, z_viol = _violated(code, syndrome)

    # X-type violations are caused by Z errors → recovery applies Z chain.
    # Z-type violations are caused by X errors → recovery applies X chain.

    def chain_qubits(s_a: Stabiliser, s_b: Stabiliser | None) -> List[int]:
        """Pick the data qubit(s) that connect two stabilisers.

        For d=3 with single errors, the symmetric difference of their
        supports yields the qubit between them; for an unpaired violation
        we pick the support qubit closest to the lattice boundary, which
        for our grid is just any single qubit in the support.
        """
        if s_b is None:
            return [s_a.qubits[0]]
        common = set(s_a.qubits) & set(s_b.qubits)
        if common:
            return list(common)
        # Disjoint: walk the closest pair of qubits.
        return [s_a.qubits[0], s_b.qubits[0]]

    for a, b in _greedy_pair(z_viol):
        for q in chain_qubits(a, b):
            recovery.add("X", q)

    for a, b in _greedy_pair(x_viol):
        for q in chain_qubits(a, b):
            recovery.add("Z", q)

    # Final consistency check: if the proposed recovery does not erase the
    # syndrome, fall back to the exhaustive lookup decoder. This makes the
    # surface code robust against the corner cases where the greedy choice
    # of common-qubit chains misses by one.
    if syndrome_for(code, recovery) != [int(b) for b in syndrome]:
        return lookup_decode(code, syndrome)
    return recovery


# ──────────────────────────────────────────────────────────────────────────
def decode_for(code: Code, syndrome: Sequence[int]) -> ErrorPattern:
    """Dispatch to the code's preferred decoder."""
    if code.decoder == "surface_match":
        return surface_match_decode(code, syndrome)
    return lookup_decode(code, syndrome)
