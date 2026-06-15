"""
Stabiliser-level Pauli error simulator.

We track an :class:`ErrorPattern` as a pair of bit-vectors (``x_bits``,
``z_bits``) over the ``num_data`` data qubits. A Y-error on qubit i sets
both bits.

Syndrome rules (CSS — X- and Z-stabilisers separately):

    - A *Z-stabiliser* (``pauli == 'Z'``) anti-commutes with X- and Y-errors
      on its support. Its syndrome bit is the XOR of those error bits.
    - An *X-stabiliser* (``pauli == 'X'``) anti-commutes with Z- and Y-errors
      on its support. Its syndrome bit is the XOR of those error bits.

This is sufficient for the canonical CSS codes shipped here.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Sequence

from .codes import Code


@dataclass
class ErrorPattern:
    num_qubits: int
    x_bits: List[int] = field(default_factory=list)
    z_bits: List[int] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.x_bits:
            self.x_bits = [0] * self.num_qubits
        if not self.z_bits:
            self.z_bits = [0] * self.num_qubits

    # ── Construction helpers ──────────────────────────────────────────────
    def add(self, pauli: str, qubit: int) -> None:
        if not (0 <= qubit < self.num_qubits):
            raise ValueError(f"Qubit {qubit} out of range for {self.num_qubits}-qubit code")
        p = pauli.upper()
        if p == "X":
            self.x_bits[qubit] ^= 1
        elif p == "Z":
            self.z_bits[qubit] ^= 1
        elif p == "Y":
            self.x_bits[qubit] ^= 1
            self.z_bits[qubit] ^= 1
        elif p == "I":
            return
        else:
            raise ValueError(f"Unknown pauli {pauli!r}")

    def to_dict(self) -> dict:
        return {"x_bits": list(self.x_bits), "z_bits": list(self.z_bits)}


def parse_errors(num_qubits: int, errors: Sequence[dict | tuple]) -> ErrorPattern:
    """Build an :class:`ErrorPattern` from a list of ``{pauli, qubit}`` dicts
    or ``(pauli, qubit)`` tuples.
    """
    pattern = ErrorPattern(num_qubits=num_qubits)
    for item in errors:
        if isinstance(item, (list, tuple)):
            pauli, qubit = item[0], int(item[1])
        else:
            pauli = item.get("pauli") or item.get("p")
            qubit = int(item.get("qubit", item.get("q", 0)))
        pattern.add(pauli, qubit)
    return pattern


# ──────────────────────────────────────────────────────────────────────────
def syndrome_for(code: Code, error: ErrorPattern) -> List[int]:
    """Return the syndrome (one bit per stabiliser, in declaration order)."""
    if error.num_qubits != code.num_data:
        raise ValueError(
            f"Error pattern has {error.num_qubits} qubits but code has {code.num_data}"
        )
    syndrome: List[int] = []
    for stab in code.stabilisers:
        bit = 0
        if stab.pauli == "Z":
            # Anti-commute with X / Y errors → use x_bits
            for q in stab.qubits:
                bit ^= error.x_bits[q]
        elif stab.pauli == "X":
            # Anti-commute with Z / Y errors → use z_bits
            for q in stab.qubits:
                bit ^= error.z_bits[q]
        else:
            raise ValueError(f"Unsupported stabiliser pauli {stab.pauli!r}")
        syndrome.append(bit)
    return syndrome


def apply_recovery(error: ErrorPattern, recovery: ErrorPattern) -> ErrorPattern:
    """Combine an error pattern with a recovery pattern (XOR of bit-vectors)."""
    if error.num_qubits != recovery.num_qubits:
        raise ValueError("error and recovery have different num_qubits")
    n = error.num_qubits
    out = ErrorPattern(num_qubits=n)
    out.x_bits = [error.x_bits[i] ^ recovery.x_bits[i] for i in range(n)]
    out.z_bits = [error.z_bits[i] ^ recovery.z_bits[i] for i in range(n)]
    return out


def is_logical_error(code: Code, residual: ErrorPattern) -> bool:
    """After recovery, does the residual Pauli implement a logical operator?

    A residual is a *logical X* if it XORs the X̄ support and has trivial
    syndrome; a logical Z if it XORs the Z̄ support; a logical Y if both.
    A pure stabiliser (full-syndrome zero, supported on no logical) is fine.
    """
    if syndrome_for(code, residual) != [0] * code.num_stabilisers:
        # Still has a syndrome — the recovery failed.
        return True

    # Anti-commutation with Z̄ → residual contains X̄ component
    z_overlap = sum(residual.x_bits[q] for q in code.logical_z) & 1
    # Anti-commutation with X̄ → residual contains Z̄ component
    x_overlap = sum(residual.z_bits[q] for q in code.logical_x) & 1
    return bool(z_overlap or x_overlap)
