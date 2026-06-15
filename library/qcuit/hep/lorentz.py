"""Lorentz geometry primitives for HEP quantum ML workflows."""

from __future__ import annotations

from typing import Any, Iterable

import numpy as np

from qcuit._optional import missing_extra


def _is_torch_tensor(value: Any) -> bool:
    return value.__class__.__module__.startswith("torch")


def _torch():
    try:
        import torch
    except ImportError as exc:
        raise missing_extra("torch", "hep", "Torch-backed Lorentz utilities") from exc
    return torch


def minkowski_metric(*, like: Any | None = None, dtype: Any | None = None, device: Any | None = None):
    """Return diag(1, -1, -1, -1) as NumPy or Torch.

    If ``like`` is a Torch tensor, the result is a Torch tensor on the same
    device/dtype.  Otherwise the result is a NumPy array.
    """
    values = [1.0, -1.0, -1.0, -1.0]
    if like is not None and _is_torch_tensor(like):
        torch = _torch()
        return torch.diag(torch.tensor(values, dtype=dtype or like.dtype, device=device or like.device))
    return np.diag(np.asarray(values, dtype=dtype or float))


def euclidean_metric(*, like: Any | None = None, dtype: Any | None = None, device: Any | None = None):
    """Return the 4D Euclidean metric as NumPy or Torch."""
    if like is not None and _is_torch_tensor(like):
        torch = _torch()
        return torch.eye(4, dtype=dtype or like.dtype, device=device or like.device)
    return np.eye(4, dtype=dtype or float)


def resolve_metric(metric: str | Any | None, *, like: Any | None = None):
    """Resolve a metric name/array into a concrete metric tensor."""
    if metric is None or metric == "minkowski":
        return minkowski_metric(like=like)
    if metric == "euclidean":
        return euclidean_metric(like=like)
    return metric


def minkowski_dot(p: Any, q: Any, metric: Any | None = None):
    """Compute the metric inner product ``p^T g q`` along the final axis."""
    metric = resolve_metric(metric, like=p)
    if _is_torch_tensor(p) or _is_torch_tensor(q):
        torch = _torch()
        p_t = p if _is_torch_tensor(p) else torch.as_tensor(p, dtype=q.dtype, device=q.device)
        q_t = q if _is_torch_tensor(q) else torch.as_tensor(q, dtype=p_t.dtype, device=p_t.device)
        g_t = metric if _is_torch_tensor(metric) else torch.as_tensor(metric, dtype=p_t.dtype, device=p_t.device)
        return torch.einsum("...i,ij,...j->...", p_t, g_t, q_t)
    p_np = np.asarray(p)
    q_np = np.asarray(q)
    return np.einsum("...i,ij,...j->...", p_np, np.asarray(metric), q_np)


def minkowski_norm(p: Any, metric: Any | None = None):
    """Compute the squared metric norm ``p^T g p`` along the final axis."""
    return minkowski_dot(p, p, metric=metric)


def psi(values: Any):
    """Stable signed-log feature map used by LorentzNet/Lie-EQGNN."""
    if _is_torch_tensor(values):
        torch = _torch()
        return torch.sign(values) * torch.log(torch.abs(values) + 1.0)
    values_np = np.asarray(values)
    return np.sign(values_np) * np.log(np.abs(values_np) + 1.0)


def lorentz_boost(beta: float | Iterable[float], axis: str = "x") -> np.ndarray:
    """Return a 4x4 Lorentz boost matrix.

    ``beta`` is velocity divided by c.  Pass a scalar with ``axis`` set to
    ``"x"``, ``"y"``, or ``"z"``, or pass a 3-vector beta.
    """
    if isinstance(beta, (int, float)):
        vec = np.zeros(3, dtype=float)
        axes = {"x": 0, "y": 1, "z": 2}
        if axis not in axes:
            raise ValueError("axis must be one of 'x', 'y', or 'z'")
        vec[axes[axis]] = float(beta)
    else:
        vec = np.asarray(list(beta), dtype=float)
        if vec.shape != (3,):
            raise ValueError("beta vector must have shape (3,)")

    b2 = float(np.dot(vec, vec))
    if b2 >= 1.0:
        raise ValueError("|beta| must be less than 1")
    if b2 == 0.0:
        return np.eye(4)

    gamma = 1.0 / np.sqrt(1.0 - b2)
    boost = np.eye(4)
    boost[0, 0] = gamma
    boost[0, 1:] = -gamma * vec
    boost[1:, 0] = -gamma * vec
    boost[1:, 1:] += ((gamma - 1.0) / b2) * np.outer(vec, vec)
    return boost


def apply_lorentz_transform(vectors: Any, transform: Any):
    """Apply a Lorentz transform to one or more four-vectors."""
    if _is_torch_tensor(vectors) or _is_torch_tensor(transform):
        torch = _torch()
        v = vectors if _is_torch_tensor(vectors) else torch.as_tensor(vectors, dtype=transform.dtype)
        t = transform if _is_torch_tensor(transform) else torch.as_tensor(transform, dtype=v.dtype, device=v.device)
        return torch.einsum("ij,...j->...i", t, v)
    return np.einsum("ij,...j->...i", np.asarray(transform), np.asarray(vectors))


def check_metric_invariance(generators: Any, metric: Any | None = None, *, atol: float = 1e-5) -> bool:
    """Check ``L.T @ g + g @ L == 0`` for each Lie algebra generator."""
    metric = resolve_metric(metric, like=generators)
    if _is_torch_tensor(generators):
        torch = _torch()
        g = metric if _is_torch_tensor(metric) else torch.as_tensor(metric, dtype=generators.dtype, device=generators.device)
        residuals = [L.T @ g + g @ L for L in generators]
        return all(bool(torch.allclose(r, torch.zeros_like(r), atol=atol)) for r in residuals)
    gens = np.asarray(generators)
    g_np = np.asarray(metric)
    return all(np.allclose(L.T @ g_np + g_np @ L, 0.0, atol=atol) for L in gens)


def invariant_metric_from_generators(
    generators: Any,
    *,
    steps: int = 500,
    lr: float = 1.0,
    push: float = 0.05,
    seed: int = 0,
):
    """Learn an invariant metric from Lie generators with Torch LBFGS.

    This packages the notebook step used in the Lie-EQGNN workflow:
    minimize ``sum_i ||L_i.T J + J L_i||^2 - push * ||J||``.
    """
    torch = _torch()
    gens = generators if _is_torch_tensor(generators) else torch.as_tensor(generators, dtype=torch.float32)
    torch.manual_seed(seed)
    dim = gens.shape[-1]
    metric = torch.randn(dim, dim, dtype=gens.dtype, device=gens.device, requires_grad=True)
    optimizer = torch.optim.LBFGS([metric], lr=lr)

    def closure():
        optimizer.zero_grad()
        loss = torch.zeros((), dtype=gens.dtype, device=gens.device)
        for generator in gens:
            residual = generator.T @ metric + metric @ generator
            loss = loss + torch.sum(residual * residual)
        loss = loss - push * torch.linalg.norm(metric)
        loss.backward()
        return loss

    for _ in range(int(steps)):
        optimizer.step(closure)

    with torch.no_grad():
        sym = 0.5 * (metric + metric.T)
    return sym.detach()
