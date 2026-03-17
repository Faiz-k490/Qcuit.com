"""Statevector Kernel - Exact Quantum Simulation with Bit-Masking Optimization

Implements efficient state vector simulation using bit-masking to avoid
full matrix multiplication. A gate on qubit k only updates indices where
the k-th bit differs.
"""
from __future__ import annotations
import numpy as np
from typing import Dict, List, Optional
from .kernel_manager import ISimulationKernel


# Gate matrices
I = np.array([[1, 0], [0, 1]], dtype=np.complex128)
X = np.array([[0, 1], [1, 0]], dtype=np.complex128)
Y = np.array([[0, -1j], [1j, 0]], dtype=np.complex128)
Z = np.array([[1, 0], [0, -1]], dtype=np.complex128)
H = np.array([[1, 1], [1, -1]], dtype=np.complex128) / np.sqrt(2)
S = np.array([[1, 0], [0, 1j]], dtype=np.complex128)
SDG = np.array([[1, 0], [0, -1j]], dtype=np.complex128)
T = np.array([[1, 0], [0, np.exp(1j * np.pi / 4)]], dtype=np.complex128)
TDG = np.array([[1, 0], [0, np.exp(-1j * np.pi / 4)]], dtype=np.complex128)

def RX(theta: float) -> np.ndarray:
    c, s = np.cos(theta / 2), np.sin(theta / 2)
    return np.array([[c, -1j * s], [-1j * s, c]], dtype=np.complex128)

def RY(theta: float) -> np.ndarray:
    c, s = np.cos(theta / 2), np.sin(theta / 2)
    return np.array([[c, -s], [s, c]], dtype=np.complex128)

def RZ(theta: float) -> np.ndarray:
    return np.array([[np.exp(-1j * theta / 2), 0], 
                     [0, np.exp(1j * theta / 2)]], dtype=np.complex128)

GATE_MAP = {'I': I, 'X': X, 'Y': Y, 'Z': Z, 'H': H, 'S': S, 'SDG': SDG, 'T': T, 'TDG': TDG}
PARAMETRIC_GATES = {'RX': RX, 'RY': RY, 'RZ': RZ}


class StatevectorKernel(ISimulationKernel):
    """Exact statevector simulation with bit-masking optimization."""
    
    def __init__(self, noise_model: Optional['NoiseModel'] = None):
        self.state: Optional[np.ndarray] = None
        self.num_qubits: int = 0
        self.noise_model = noise_model
    
    def initialize(self, num_qubits: int) -> None:
        """Initialize to |0...0⟩ state."""
        self.num_qubits = num_qubits
        self.state = np.zeros(2 ** num_qubits, dtype=np.complex128)
        self.state[0] = 1.0
    
    def apply_gate(self, gate_type: str, target: int, params: dict = None) -> None:
        """Apply single-qubit gate using bit-masking optimization.
        
        Instead of full 2^n × 2^n matrix multiplication, we iterate only
        over pairs of amplitudes that differ in the target qubit bit.
        This is O(2^n) instead of O(2^2n).
        """
        gate_type = gate_type.upper()
        
        # Get gate matrix
        if gate_type in PARAMETRIC_GATES:
            theta = params.get('theta', 0.0) if params else 0.0
            gate = PARAMETRIC_GATES[gate_type](theta)
        elif gate_type in GATE_MAP:
            gate = GATE_MAP[gate_type]
        else:
            return  # Unknown gate, skip
        
        # Bit-masking optimization
        self._apply_single_qubit_gate(gate, target)
        
        # Apply noise if configured
        if self.noise_model:
            self.noise_model.apply_gate_noise(self, target, gate_type)
    
    def _apply_single_qubit_gate(self, gate: np.ndarray, target: int) -> None:
        """Apply gate using bit-masking - updates only affected amplitude pairs."""
        n = 2 ** self.num_qubits
        target_mask = 1 << target
        
        for i in range(n):
            if i & target_mask == 0:  # Only process when target bit is 0
                j = i | target_mask   # j has target bit = 1
                
                # Apply 2x2 gate to amplitude pair
                a0, a1 = self.state[i], self.state[j]
                self.state[i] = gate[0, 0] * a0 + gate[0, 1] * a1
                self.state[j] = gate[1, 0] * a0 + gate[1, 1] * a1
    
    def apply_controlled_gate(self, gate_type: str, controls: List[int], target: int) -> None:
        """Apply controlled gate using bit-masking."""
        gate_type = gate_type.upper()
        
        # Get target gate matrix
        if gate_type in ('CNOT', 'CX', 'CCX', 'CCNOT', 'TOFFOLI'):
            target_gate = X
        elif gate_type == 'CZ':
            target_gate = Z
        else:
            target_gate = GATE_MAP.get(gate_type, I)
        
        n = 2 ** self.num_qubits
        target_mask = 1 << target
        control_mask = sum(1 << c for c in controls)
        
        for i in range(n):
            # Only apply if all control bits are 1 AND target bit is 0
            if (i & control_mask) == control_mask and (i & target_mask) == 0:
                j = i | target_mask
                
                a0, a1 = self.state[i], self.state[j]
                self.state[i] = target_gate[0, 0] * a0 + target_gate[0, 1] * a1
                self.state[j] = target_gate[1, 0] * a0 + target_gate[1, 1] * a1
    
    def apply_swap(self, q1: int, q2: int) -> None:
        """Apply SWAP gate between two qubits."""
        n = 2 ** self.num_qubits
        mask1, mask2 = 1 << q1, 1 << q2
        
        for i in range(n):
            bit1 = (i >> q1) & 1
            bit2 = (i >> q2) & 1
            
            if bit1 != bit2:  # Only swap when bits differ
                j = i ^ mask1 ^ mask2  # Flip both bits
                if i < j:  # Avoid double-swapping
                    self.state[i], self.state[j] = self.state[j], self.state[i]
    
    def measure(self, qubit: int) -> int:
        """Measure a qubit, collapsing the state."""
        # Calculate probability of measuring |1⟩
        prob_one = 0.0
        mask = 1 << qubit
        
        for i in range(2 ** self.num_qubits):
            if i & mask:
                prob_one += np.abs(self.state[i]) ** 2
        
        # Sample outcome
        outcome = 1 if np.random.random() < prob_one else 0
        
        # Collapse state
        norm = 0.0
        for i in range(2 ** self.num_qubits):
            bit = (i >> qubit) & 1
            if bit != outcome:
                self.state[i] = 0.0
            else:
                norm += np.abs(self.state[i]) ** 2
        
        # Renormalize
        if norm > 0:
            self.state /= np.sqrt(norm)
        
        return outcome
    
    def get_probabilities(self) -> Dict[str, float]:
        """Calculate measurement probabilities for all basis states."""
        probs = np.abs(self.state) ** 2
        results = {}
        
        for i, p in enumerate(probs):
            if p > 1e-12:
                bitstring = format(i, f'0{self.num_qubits}b')
                results[bitstring] = float(p)
        
        return results
    
    def get_statevector(self) -> np.ndarray:
        """Return the current statevector."""
        return self.state.copy()
    
    def get_density_matrix(self) -> np.ndarray:
        """Convert statevector to density matrix ρ = |ψ⟩⟨ψ|."""
        return np.outer(self.state, np.conj(self.state))
