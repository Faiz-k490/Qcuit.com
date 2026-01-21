"""Quantum Simulation Kernels - Strategy Pattern Implementation

This module provides multiple simulation backends:
- StatevectorKernel: Exact simulation with bit-masking optimization
- CliffordKernel: Efficient O(n²) simulation for Clifford circuits
- TensorNetworkKernel: MPS-based for low-entanglement circuits (future)
"""

from .statevector import StatevectorKernel
from .clifford import CliffordKernel
from .kernel_manager import KernelManager, ISimulationKernel
from .noise_model import NoiseModel, create_ibm_noise_model

__all__ = [
    'StatevectorKernel', 
    'CliffordKernel',
    'KernelManager', 
    'ISimulationKernel',
    'NoiseModel',
    'create_ibm_noise_model'
]
