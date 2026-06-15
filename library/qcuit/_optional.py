"""Helpers for optional scientific dependencies."""

from __future__ import annotations


def missing_extra(package: str, extra: str, feature: str) -> ImportError:
    """Build a consistent ImportError for optional dependency surfaces."""
    return ImportError(
        f"{feature} requires the optional dependency '{package}'. "
        f"Install it with: pip install 'qcuit[{extra}]'"
    )
