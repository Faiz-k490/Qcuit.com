"""
End-to-end pipelines for the QEC Sandbox.

The single function here, :func:`run_round`, takes a code name plus a list
of injected errors and returns the full inject → measure → decode → verify
trajectory in a JSON-serialisable form. The frontend uses it for the
"Inject → Measure → Decode" button and the route ``/api/qec/run``.
"""

from __future__ import annotations

from typing import Any, Dict, Sequence

from .codes import CODE_REGISTRY
from .decoders import decode_for
from .simulator import (
    ErrorPattern,
    apply_recovery,
    is_logical_error,
    parse_errors,
    syndrome_for,
)


def run_round(code_name: str, errors: Sequence[dict | tuple]) -> Dict[str, Any]:
    """Run one full round: inject → syndrome → decode → recovery → verdict."""
    if code_name not in CODE_REGISTRY:
        raise ValueError(
            f"Unknown code {code_name!r}. Available: {list(CODE_REGISTRY)}"
        )
    code = CODE_REGISTRY[code_name]

    err = parse_errors(code.num_data, errors)
    syndrome = syndrome_for(code, err)
    recovery = decode_for(code, syndrome)
    residual = apply_recovery(err, recovery)
    success = not is_logical_error(code, residual)

    return {
        "code": code.name,
        "errors": err.to_dict(),
        "syndrome": syndrome,
        "stabiliser_names": [s.name for s in code.stabilisers],
        "recovery": recovery.to_dict(),
        "residual": residual.to_dict(),
        "success": bool(success),
        "decoder": code.decoder,
    }
