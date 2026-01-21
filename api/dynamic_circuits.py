"""Dynamic Circuits - Classical Control Flow and Mid-Circuit Measurement

Implements a Virtual Machine architecture for dynamic circuit execution:
- Classical register (creg) for storing measurement results
- Instruction pointer with JUMP support
- Mid-circuit measurement and state collapse
- Conditional gates based on classical bits
- Real-time reset (measure + conditional X)
"""
from __future__ import annotations
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
from dataclasses import dataclass, field

from kernels import StatevectorKernel


@dataclass
class ClassicalRegister:
    """Classical register for storing measurement results."""
    size: int
    bits: Dict[int, int] = field(default_factory=dict)
    
    def set(self, index: int, value: int) -> None:
        """Set a classical bit."""
        self.bits[index] = value & 1
    
    def get(self, index: int) -> int:
        """Get a classical bit (default 0)."""
        return self.bits.get(index, 0)
    
    def get_value(self) -> int:
        """Get the integer value of the register."""
        value = 0
        for i in range(self.size):
            value |= self.get(i) << i
        return value
    
    def reset(self) -> None:
        """Reset all bits to 0."""
        self.bits.clear()


@dataclass
class Instruction:
    """A single instruction in the dynamic circuit."""
    op_type: str  # 'gate', 'measure', 'reset', 'if', 'barrier'
    qubits: List[int] = field(default_factory=list)
    classical_bits: List[int] = field(default_factory=list)
    gate_type: str = ''
    params: Dict[str, Any] = field(default_factory=dict)
    condition: Optional[Tuple[int, int]] = None  # (creg_index, expected_value)
    body: List['Instruction'] = field(default_factory=list)  # For conditional blocks


