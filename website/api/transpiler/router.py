"""SABRE Router - SWAP-based Bidirectional Heuristic Search

Implements the SABRE algorithm for routing quantum circuits on
constrained hardware topologies.

Reference: Li, Ding, Xie - "Tackling the Qubit Mapping Problem for NISQ-Era"
"""
from __future__ import annotations
from typing import Dict, List, Tuple, Set, Optional
from dataclasses import dataclass
from .topology import CouplingMap, Layout
import heapq


@dataclass
class GateOp:
    """Represents a gate operation in the circuit."""
    gate_type: str
    qubits: List[int]  # Logical qubits
    params: Optional[dict] = None
    timestep: int = 0


class SABRERouter:
    """SABRE routing algorithm for qubit mapping.
    
    Uses a heuristic cost function combining:
    - Nearest neighbor cost (primary)
    - Lookahead to future gates (secondary)
    """
    
    def __init__(self, coupling_map: CouplingMap, lookahead_depth: int = 20):
        self.coupling_map = coupling_map
        self.lookahead_depth = lookahead_depth
        self.decay_factor = 0.5
    
    def route(
        self,
        gates: List[GateOp],
        initial_layout: Optional[Layout] = None
    ) -> Tuple[List[GateOp], Layout, int]:
        """Route a circuit using SABRE.
        
        Args:
            gates: List of gate operations with logical qubits
            initial_layout: Optional starting layout
        
        Returns:
            Tuple of (routed_gates, final_layout, num_swaps_added)
        """
        if not gates:
            return [], initial_layout or Layout(), 0
        
        # Find all logical qubits used
        logical_qubits = set()
        for gate in gates:
            logical_qubits.update(gate.qubits)
        
        # Initialize layout (trivial mapping if not provided)
        layout = initial_layout or Layout({
            q: q for q in sorted(logical_qubits)
        })
        
        # Build dependency graph (front layer tracking)
        remaining_gates = list(gates)
        routed_gates: List[GateOp] = []
        num_swaps = 0
        
        while remaining_gates:
            # Find executable gates (front layer)
            front_layer = self._get_front_layer(remaining_gates, layout)
            
            if not front_layer:
                # Should not happen with valid circuit
                break
            
            # Try to execute gates that are already valid
            executed_any = False
            for gate in front_layer[:]:
                if self._is_executable(gate, layout):
                    # Map to physical qubits and execute
                    physical_qubits = [layout.get_physical(q) for q in gate.qubits]
                    routed_gate = GateOp(
                        gate_type=gate.gate_type,
                        qubits=physical_qubits,
                        params=gate.params,
                        timestep=len(routed_gates)
                    )
                    routed_gates.append(routed_gate)
                    remaining_gates.remove(gate)
                    front_layer.remove(gate)
                    executed_any = True
            
            if executed_any:
                continue
            
            # Need to insert SWAPs - find best SWAP
            best_swap = self._find_best_swap(front_layer, remaining_gates, layout)
            
            if best_swap:
                p1, p2 = best_swap
                
                # Insert SWAP gate
                swap_gate = GateOp(
                    gate_type='SWAP',
                    qubits=[p1, p2],
                    timestep=len(routed_gates)
                )
                routed_gates.append(swap_gate)
                num_swaps += 1
                
                # Update layout
                layout.swap(p1, p2)
            else:
                # Fallback: force execute with identity (shouldn't happen)
                break
        
        return routed_gates, layout, num_swaps
    
    def _get_front_layer(self, gates: List[GateOp], layout: Layout) -> List[GateOp]:
        """Get gates that can potentially be executed (no dependencies)."""
        # For simplicity, return all 2-qubit gates that haven't been executed
        # A full implementation would track DAG dependencies
        front = []
        executed_qubits: Set[int] = set()
        
        for gate in gates:
            if len(gate.qubits) == 2:
                if not any(q in executed_qubits for q in gate.qubits):
                    front.append(gate)
                    executed_qubits.update(gate.qubits)
            elif len(gate.qubits) == 1:
                # Single-qubit gates are always executable
                front.append(gate)
        
        return front[:self.lookahead_depth]
    
    def _is_executable(self, gate: GateOp, layout: Layout) -> bool:
        """Check if gate can be executed with current layout."""
        if len(gate.qubits) <= 1:
            return True
        
        physical_qubits = [layout.get_physical(q) for q in gate.qubits]
        
        if len(physical_qubits) == 2:
            return self.coupling_map.is_connected(physical_qubits[0], physical_qubits[1])
        
        return False
    
    def _find_best_swap(
        self,
        front_layer: List[GateOp],
        all_remaining: List[GateOp],
        layout: Layout
    ) -> Optional[Tuple[int, int]]:
        """Find the SWAP that minimizes the heuristic cost."""
        best_swap = None
        best_cost = float('inf')
        
        # Get all candidate SWAPs (edges in coupling map)
        for p1, p2 in self.coupling_map.edges:
            # Calculate cost if we apply this SWAP
            test_layout = Layout(layout.logical_to_physical.copy())
            test_layout.swap(p1, p2)
            
            cost = self._calculate_cost(front_layer, all_remaining, test_layout)
            
            if cost < best_cost:
                best_cost = cost
                best_swap = (p1, p2)
        
        return best_swap
    
    def _calculate_cost(
        self,
        front_layer: List[GateOp],
        all_remaining: List[GateOp],
        layout: Layout
    ) -> float:
        """Calculate heuristic cost for a layout.
        
        Cost = sum of distances for front layer gates
             + decay * sum of distances for lookahead gates
        """
        cost = 0.0
        
        # Front layer cost (primary)
        for gate in front_layer:
            if len(gate.qubits) == 2:
                p1 = layout.get_physical(gate.qubits[0])
                p2 = layout.get_physical(gate.qubits[1])
                cost += self.coupling_map.distance(p1, p2)
        
        # Lookahead cost (secondary, decayed)
        decay = self.decay_factor
        for i, gate in enumerate(all_remaining[len(front_layer):self.lookahead_depth]):
            if len(gate.qubits) == 2:
                p1 = layout.get_physical(gate.qubits[0])
                p2 = layout.get_physical(gate.qubits[1])
                cost += decay * self.coupling_map.distance(p1, p2)
                decay *= self.decay_factor
        
        return cost


def decompose_swap(p1: int, p2: int) -> List[GateOp]:
    """Decompose SWAP into 3 CNOTs."""
    return [
        GateOp('CNOT', [p1, p2]),
        GateOp('CNOT', [p2, p1]),
        GateOp('CNOT', [p1, p2]),
    ]
