"""Kernel Manager - Strategy Pattern for Simulation Backend Selection

Evaluates circuit characteristics and selects optimal simulation kernel.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING
import numpy as np

if TYPE_CHECKING:
    from typing import Dict, List, Tuple


class ISimulationKernel(ABC):
    """Interface for simulation kernels (Strategy Pattern)."""
    
    @abstractmethod
    def initialize(self, num_qubits: int) -> None:
        """Initialize the quantum state."""
        pass
    
    @abstractmethod
    def apply_gate(self, gate_type: str, target: int, params: dict = None) -> None:
        """Apply a single-qubit gate."""
        pass
    
    @abstractmethod
    def apply_controlled_gate(self, gate_type: str, controls: List[int], target: int) -> None:
        """Apply a controlled gate."""
        pass
    
    @abstractmethod
    def measure(self, qubit: int) -> int:
        """Measure a qubit, returning 0 or 1."""
        pass
    
    @abstractmethod
    def get_probabilities(self) -> Dict[str, float]:
        """Get measurement probabilities for all basis states."""
        pass
    
    @abstractmethod
    def get_statevector(self) -> np.ndarray:
        """Get the current statevector (if available)."""
        pass


class KernelManager:
    """Evaluates circuits and selects optimal simulation kernel."""
    
    CLIFFORD_GATES = {'H', 'S', 'SDG', 'X', 'Y', 'Z', 'CNOT', 'CZ', 'SWAP'}
    PARAMETRIC_GATES = {'RX', 'RY', 'RZ', 'U', 'U1', 'U2', 'U3'}
    
    def __init__(self, max_statevector_qubits: int = 25):
        self.max_statevector_qubits = max_statevector_qubits
    
    def analyze_circuit(self, circuit_steps: List[dict]) -> dict:
        """Analyze circuit to determine optimal kernel."""
        gate_types = set()
        num_gates = 0
        has_parametric = False
        has_measurement = False
        
        for step in circuit_steps:
            gate_type = step.get('gateType', '').upper()
            gate_types.add(gate_type)
            num_gates += 1
            
            if gate_type in self.PARAMETRIC_GATES:
                has_parametric = True
            if gate_type == 'MEASUREMENT':
                has_measurement = True
        
        is_clifford_only = gate_types.issubset(self.CLIFFORD_GATES | {'MEASUREMENT', 'I'})
        
        return {
            'gate_types': gate_types,
            'num_gates': num_gates,
            'is_clifford_only': is_clifford_only,
            'has_parametric': has_parametric,
            'has_measurement': has_measurement,
        }
    
    def select_kernel(self, num_qubits: int, circuit_analysis: dict) -> str:
        """Select optimal kernel based on circuit analysis.
        
        Returns: 'statevector', 'clifford', or 'tensor_network'
        """
        # For now, always use statevector (other kernels to be implemented)
        # Future: Use Clifford for Clifford-only circuits
        # Future: Use Tensor Network for large circuits with low entanglement
        
        if num_qubits > self.max_statevector_qubits:
            if circuit_analysis['is_clifford_only']:
                return 'clifford'
            return 'tensor_network'
        
        return 'statevector'
