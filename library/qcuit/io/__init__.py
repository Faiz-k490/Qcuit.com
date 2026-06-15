"""qcuit.io — I/O primitives (notebooks, hashes, serialisation).

This is the *single source of truth* for canonical Qcuit-Notebook hashing.
Both the Flask backend (``website/api/notebook/store.py``) and the standalone
``qcuit`` library import the helpers below so an artifact hashed offline
matches one hashed online for identical inputs.
"""

from qcuit.io.notebook import (
    Notebook,
    canonical_hash,
    canonical_json,
    SCHEMA_VERSION,
)

__all__ = [
    "Notebook",
    "canonical_hash",
    "canonical_json",
    "SCHEMA_VERSION",
]
