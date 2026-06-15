"""
qcuit.qec — QEC sandbox (library mirror).

Re-exports :mod:`api.qec` so notebooks can run the four canonical
small-distance codes offline:

    from qcuit.qec import run_round, REPETITION_3, STEANE_7, SHOR_9, SURFACE_D3
"""

from __future__ import annotations

try:
    from api.qec import (  # type: ignore
        Code,
        Stabiliser,
        REPETITION_3,
        STEANE_7,
        SHOR_9,
        SURFACE_D3,
        CODE_REGISTRY,
        ErrorPattern,
        syndrome_for,
        apply_recovery,
        parse_errors,
        lookup_decode,
        surface_match_decode,
        decode_for,
        run_round,
    )
except Exception as exc:  # pragma: no cover - website compatibility surface
    raise ImportError(
        "qcuit.qec is still website-API backed. The standalone pip package "
        "currently ships qcuit.hep, qcuit.models, qcuit.quantum, qcuit.diff, "
        "qcuit.qnn, and qcuit.benchmarks."
    ) from exc

__all__ = [
    "Code",
    "Stabiliser",
    "REPETITION_3",
    "STEANE_7",
    "SHOR_9",
    "SURFACE_D3",
    "CODE_REGISTRY",
    "ErrorPattern",
    "syndrome_for",
    "apply_recovery",
    "parse_errors",
    "lookup_decode",
    "surface_match_decode",
    "decode_for",
    "run_round",
]
