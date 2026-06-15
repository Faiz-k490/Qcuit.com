"""Hamiltonian observables as weighted Pauli-string sums."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, List, Tuple

import numpy as np


PauliTerm = Tuple[float, str]

_PAULI = {
    "I": np.array([[1, 0], [0, 1]], dtype=np.complex128),
    "X": np.array([[0, 1], [1, 0]], dtype=np.complex128),
    "Y": np.array([[0, -1j], [1j, 0]], dtype=np.complex128),
    "Z": np.array([[1, 0], [0, -1]], dtype=np.complex128),
}


def _kron_chain(matrices: List[np.ndarray]) -> np.ndarray:
    out = matrices[0]
    for matrix in matrices[1:]:
        out = np.kron(out, matrix)
    return out


@dataclass
class Hamiltonian:
    """A weighted sum of Pauli strings."""

    num_qubits: int
    terms: List[PauliTerm]

    @classmethod
    def from_terms(cls, num_qubits: int, terms: Iterable[PauliTerm]) -> "Hamiltonian":
        return cls(num_qubits=num_qubits, terms=[(float(coeff), text.upper()) for coeff, text in terms])

    @classmethod
    def from_string(cls, expr: str, num_qubits: int | None = None) -> "Hamiltonian":
        """Parse expressions like ``0.5 Z0 Z1 + 0.3 X0 - 0.1 Y2``."""
        normalised = re.sub(r"\s*-\s*", " + -", expr.strip())
        if normalised.startswith("+"):
            normalised = normalised[1:].strip()
        chunks = [chunk.strip() for chunk in normalised.split("+") if chunk.strip()]

        parsed: List[Tuple[float, List[Tuple[str, int]]]] = []
        max_q = -1
        for chunk in chunks:
            tokens = chunk.split()
            try:
                coeff = float(tokens[0])
                pauli_tokens = tokens[1:]
            except ValueError:
                coeff = 1.0
                pauli_tokens = tokens

            ops: List[Tuple[str, int]] = []
            for token in pauli_tokens:
                match = re.match(r"^([XYZI])(\d+)$", token.upper())
                if not match:
                    raise ValueError(f"Cannot parse Pauli token {token!r} in chunk {chunk!r}")
                op, idx = match.group(1), int(match.group(2))
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

    def expectation(self, statevector: np.ndarray) -> float:
        """Compute ``<psi|H|psi>`` as a real scalar."""
        psi = np.asarray(statevector, dtype=np.complex128)
        total = 0.0
        for coeff, pauli_string in self.terms:
            operator = _kron_chain([_PAULI[ch] for ch in pauli_string])
            total += coeff * float(np.vdot(psi, operator @ psi).real)
        return float(total)

    def to_dict(self) -> dict:
        return {
            "num_qubits": int(self.num_qubits),
            "terms": [[float(coeff), str(text)] for coeff, text in self.terms],
        }


def vqe_h2_hamiltonian() -> Hamiltonian:
    """Return a compact 4-qubit H2 Hamiltonian for VQE demos."""
    terms = [
        (-0.81261, "IIII"),
        (0.17120, "IIIZ"),
        (0.17120, "IIZI"),
        (-0.22278, "IZII"),
        (-0.22278, "ZIII"),
        (0.16868, "IIZZ"),
        (0.12054, "IZIZ"),
        (0.16549, "IZZI"),
        (0.16549, "ZIIZ"),
        (0.12054, "ZIZI"),
        (0.17434, "ZZII"),
        (0.04532, "XXYY"),
        (-0.04532, "XYYX"),
        (-0.04532, "YXXY"),
        (0.04532, "YYXX"),
    ]
    return Hamiltonian(num_qubits=4, terms=terms)


def qaoa_maxcut_hamiltonian(
    edges: Iterable[Tuple[int, int]] | None = None,
    num_qubits: int = 4,
) -> Hamiltonian:
    """Return the MaxCut cost Hamiltonian for an undirected graph."""
    if edges is None:
        edges = [(0, 1), (1, 2), (2, 3), (3, 0)]
    edge_list = list(edges)
    n = max(num_qubits, max((max(a, b) for a, b in edge_list), default=0) + 1)
    terms: List[PauliTerm] = []
    for i, j in edge_list:
        paulis = ["I"] * n
        paulis[i] = "Z"
        paulis[j] = "Z"
        terms.append((-0.5, "".join(paulis)))
    return Hamiltonian(num_qubits=n, terms=terms)


def bloch_state_fit_target() -> Hamiltonian:
    """Return single-qubit Z expectation, minimized by |1>."""
    return Hamiltonian(num_qubits=1, terms=[(1.0, "Z")])
