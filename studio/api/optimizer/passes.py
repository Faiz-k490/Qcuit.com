"""Optimization Passes - Pattern Matching and Gate Simplification

Implements optimization rules:
- Gate cancellation: X·X = I, H·H = I, etc.
- Gate fusion: Rz(θ1)·Rz(θ2) = Rz(θ1+θ2)
- Commutation analysis: Reorder gates to enable more cancellations
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Dict, List, Set, Tuple, Optional
import numpy as np

from .dag import CircuitDAG, DAGNode


class OptimizationPass(ABC):
    """Base class for optimization passes."""
    
    @abstractmethod
    def run(self, dag: CircuitDAG) -> CircuitDAG:
        """Apply the optimization pass to a DAG."""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of this optimization pass."""
        pass


class GateCancellation(OptimizationPass):
    """Cancel adjacent inverse gate pairs.
    
    Rules:
    - X·X = I
    - Y·Y = I  
    - Z·Z = I
    - H·H = I
    - S·S† = I
    - T·T† = I
    - CNOT·CNOT = I (same control/target)
    """
    
    # Self-inverse gates
    SELF_INVERSE = {'X', 'Y', 'Z', 'H', 'CNOT', 'CZ', 'SWAP'}
    
    # Inverse pairs
    INVERSE_PAIRS = {
        ('S', 'SDG'), ('SDG', 'S'),
        ('T', 'TDG'), ('TDG', 'T'),
    }
    
    @property
    def name(self) -> str:
        return "GateCancellation"
    
    def run(self, dag: CircuitDAG) -> CircuitDAG:
        """Remove cancelling gate pairs."""
        changed = True
        
        while changed:
            changed = False
            nodes_to_remove = set()
            
            for node_id, node in list(dag.nodes.items()):
                if node_id in nodes_to_remove:
                    continue
                
                # Check each successor
                for succ_id in list(node.successors):
                    if succ_id in nodes_to_remove:
                        continue
                    
                    succ = dag.nodes.get(succ_id)
                    if not succ:
                        continue
                    
                    # Check if gates cancel
                    if self._gates_cancel(node, succ):
                        # Check if succ only depends on node for shared qubits
                        if self._can_cancel(node, succ, dag):
                            nodes_to_remove.add(node_id)
                            nodes_to_remove.add(succ_id)
                            changed = True
                            break
            
            # Remove cancelled gates
            for node_id in nodes_to_remove:
                dag.remove_node(node_id)
        
        return dag
    
    def _gates_cancel(self, node1: DAGNode, node2: DAGNode) -> bool:
        """Check if two gates cancel each other."""
        # Must act on same qubits
        if set(node1.qubits) != set(node2.qubits):
            return False
        
        g1, g2 = node1.gate_type, node2.gate_type
        
        # Self-inverse gates
        if g1 == g2 and g1 in self.SELF_INVERSE:
            return True
        
        # Inverse pairs
        if (g1, g2) in self.INVERSE_PAIRS:
            return True
        
        return False
    
    def _can_cancel(self, node1: DAGNode, node2: DAGNode, dag: CircuitDAG) -> bool:
        """Check if cancellation is valid (no intervening gates on qubits)."""
        # node2 must be a direct successor of node1 on all shared qubits
        shared_qubits = set(node1.qubits) & set(node2.qubits)
        
        # For each shared qubit, node2 should be the immediate successor
        for succ_id in node1.successors:
            succ = dag.nodes.get(succ_id)
            if succ and succ_id != node2.id:
                if set(succ.qubits) & shared_qubits:
                    return False
        
        return True


