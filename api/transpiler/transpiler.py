"""Transpiler - Main Circuit Compilation Pipeline

Orchestrates the full transpilation flow:
1. Layout selection
2. Routing (SWAP insertion)
3. Gate decomposition
4. Optimization passes
"""
from __future__ import annotations
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

from .topology import CouplingMap, Layout, HardwareTopology
from .router import SABRERouter, GateOp, decompose_swap


@dataclass
class TranspileResult:
    """Result of circuit transpilation."""
    gates: List[GateOp]
    layout: Layout
    num_swaps: int
    original_depth: int
    transpiled_depth: int
    backend: str


class Transpiler:
    """Main transpilation pipeline."""
    
    def __init__(self, backend: str = 'linear'):
        """Initialize transpiler for a target backend.
        
        Args:
            backend: One of 'linear', 'grid', 'heavy_hex', 'ibm_brisbane', 
                    'ionq_aria', 'rigetti_aspen', or 'all_to_all'
        """
        self.backend = backend
        self.coupling_map = self._get_coupling_map(backend)
        self.router = SABRERouter(self.coupling_map)
    
    def _get_coupling_map(self, backend: str, num_qubits: int = 20) -> CouplingMap:
        """Get coupling map for backend."""
        if backend == 'linear':
            return HardwareTopology.linear(num_qubits)
        elif backend == 'ring':
            return HardwareTopology.ring(num_qubits)
        elif backend == 'grid':
            return HardwareTopology.grid(4, 5)
        elif backend == 'heavy_hex':
            return HardwareTopology.heavy_hex()
        elif backend == 'ibm_brisbane':
            return HardwareTopology.ibm_brisbane()
        elif backend == 'ionq_aria':
            return HardwareTopology.ionq_aria()
        elif backend == 'rigetti_aspen':
            return HardwareTopology.rigetti_aspen()
        elif backend == 'all_to_all':
            # Fully connected - no routing needed
            edges = [(i, j) for i in range(num_qubits) for j in range(i + 1, num_qubits)]
            return CouplingMap(edges)
        else:
            return HardwareTopology.linear(num_qubits)
    
    def transpile(
        self,
        circuit_steps: List[dict],
        num_qubits: int,
        decompose_swaps: bool = True
    ) -> TranspileResult:
        """Transpile a circuit for the target backend.
        
        Args:
            circuit_steps: List of gate operations from frontend
            num_qubits: Number of logical qubits
            decompose_swaps: If True, decompose SWAPs into CNOTs
        
        Returns:
            TranspileResult with routed circuit and metadata
        """
        # Convert to GateOp format
        gates = self._convert_to_gate_ops(circuit_steps)
        original_depth = self._calculate_depth(gates)
        
        # Check if routing is needed
        needs_routing = False
        for gate in gates:
            if len(gate.qubits) == 2:
                if not self.coupling_map.is_connected(gate.qubits[0], gate.qubits[1]):
                    needs_routing = True
                    break
        
        if not needs_routing:
            # No routing needed
            return TranspileResult(
                gates=gates,
                layout=Layout({i: i for i in range(num_qubits)}),
                num_swaps=0,
                original_depth=original_depth,
                transpiled_depth=original_depth,
                backend=self.backend
            )
        
        # Route the circuit
        routed_gates, final_layout, num_swaps = self.router.route(gates)
        
        # Optionally decompose SWAPs into CNOTs
        if decompose_swaps:
            decomposed_gates = []
            for gate in routed_gates:
                if gate.gate_type == 'SWAP':
                    decomposed_gates.extend(decompose_swap(gate.qubits[0], gate.qubits[1]))
                else:
                    decomposed_gates.append(gate)
            routed_gates = decomposed_gates
        
        transpiled_depth = self._calculate_depth(routed_gates)
        
        return TranspileResult(
            gates=routed_gates,
            layout=final_layout,
            num_swaps=num_swaps,
            original_depth=original_depth,
            transpiled_depth=transpiled_depth,
            backend=self.backend
        )
    
    def _convert_to_gate_ops(self, circuit_steps: List[dict]) -> List[GateOp]:
        """Convert frontend circuit format to GateOp list."""
        gates = []
        
        for step in circuit_steps:
            gate_type = step.get('gateType', '').upper()
            
            if gate_type == 'MEASUREMENT':
                continue  # Skip measurements for routing
            
            if 'controls' in step:
                # Multi-qubit gate
                qubits = step.get('controls', []) + step.get('targets', [])
            else:
                # Single-qubit gate
                qubits = [step.get('qubit', 0)]
            
            gates.append(GateOp(
                gate_type=gate_type,
                qubits=qubits,
                params={'theta': step.get('theta')} if 'theta' in step else None,
                timestep=step.get('timestep', 0)
            ))
        
        # Sort by timestep
        gates.sort(key=lambda g: g.timestep)
        return gates
    
    def _calculate_depth(self, gates: List[GateOp]) -> int:
        """Calculate circuit depth."""
        if not gates:
            return 0
        
        qubit_depths: Dict[int, int] = {}
        
        for gate in gates:
            max_depth = max((qubit_depths.get(q, 0) for q in gate.qubits), default=0)
            new_depth = max_depth + 1
            for q in gate.qubits:
                qubit_depths[q] = new_depth
        
        return max(qubit_depths.values()) if qubit_depths else 0
    
    def get_shadow_circuit(self, circuit_steps: List[dict], num_qubits: int) -> List[dict]:
        """Generate shadow circuit showing SWAP operations.
        
        Returns the original gates plus inserted SWAPs for visualization.
        """
        result = self.transpile(circuit_steps, num_qubits, decompose_swaps=False)
        
        shadow_steps = []
        for gate in result.gates:
            step = {
                'gateType': gate.gate_type,
                'timestep': gate.timestep,
                'isTranspiled': gate.gate_type == 'SWAP',
            }
            
            if len(gate.qubits) == 1:
                step['qubit'] = gate.qubits[0]
            else:
                step['controls'] = gate.qubits[:-1]
                step['targets'] = [gate.qubits[-1]]
            
            if gate.params and gate.params.get('theta') is not None:
                step['theta'] = gate.params['theta']
            
            shadow_steps.append(step)
        
        return shadow_steps


