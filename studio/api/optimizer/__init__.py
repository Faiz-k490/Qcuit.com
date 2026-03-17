"""Circuit Optimizer Module - DAG-based Optimization Passes

Implements pattern matching and gate cancellation/fusion optimizations.
"""

from .dag import CircuitDAG
from .passes import (
    OptimizationPass,
    GateCancellation,
    GateFusion,
    CommutationAnalysis,
    optimize_circuit
)

__all__ = [
    'CircuitDAG',
    'OptimizationPass',
    'GateCancellation', 
    'GateFusion',
    'CommutationAnalysis',
    'optimize_circuit'
]