class DynamicCircuitVM:
    """Virtual Machine for executing dynamic quantum circuits.
    
    Supports:
    - Mid-circuit measurement
    - Classical conditional gates (if statements)
    - Real-time qubit reset
    - Classical register operations
    """
    
    def __init__(self, num_qubits: int, num_classical: int):
        self.num_qubits = num_qubits
        self.num_classical = num_classical
        self.kernel = StatevectorKernel()
        self.creg = ClassicalRegister(num_classical)
        self.instructions: List[Instruction] = []
        self.instruction_pointer = 0
        self.shots = 1000
    
    def reset(self) -> None:
        """Reset the VM state."""
        self.kernel.initialize(self.num_qubits)
        self.creg.reset()
        self.instruction_pointer = 0
    
    def add_gate(
        self,
        gate_type: str,
        qubits: List[int],
        params: Optional[Dict] = None,
        condition: Optional[Tuple[int, int]] = None
    ) -> None:
        """Add a gate instruction."""
        self.instructions.append(Instruction(
            op_type='gate',
            gate_type=gate_type,
            qubits=qubits,
            params=params or {},
            condition=condition
        ))
    
    def add_measurement(
        self,
        qubit: int,
        classical_bit: int,
        condition: Optional[Tuple[int, int]] = None
    ) -> None:
        """Add a measurement instruction."""
        self.instructions.append(Instruction(
            op_type='measure',
            qubits=[qubit],
            classical_bits=[classical_bit],
            condition=condition
        ))
    
    def add_reset(self, qubit: int) -> None:
        """Add a reset instruction (measure + conditional X)."""
        self.instructions.append(Instruction(
            op_type='reset',
            qubits=[qubit]
        ))
    
    def add_conditional(
        self,
        creg_index: int,
        expected_value: int,
        body: List[Instruction]
    ) -> None:
        """Add a conditional block."""
        self.instructions.append(Instruction(
            op_type='if',
            condition=(creg_index, expected_value),
            body=body
        ))
    
    def execute_instruction(self, instr: Instruction) -> None:
        """Execute a single instruction."""
        # Check condition
        if instr.condition:
            creg_idx, expected = instr.condition
            if self.creg.get(creg_idx) != expected:
                return  # Skip this instruction
        
        if instr.op_type == 'gate':
            self._execute_gate(instr)
        elif instr.op_type == 'measure':
            self._execute_measure(instr)
        elif instr.op_type == 'reset':
            self._execute_reset(instr)
        elif instr.op_type == 'if':
            # Execute body if condition is met
            creg_idx, expected = instr.condition
            if self.creg.get(creg_idx) == expected:
                for body_instr in instr.body:
                    self.execute_instruction(body_instr)
        elif instr.op_type == 'barrier':
            pass  # Barriers are no-ops in simulation
    
    def _execute_gate(self, instr: Instruction) -> None:
        """Execute a gate instruction."""
        gate_type = instr.gate_type.upper()
        
        if len(instr.qubits) == 1:
            self.kernel.apply_gate(gate_type, instr.qubits[0], instr.params)
        elif len(instr.qubits) == 2:
            if gate_type == 'SWAP':
                self.kernel.apply_swap(instr.qubits[0], instr.qubits[1])
            else:
                self.kernel.apply_controlled_gate(
                    gate_type, 
                    instr.qubits[:-1],  # Controls
                    instr.qubits[-1]    # Target
                )
    
    def _execute_measure(self, instr: Instruction) -> None:
        """Execute a measurement, collapsing the state."""
        qubit = instr.qubits[0]
        classical_bit = instr.classical_bits[0]
        
        result = self.kernel.measure(qubit)
        self.creg.set(classical_bit, result)
    
    def _execute_reset(self, instr: Instruction) -> None:
        """Reset a qubit to |0⟩."""
        qubit = instr.qubits[0]
        
        # Measure the qubit
        result = self.kernel.measure(qubit)
        
        # If result is 1, apply X to flip back to 0
        if result == 1:
            self.kernel.apply_gate('X', qubit)
    
    def run_single_shot(self) -> Tuple[str, Dict[int, int]]:
        """Run the circuit once, return final measurement and creg."""
        self.reset()
        
        for instr in self.instructions:
            self.execute_instruction(instr)
        
        # Final state
        probs = self.kernel.get_probabilities()
        creg_values = dict(self.creg.bits)
        
        # Sample from final probabilities
        states = list(probs.keys())
        probabilities = list(probs.values())
        
        if states:
            idx = np.random.choice(len(states), p=probabilities)
            final_state = states[idx]
        else:
            final_state = '0' * self.num_qubits
        
        return final_state, creg_values
    
    def run(self, shots: int = 1000) -> Dict[str, int]:
        """Run the circuit multiple times, return counts."""
        counts: Dict[str, int] = {}
        
        for _ in range(shots):
            state, _ = self.run_single_shot()
            counts[state] = counts.get(state, 0) + 1
        
        return counts
    
    def get_probabilities(self, shots: int = 1000) -> Dict[str, float]:
        """Run circuit and return probabilities."""
        counts = self.run(shots)
        total = sum(counts.values())
        return {k: v / total for k, v in counts.items()}


def parse_dynamic_circuit(circuit_steps: List[dict], num_qubits: int, num_classical: int) -> DynamicCircuitVM:
    """Parse circuit steps into a Dynamic Circuit VM."""
    vm = DynamicCircuitVM(num_qubits, num_classical)
    
    for step in sorted(circuit_steps, key=lambda s: s.get('timestep', 0)):
        gate_type = step.get('gateType', '').upper()
        
        if gate_type == 'MEASUREMENT':
            vm.add_measurement(
                step.get('qubit', 0),
                step.get('classicalBit', 0)
            )
        elif gate_type == 'RESET':
            vm.add_reset(step.get('qubit', 0))
        elif 'controls' in step:
            # Multi-qubit gate
            qubits = step.get('controls', []) + step.get('targets', [])
            vm.add_gate(gate_type, qubits, step.get('params'))
        else:
            # Single-qubit gate
            params = {'theta': step.get('theta')} if 'theta' in step else None
            vm.add_gate(gate_type, [step.get('qubit', 0)], params)
    
    return vm


def run_dynamic_simulation(
    num_qubits: int,
    num_classical: int,
    circuit_steps: List[dict],
    shots: int = 1000
) -> Tuple[Dict[str, float], Dict[str, int]]:
    """Run a dynamic circuit simulation.
    
    Returns:
        Tuple of (probabilities, raw_counts)
    """
    vm = parse_dynamic_circuit(circuit_steps, num_qubits, num_classical)
    counts = vm.run(shots)
    
    total = sum(counts.values())
    probabilities = {k: v / total for k, v in counts.items()}
    
    return probabilities, counts