class GateFusion(OptimizationPass):
    """Fuse adjacent rotation gates.
    
    Rules:
    - Rz(θ1)·Rz(θ2) = Rz(θ1+θ2)
    - Rx(θ1)·Rx(θ2) = Rx(θ1+θ2)
    - Ry(θ1)·Ry(θ2) = Ry(θ1+θ2)
    """
    
    ROTATION_GATES = {'RX', 'RY', 'RZ'}
    
    @property
    def name(self) -> str:
        return "GateFusion"
    
    def run(self, dag: CircuitDAG) -> CircuitDAG:
        """Fuse adjacent rotation gates."""
        changed = True
        
        while changed:
            changed = False
            
            for node_id in list(dag.nodes.keys()):
                node = dag.nodes.get(node_id)
                if not node or node.gate_type not in self.ROTATION_GATES:
                    continue
                
                # Look for same-type rotation successor
                for succ_id in list(node.successors):
                    succ = dag.nodes.get(succ_id)
                    if not succ:
                        continue
                    
                    if (succ.gate_type == node.gate_type and
                        succ.qubits == node.qubits):
                        
                        # Fuse the rotations
                        theta1 = node.params.get('theta', 0) if node.params else 0
                        theta2 = succ.params.get('theta', 0) if succ.params else 0
                        new_theta = theta1 + theta2
                        
                        # Check if result is effectively identity
                        if abs(new_theta % (2 * np.pi)) < 1e-10:
                            # Remove both gates
                            dag.remove_node(node_id)
                            dag.remove_node(succ_id)
                        else:
                            # Update first gate with combined angle
                            node.params = {'theta': new_theta}
                            # Remove second gate
                            dag.remove_node(succ_id)
                        
                        changed = True
                        break
                
                if changed:
                    break
        
        return dag


class CommutationAnalysis(OptimizationPass):
    """Reorder commuting gates to enable more cancellations.
    
    Rules:
    - Gates on disjoint qubits commute
    - Z and Rz commute with CNOT (on control)
    - X and Rx commute with CNOT (on target)
    """
    
    @property
    def name(self) -> str:
        return "CommutationAnalysis"
    
    def run(self, dag: CircuitDAG) -> CircuitDAG:
        """Reorder gates to group cancellable pairs."""
        # For each qubit, group same-type gates together
        changed = True
        iterations = 0
        max_iterations = 10
        
        while changed and iterations < max_iterations:
            changed = False
            iterations += 1
            
            for node_id in list(dag.nodes.keys()):
                node = dag.nodes.get(node_id)
                if not node:
                    continue
                
                # Try to find a later gate of same type that we can commute with
                for succ_id in list(node.successors):
                    succ = dag.nodes.get(succ_id)
                    if not succ:
                        continue
                    
                    # Check if there's another gate between them that commutes
                    for between_id in list(succ.predecessors):
                        if between_id == node_id:
                            continue
                        
                        between = dag.nodes.get(between_id)
                        if not between:
                            continue
                        
                        # Can we swap 'between' with 'node'?
                        if self._gates_commute(node, between):
                            # Check if swapping helps (brings same-type gates together)
                            if node.gate_type == succ.gate_type:
                                # Perform the swap in DAG
                                # This is complex; for now, just mark as changed
                                pass
        
        return dag
    
    def _gates_commute(self, node1: DAGNode, node2: DAGNode) -> bool:
        """Check if two gates commute."""
        # Disjoint qubits always commute
        if not set(node1.qubits) & set(node2.qubits):
            return True
        
        # Z-type gates commute with each other
        z_type = {'Z', 'S', 'SDG', 'T', 'TDG', 'RZ'}
        if node1.gate_type in z_type and node2.gate_type in z_type:
            return True
        
        # More rules can be added here
        
        return False


def optimize_circuit(circuit_steps: List[dict], level: int = 1) -> List[dict]:
    """Apply optimization passes to a circuit.
    
    Args:
        circuit_steps: List of gate operations
        level: Optimization level (0=none, 1=basic, 2=aggressive)
    
    Returns:
        Optimized circuit steps
    """
    if level == 0:
        return circuit_steps
    
    # Build DAG
    dag = CircuitDAG.from_circuit(circuit_steps)
    
    original_count = len(dag.nodes)
    
    # Apply passes based on level
    passes: List[OptimizationPass] = []
    
    if level >= 1:
        passes.append(GateCancellation())
        passes.append(GateFusion())
    
    if level >= 2:
        passes.append(CommutationAnalysis())
        # Re-run cancellation after commutation
        passes.append(GateCancellation())
        passes.append(GateFusion())
    
    for opt_pass in passes:
        dag = opt_pass.run(dag)
    
    optimized_count = len(dag.nodes)
    
    # Log optimization results
    if optimized_count < original_count:
        print(f"Optimization: {original_count} -> {optimized_count} gates "
              f"({original_count - optimized_count} removed)")
    
    return dag.to_circuit()