def estimate_resources(
    circuit_steps: List[dict],
    num_qubits: int,
    backend: str = 'ibm_brisbane'
) -> Dict:
    """Estimate hardware resources for a circuit.
    
    Returns gate counts, depth, estimated runtime, and error rates.
    """
    # Backend-specific parameters
    backend_params = {
        'ibm_brisbane': {
            'single_qubit_time': 35e-9,  # 35 ns
            'two_qubit_time': 300e-9,    # 300 ns
            'single_qubit_error': 0.0003,
            'two_qubit_error': 0.01,
            't1': 200e-6,
            't2': 150e-6,
        },
        'ionq_aria': {
            'single_qubit_time': 10e-6,   # 10 μs
            'two_qubit_time': 200e-6,     # 200 μs
            'single_qubit_error': 0.0003,
            'two_qubit_error': 0.005,
            't1': 10.0,  # Very long for trapped ions
            't2': 1.0,
        },
        'rigetti_aspen': {
            'single_qubit_time': 40e-9,
            'two_qubit_time': 180e-9,
            'single_qubit_error': 0.001,
            'two_qubit_error': 0.02,
            't1': 30e-6,
            't2': 20e-6,
        },
    }
    
    params = backend_params.get(backend, backend_params['ibm_brisbane'])
    
    # Count gates
    single_qubit_count = 0
    two_qubit_count = 0
    
    for step in circuit_steps:
        if 'controls' in step:
            two_qubit_count += 1
        elif step.get('gateType', '').upper() != 'MEASUREMENT':
            single_qubit_count += 1
    
    # Estimate time
    total_time = (
        single_qubit_count * params['single_qubit_time'] +
        two_qubit_count * params['two_qubit_time']
    )
    
    # Estimate fidelity (simple multiplicative model)
    single_fidelity = (1 - params['single_qubit_error']) ** single_qubit_count
    two_fidelity = (1 - params['two_qubit_error']) ** two_qubit_count
    
    # Decoherence fidelity
    decoherence_fidelity = min(1.0, (
        (1 - total_time / params['t1']) * 
        (1 - total_time / params['t2'])
    ) ** num_qubits)
    
    total_fidelity = single_fidelity * two_fidelity * max(0, decoherence_fidelity)
    
    return {
        'backend': backend,
        'num_qubits': num_qubits,
        'single_qubit_gates': single_qubit_count,
        'two_qubit_gates': two_qubit_count,
        'estimated_time_ns': total_time * 1e9,
        'estimated_fidelity': total_fidelity,
        'circuit_depth': len(set(s.get('timestep', 0) for s in circuit_steps)),
    }
