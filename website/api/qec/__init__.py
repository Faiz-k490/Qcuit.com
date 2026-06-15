"""
api.qec — Quantum Error Correction sandbox (Phase 7, Pillar F).

Public surface:

    Codes:
        REPETITION_3, STEANE_7, SHOR_9, SURFACE_D3, CODE_REGISTRY
    Sim:
        ErrorPattern, syndrome_for, apply_recovery
    Decoders:
        lookup_decode, surface_match_decode, decode_for
    Presets:
        run_round(code, errors, decoder) — full inject→measure→decode pipeline.

The reference implementation lives here; ``qcuit.qec`` re-exports it so
notebooks can run offline.
"""

from __future__ import annotations

from .codes import (
    Code,
    Stabiliser,
    REPETITION_3,
    STEANE_7,
    SHOR_9,
    SURFACE_D3,
    CODE_REGISTRY,
)
from .simulator import (
    ErrorPattern,
    syndrome_for,
    apply_recovery,
    parse_errors,
)
from .decoders import (
    lookup_decode,
    surface_match_decode,
    decode_for,
)
from .presets import run_round

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
