"""
api.notebook.bibtex — Emit a citable BibTeX @misc entry for a Notebook.

We deliberately keep the output to a single ``@misc{...}`` entry with the
canonical Qcuit Notebook URL and the SHA-256 in the ``note`` field, so
researchers can cite a specific simulation forever without depending on
DOI infrastructure.

Example output::

    @misc{qcuit_a1b2c3d4...,
      author       = {Qcuit Notebook},
      title        = {Qcuit run a1b2c3d4...},
      year         = {2026},
      howpublished = {Qcuit Notebook https://qcuit.com/n/a1b2c3d4...},
      note         = {SHA-256: a1b2c3d4...}
    }
"""

from __future__ import annotations

from typing import Any


def _short_hash(run_hash: str, n: int = 8) -> str:
    return run_hash[:n]


def build_bibtex(
    notebook: Any,
    *,
    base_url: str = "https://qcuit.com",
    author: str = "Qcuit Notebook",
) -> str:
    """Render a Notebook as a single ``@misc`` BibTeX entry.

    Parameters
    ----------
    notebook:
        Anything with ``run_hash`` and ``created_at`` attributes (e.g. the
        :class:`qcuit.io.notebook.Notebook` dataclass).
    base_url:
        Root for the citable permalink. Override in dev/staging.
    author:
        Author field. ``"Qcuit Notebook"`` is the default attribution.
    """
    run_hash = notebook.run_hash
    created_at = notebook.created_at  # ISO-8601 UTC string
    year = created_at[:4] if isinstance(created_at, str) and len(created_at) >= 4 else ""

    permalink = f"{base_url.rstrip('/')}/n/{run_hash}"
    key = f"qcuit_{_short_hash(run_hash)}"

    lines = [
        f"@misc{{{key},",
        f"  author       = {{{author}}},",
        f"  title        = {{Qcuit run {_short_hash(run_hash, 12)}}},",
        f"  year         = {{{year}}},",
        f"  howpublished = {{Qcuit Notebook {permalink}}},",
        f"  note         = {{SHA-256: {run_hash}}}",
        "}",
    ]
    return "\n".join(lines) + "\n"
