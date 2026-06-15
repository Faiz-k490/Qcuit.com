"""Clifford Stabilizer Kernel - Gottesman-Knill Theorem Implementation

Efficient O(n²) simulation for Clifford circuits using the tableau formalism.
Clifford gates: H, S, CNOT, CZ, X, Y, Z, SWAP

The tableau is a 2n × (2n+1) binary matrix representing:
- n destabilizer generators (rows 0 to n-1)
- n stabilizer generators (rows n to 2n-1)
- Each row has: n X bits | n Z bits | 1 phase bit

Reference: Aaronson & Gottesman, "Improved Simulation of Stabilizer Circuits"
"""
from __future__ import annotations
import numpy as np
from typing import Dict, List, Optional
from .kernel_manager import ISimulationKernel


class CliffordKernel(ISimulationKernel):
    """Tableau-based Clifford circuit simulator.
    
    Memory: O(n²) instead of O(2^n)
    Time per gate: O(n) instead of O(2^n)
    """
    
    def __init__(self):
        self.num_qubits: int = 0
        self.tableau: Optional[np.ndarray] = None
    
    def initialize(self, num_qubits: int) -> None:
        """Initialize tableau to |0...0⟩ state.
        
        Initial state: All stabilizers are Z_i (i.e., Z_i|0⟩ = |0⟩)
        Destabilizers are X_i
        """
        self.num_qubits = num_qubits
        n = num_qubits
        
        # Tableau: 2n rows × (2n+1) columns
        # [X_block | Z_block | phase]
        self.tableau = np.zeros((2 * n, 2 * n + 1), dtype=np.uint8)
        
        # Destabilizers (rows 0 to n-1): X_i for each qubit
        for i in range(n):
            self.tableau[i, i] = 1  # X bit for qubit i
        
        # Stabilizers (rows n to 2n-1): Z_i for each qubit
        for i in range(n):
            self.tableau[n + i, n + i] = 1  # Z bit for qubit i
    
    def _x_bit(self, row: int, qubit: int) -> int:
        """Get X bit for a generator row."""
        return self.tableau[row, qubit]
    
    def _z_bit(self, row: int, qubit: int) -> int:
        """Get Z bit for a generator row."""
        return self.tableau[row, self.num_qubits + qubit]
    
    def _set_x_bit(self, row: int, qubit: int, val: int) -> None:
        self.tableau[row, qubit] = val & 1
    
    def _set_z_bit(self, row: int, qubit: int, val: int) -> None:
        self.tableau[row, self.num_qubits + qubit] = val & 1
    
    def _phase(self, row: int) -> int:
        """Get phase bit (0 = +1, 1 = -1, 2 = +i, 3 = -i)."""
        return self.tableau[row, 2 * self.num_qubits]
    
    def _set_phase(self, row: int, val: int) -> None:
        self.tableau[row, 2 * self.num_qubits] = val & 3
    
    def _rowsum(self, h: int, i: int) -> None:
        """Compute row h = row h ⊕ row i (with phase update).
        
        This is the core operation for Clifford simulation.
        """
        n = self.num_qubits
        
        # Compute phase contribution using the g function
        phase_sum = 0
        for j in range(n):
            x_i, z_i = self._x_bit(i, j), self._z_bit(i, j)
            x_h, z_h = self._x_bit(h, j), self._z_bit(h, j)
            
            # g(x1, z1, x2, z2) computes phase from Pauli multiplication
            if x_i == 0 and z_i == 0:
                g = 0
            elif x_i == 1 and z_i == 1:  # Y
                g = z_h - x_h
            elif x_i == 1 and z_i == 0:  # X
                g = z_h * (2 * x_h - 1)
            else:  # Z (x_i == 0, z_i == 1)
                g = x_h * (1 - 2 * z_h)
            
            phase_sum += g
        
        # Update phase
        new_phase = (self._phase(h) + self._phase(i) + phase_sum) % 4
        self._set_phase(h, new_phase)
        
        # XOR the X and Z bits
        for j in range(n):
            self._set_x_bit(h, j, self._x_bit(h, j) ^ self._x_bit(i, j))
            self._set_z_bit(h, j, self._z_bit(h, j) ^ self._z_bit(i, j))
    
    def apply_gate(self, gate_type: str, target: int, params: dict = None) -> None:
        """Apply a single-qubit Clifford gate."""
        gate_type = gate_type.upper()
        n = self.num_qubits
        
        if gate_type == 'H':
            # Hadamard: swap X and Z, update phase
            for row in range(2 * n):
                x, z = self._x_bit(row, target), self._z_bit(row, target)
                # Phase: r = r ⊕ (x AND z)
                phase = (self._phase(row) + 2 * (x & z)) % 4
                self._set_phase(row, phase)
                # Swap X and Z
                self._set_x_bit(row, target, z)
                self._set_z_bit(row, target, x)
        
        elif gate_type == 'S':
            # S gate: Z = X ⊕ Z, phase update
            for row in range(2 * n):
                x, z = self._x_bit(row, target), self._z_bit(row, target)
                # Phase: r = r ⊕ (x AND z)
                phase = (self._phase(row) + 2 * (x & z)) % 4
                self._set_phase(row, phase)
                # Z = X ⊕ Z
                self._set_z_bit(row, target, x ^ z)
        
        elif gate_type == 'SDG':
            # S†: Apply S three times (S† = S³)
            for _ in range(3):
                self.apply_gate('S', target)
        
        elif gate_type == 'X':
            # X gate: flip phase if Z bit is set
            for row in range(2 * n):
                if self._z_bit(row, target):
                    self._set_phase(row, (self._phase(row) + 2) % 4)
        
        elif gate_type == 'Y':
            # Y = iXZ
            self.apply_gate('X', target)
            self.apply_gate('Z', target)
            # Additional phase from i
            for row in range(2 * n):
                if self._x_bit(row, target) ^ self._z_bit(row, target):
                    self._set_phase(row, (self._phase(row) + 1) % 4)
        
        elif gate_type == 'Z':
            # Z gate: flip phase if X bit is set
            for row in range(2 * n):
                if self._x_bit(row, target):
                    self._set_phase(row, (self._phase(row) + 2) % 4)
        
        elif gate_type == 'I':
            pass  # Identity does nothing
    
    def apply_controlled_gate(self, gate_type: str, controls: List[int], target: int) -> None:
        """Apply CNOT or CZ gate."""
        gate_type = gate_type.upper()
        n = self.num_qubits
        
        if len(controls) != 1:
            raise ValueError("Clifford kernel only supports single-control gates")
        
        control = controls[0]
        
        if gate_type in ('CNOT', 'CX'):
            # CNOT: for each row, if X[control]=1, flip X[target]; if Z[target]=1, flip Z[control]
            for row in range(2 * n):
                x_c, z_c = self._x_bit(row, control), self._z_bit(row, control)
                x_t, z_t = self._x_bit(row, target), self._z_bit(row, target)
                
                # Phase update: r = r ⊕ (x_c AND z_t AND (x_t XOR z_c XOR 1))
                phase_contrib = x_c & z_t & ((x_t ^ z_c ^ 1) & 1)
                self._set_phase(row, (self._phase(row) + 2 * phase_contrib) % 4)
                
                # Update bits
                self._set_x_bit(row, target, x_t ^ x_c)
                self._set_z_bit(row, control, z_c ^ z_t)
        
        elif gate_type == 'CZ':
            # CZ = H(target) CNOT H(target)
            self.apply_gate('H', target)
            self.apply_controlled_gate('CNOT', controls, target)
            self.apply_gate('H', target)
    
    def apply_swap(self, q1: int, q2: int) -> None:
        """Apply SWAP gate using 3 CNOTs."""
        self.apply_controlled_gate('CNOT', [q1], q2)
        self.apply_controlled_gate('CNOT', [q2], q1)
        self.apply_controlled_gate('CNOT', [q1], q2)
    
    def measure(self, qubit: int) -> int:
        """Measure a qubit in the computational basis.
        
        Uses Gaussian elimination to determine if outcome is deterministic or random.
        """
        n = self.num_qubits
        
        # Check if any stabilizer anticommutes with Z_qubit (has X[qubit]=1)
        p = None
        for i in range(n, 2 * n):
            if self._x_bit(i, qubit):
                p = i
                break
        
        if p is not None:
            # Random outcome
            # Update destabilizers and stabilizers
            for i in range(2 * n):
                if i != p and self._x_bit(i, qubit):
                    self._rowsum(i, p)
            
            # Move destabilizer to stabilizer position
            self.tableau[p - n] = self.tableau[p].copy()
            
            # Set new stabilizer to Z_qubit
            self.tableau[p] = 0
            self._set_z_bit(p, qubit, 1)
            
            # Random outcome
            outcome = np.random.randint(2)
            self._set_phase(p, 2 * outcome)
            
            return outcome
        else:
            # Deterministic outcome - need to compute it
            # Create scratch row at position 2n (we'll compute it)
            scratch = np.zeros(2 * n + 1, dtype=np.uint8)
            
            for i in range(n):
                if self._x_bit(i, qubit):
                    # XOR with stabilizer
                    scratch ^= self.tableau[i + n]
            
            # Outcome is determined by phase
            return (scratch[2 * n] >> 1) & 1
    
    def get_probabilities(self) -> Dict[str, float]:
        """Get measurement probabilities by sampling.
        
        For Clifford states, we sample multiple times to estimate probabilities.
        """
        samples = 1000
        counts = {}
        
        for _ in range(samples):
            # Create a copy for measurement
            saved_tableau = self.tableau.copy()
            
            # Measure all qubits
            result = ''
            for q in range(self.num_qubits):
                result += str(self.measure(q))
            
            # Restore tableau
            self.tableau = saved_tableau
            
            counts[result] = counts.get(result, 0) + 1
        
        return {k: v / samples for k, v in counts.items()}
    
    def get_statevector(self) -> np.ndarray:
        """Convert stabilizer state to statevector (exponential - use sparingly)."""
        n = self.num_qubits
        state = np.zeros(2 ** n, dtype=np.complex128)
        
        # Find all basis states stabilized by all generators
        for i in range(2 ** n):
            bitstring = format(i, f'0{n}b')
            is_stabilized = True
            phase_total = 0
            
            for row in range(n, 2 * n):
                # Check if this stabilizer stabilizes |bitstring⟩
                x_count = 0
                for q in range(n):
                    if self._x_bit(row, q) and bitstring[n - 1 - q] == '1':
                        x_count += 1
                
                # Eigenvalue is (-1)^(x_count) * phase
                eigenvalue_phase = (x_count * 2 + self._phase(row)) % 4
                
                if eigenvalue_phase in (2, 3):  # -1 or -i eigenvalue
                    is_stabilized = False
                    break
            
            if is_stabilized:
                state[i] = 1.0
        
        # Normalize
        norm = np.linalg.norm(state)
        if norm > 0:
            state /= norm
        
        return state
