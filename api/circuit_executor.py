"""Circuit Executor - Orchestrates simulation using kernel strategy pattern.

This module provides the main entry point for circuit execution,
delegating to the appropriate simulation kernel based on circuit analysis.
"""
from __future__ import annotations
from typing import Dict, List, Tuple, Optional
import numpy as np

from kernels import StatevectorKernel, KernelManager
from kernels.noise_model import NoiseModel
from code_generator import generate_qiskit_code, generate_braket_code, generate_openqasm_code


# Gate type normalization map
GATE_TYPE_MAP = {
    'S†': 'SDG', 'S\u2020': 'SDG', 'SDAGGER': 'SDG',
    'T†': 'TDG', 'T\u2020': 'TDG', 'TDAGGER': 'TDG',
    'CCX': 'CCNOT', 'TOFFOLI': 'CCNOT',
    'CX': 'CNOT',
    'M': 'MEASUREMENT',
}


class CircuitExecutor:
    """Executes quantum circuits using the optimal simulation kernel."""
    
    def __init__(self, noise_model: Optional[NoiseModel] = None):
        self.kernel_manager = KernelManager()
        self.noise_model = noise_model
        self.kernel: Optional[StatevectorKernel] = None
    
    def execute(
        self,
        num_qubits: int,
        circuit_steps: List[dict],
        noise_level: float = 0.0
    ) -> Tuple[Dict[str, float], np.ndarray]:
        """Execute the circuit and return probabilities and final state.
        
        Args:
            num_qubits: Number of qubits in the circuit
            circuit_steps: List of gate/measurement operations
            noise_level: Depolarizing noise level (0-1)
        
        Returns:
            Tuple of (probabilities dict, statevector)
        """
        # Analyze circuit to select kernel
        analysis = self.kernel_manager.analyze_circuit(circuit_steps)
        kernel_type = self.kernel_manager.select_kernel(num_qubits, analysis)
        
        # Create appropriate kernel
        if kernel_type == 'statevector':
            # Create noise model if noise_level > 0
            noise = None
            if noise_level > 0 or self.noise_model:
                if self.noise_model:
                    noise = self.noise_model
                else:
                    noise = NoiseModel({
                        'global': {'depolarizing': noise_level, 'T1': 0, 'T2': 0}
                    })
            
            self.kernel = StatevectorKernel(noise_model=noise)
        else:
            # Fallback to statevector for now
            self.kernel = StatevectorKernel()
        
        # Initialize state
        self.kernel.initialize(num_qubits)
        
        # Execute each step
        for step in circuit_steps:
            self._execute_step(step, num_qubits)
        
        # Get results
        probabilities = self.kernel.get_probabilities()
        statevector = self.kernel.get_statevector()
        
        return probabilities, statevector
    
    def _execute_step(self, step: dict, num_qubits: int) -> None:
        """Execute a single circuit step."""
        raw_gate_type = step.get('gateType', '')
        gate_type = GATE_TYPE_MAP.get(raw_gate_type.upper(), raw_gate_type.upper())
        
        if gate_type == 'MEASUREMENT':
            # Mid-circuit measurement (for dynamic circuits)
            qubit = step.get('qubit', 0)
            self.kernel.measure(qubit)
        
        elif gate_type in ('CNOT', 'CCNOT', 'CZ'):
            controls = step.get('controls', [])
            targets = step.get('targets', [])
            if targets:
                self.kernel.apply_controlled_gate(gate_type, controls, targets[0])
        
        elif gate_type == 'SWAP':
            targets = step.get('targets', [])
            if len(targets) >= 2:
                self.kernel.apply_swap(targets[0], targets[1])
        
        elif gate_type in ('RX', 'RY', 'RZ'):
            qubit = step.get('qubit', 0)
            theta = float(step.get('theta', 0.0))
            self.kernel.apply_gate(gate_type, qubit, {'theta': theta})
        
        else:
            # Single-qubit gate
            qubit = step.get('qubit', 0)
            self.kernel.apply_gate(gate_type, qubit)


def run_simulation(
    num_qubits: int,
    circuit_steps: List[dict],
    noise_level: float = 0.0
) -> Tuple[Dict[str, float], np.ndarray]:
    """Legacy interface for backward compatibility.
    
    Wraps CircuitExecutor for use by the Flask API.
    """
    executor = CircuitExecutor()
    return executor.execute(num_qubits, circuit_steps, noise_level)
