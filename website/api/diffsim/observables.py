"""
Hamiltonian observable as a sum of weighted Pauli strings.

A Pauli string is a tuple of N characters from ``{'I','X','Y','Z'}``. The
expectation value ``⟨ψ|H|ψ⟩`` is computed by applying each term as a small
matrix and summing.

The string parser accepts the human-friendly form

    "0.5 Z0 Z1 + 0.3 X0 - 0.1 Y2 Y3"

and produces a list of ``(coeff, pauli_string)`` pairs. The number of qubits
is inferred from the highest qubit index referenced.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List, Tuple

import numpy as np


PauliTerm = Tuple[float, str]  # (coefficient, full pauli string of length N)


# ── Pauli matrices (single-qubit) ────────────────────────────────────────────
_PAULI = {
    "I": np.array([[1, 0], [0, 1]], dtype=np.complex128),
    "X": np.array([[0, 1], [1, 0]], dtype=np.complex128),
    "Y": np.array([[0, -1j], [1j, 0]], dtype=np.complex128),
    "Z": np.array([[1, 0], [0, -1]], dtype=np.complex128),
}


def _kron_chain(matrices: List[np.ndarray]) -> np.ndarray:
    out = matrices[0]
    for m in matrices[1:]:
        out = np.kron(out, m)
    return out


@dataclass
class Hamiltonian:
    """A weighted sum of Pauli strings."""

    num_qubits: int
    terms: List[PauliTerm]

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------
    @classmethod
    def from_terms(cls, num_qubits: int, terms: Iterable[PauliTerm]) -> "Hamiltonian":
        return cls(num_qubits=num_qubits, terms=[(float(c), s.upper()) for c, s in terms])

    @classmethod
    def from_string(cls, expr: str, num_qubits: int | None = None) -> "Hamiltonian":
        """Parse strings like ``0.5 Z0 Z1 + 0.3 X0 - 0.1 Y2``.

        Whitespace is flexible; coefficients default to 1.0.
        """
        # Normalise: turn '-' into '+ -' so we can split on '+'.
        normalised = re.sub(r"\s*-\s*", " + -", expr.strip())
        if normalised.startswith("+"):
            normalised = normalised[1:].strip()
        chunks = [c.strip() for c in normalised.split("+") if c.strip()]

        parsed: List[Tuple[float, List[Tuple[str, int]]]] = []
        max_q = -1
        for chunk in chunks:
            tokens = chunk.split()
            # First token may be a coefficient.
            try:
                coeff = float(tokens[0])
                pauli_tokens = tokens[1:]
            except ValueError:
                coeff = 1.0
                pauli_tokens = tokens

            ops: List[Tuple[str, int]] = []
            for t in pauli_tokens:
                m = re.match(r"^([XYZI])(\d+)$", t.upper())
                if not m:
                    raise ValueError(f"Cannot parse pauli token {t!r} in chunk {chunk!r}")
                op, idx = m.group(1), int(m.group(2))
                ops.append((op, idx))
                max_q = max(max_q, idx)
            parsed.append((coeff, ops))

        n = num_qubits if num_qubits is not None else max_q + 1
        if n <= 0:
            n = 1

        terms: List[PauliTerm] = []
        for coeff, ops in parsed:
            full = ["I"] * n
            for op, idx in ops:
                if idx >= n:
                    raise ValueError(f"Qubit index {idx} >= num_qubits {n}")
                full[idx] = op
            terms.append((coeff, "".join(full)))
        return cls(num_qubits=n, terms=terms)

    # ------------------------------------------------------------------
    # Expectation value
    # ------------------------------------------------------------------
    def expectation(self, statevector: np.ndarray) -> float:
        """Compute ⟨ψ|H|ψ⟩ as a real scalar."""
        psi = np.asarray(statevector, dtype=np.complex128)
        total = 0.0
        for coeff, pauli_string in self.terms:
            mats = [_PAULI[ch] for ch in pauli_string]
            P = _kron_chain(mats)
            val = np.vdot(psi, P @ psi)
            total += coeff * float(val.real)
        return float(total)

    def to_dict(self) -> dict:
        return {
            "num_qubits": int(self.num_qubits),
            "terms": [[float(c), str(s)] for c, s in self.terms],
        }


# ── Curated presets ──────────────────────────────────────────────────────────
def vqe_h2_hamiltonian() -> Hamiltonian:
    """H2 molecule at bond length 0.735 Å in a 4-qubit Jordan-Wigner mapping.

    Reference numerics from the Qiskit Nature tutorial (BK or JW mapping); the
    coefficients here reproduce a textbook ground-state energy near
    ``-1.137 Ha``. Coefficients are stored as a sum of Pauli strings on 4
    qubits.
    """
    # Compact subset that captures the ground state for the Trainer demo.
    # Source: Aspuru-Guzik group H2 in STO-3G, Jordan-Wigner; coefficients
    # rounded to 5 decimals.
    terms = [
        (-0.81261, "IIII"),
        ( 0.17120, "IIIZ"),
        ( 0.17120, "IIZI"),
        (-0.22278, "IZII"),
        (-0.22278, "ZIII"),
        ( 0.16868, "IIZZ"),
        ( 0.12054, "IZIZ"),
        ( 0.16549, "IZZI"),
        ( 0.16549, "ZIIZ"),
        ( 0.12054, "ZIZI"),
        ( 0.17434, "ZZII"),
        ( 0.04532, "XXYY"),
        (-0.04532, "XYYX"),
        (-0.04532, "YXXY"),
        ( 0.04532, "YYXX"),
    ]
    return Hamiltonian(num_qubits=4, terms=terms)


def qaoa_maxcut_hamiltonian(edges: Iterable[Tuple[int, int]] | None = None,
                            num_qubits: int = 4) -> Hamiltonian:
    """MaxCut cost Hamiltonian for an undirected graph.

    Each edge ``(i,j)`` contributes ``0.5 (1 - Z_i Z_j)``; we keep the
    ``-0.5 Z_i Z_j`` part since the constant offset shifts every state
    equally. The default graph is a 4-cycle.
    """
    if edges is None:
        edges = [(0, 1), (1, 2), (2, 3), (3, 0)]
    edge_list = list(edges)
    n = max(num_qubits, max((max(a, b) for a, b in edge_list), default=0) + 1)
    terms: List[PauliTerm] = []
    for i, j in edge_list:
        s = ["I"] * n
        s[i] = "Z"
        s[j] = "Z"
        terms.append((-0.5, "".join(s)))
    # Constant offset (number of edges * 0.5) — kept off so optimisers see
    # a clean min at -|E|/2 (max cut).
    return Hamiltonian(num_qubits=n, terms=terms)


def bloch_state_fit_target() -> Hamiltonian:
    """Single-qubit ⟨Z⟩ — minimised by |1⟩, maximised by |0⟩.

    Used in the Bloch state-fitting demo where we minimise ⟨Z⟩ (driving the
    state to |1⟩) starting from a random superposition.
    """
    return Hamiltonian(num_qubits=1, terms=[(1.0, "Z")])
