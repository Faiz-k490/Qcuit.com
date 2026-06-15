"""Torch helpers shared by graph models."""

from __future__ import annotations

from typing import Any

from qcuit._optional import missing_extra


def torch_nn():
    try:
        import torch
        from torch import nn
    except ImportError as exc:
        raise missing_extra("torch", "hep", "Qcuit graph models") from exc
    return torch, nn


def unsorted_segment_sum(data: Any, segment_ids: Any, num_segments: int):
    result = data.new_zeros((num_segments, data.size(1)))
    result.index_add_(0, segment_ids, data)
    return result


def unsorted_segment_mean(data: Any, segment_ids: Any, num_segments: int):
    result = data.new_zeros((num_segments, data.size(1)))
    count = data.new_zeros((num_segments, data.size(1)))
    result.index_add_(0, segment_ids, data)
    count.index_add_(0, segment_ids, data.new_ones(data.shape))
    return result / count.clamp(min=1)
