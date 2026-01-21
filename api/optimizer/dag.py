"""Circuit DAG - Directed Acyclic Graph Representation

Converts circuits to DAG for optimization analysis.
Nodes represent gates, edges represent dependencies.
"""
from __future__ import annotations
from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class DAGNode:
    """A node in the circuit DAG representing a gate."""
    id: str
    gate_type: str
    qubits: List[int]
    params: Optional[dict] = None
    predecessors: Set[str] = field(default_factory=set)
    successors: Set[str] = field(default_factory=set)
    layer: int = 0


class CircuitDAG:
    """Directed Acyclic Graph representation of a quantum circuit.
    
    Enables:
    - Dependency analysis
    - Topological ordering
    - Pattern matching for optimization
    """
    
    def __init__(self):
        self.nodes: Dict[str, DAGNode] = {}
        self.input_nodes: Set[str] = set()  # Nodes with no predecessors
        self.output_nodes: Set[str] = set()  # Nodes with no successors
        self._node_counter = 0
    
    def _new_node_id(self) -> str:
        self._node_counter += 1
        return f"node_{self._node_counter}"
    
    def add_gate(
        self,
        gate_type: str,
        qubits: List[int],
        params: Optional[dict] = None
    ) -> str:
        """Add a gate to the DAG."""
        node_id = self._new_node_id()
        node = DAGNode(
            id=node_id,
            gate_type=gate_type,
            qubits=qubits,
            params=params
        )
        self.nodes[node_id] = node
        return node_id
    
    def add_edge(self, from_id: str, to_id: str) -> None:
        """Add a dependency edge between nodes."""
        if from_id in self.nodes and to_id in self.nodes:
            self.nodes[from_id].successors.add(to_id)
            self.nodes[to_id].predecessors.add(from_id)
    
    def remove_node(self, node_id: str) -> None:
        """Remove a node and reconnect edges."""
        if node_id not in self.nodes:
            return
        
        node = self.nodes[node_id]
        
        # Connect predecessors to successors
        for pred_id in node.predecessors:
            if pred_id in self.nodes:
                self.nodes[pred_id].successors.discard(node_id)
                self.nodes[pred_id].successors.update(node.successors)
        
        for succ_id in node.successors:
            if succ_id in self.nodes:
                self.nodes[succ_id].predecessors.discard(node_id)
                self.nodes[succ_id].predecessors.update(node.predecessors)
        
        del self.nodes[node_id]
        self.input_nodes.discard(node_id)
        self.output_nodes.discard(node_id)
    
    @classmethod
    def from_circuit(cls, circuit_steps: List[dict]) -> 'CircuitDAG':
        """Build DAG from circuit step list."""
        dag = cls()
        
        # Track last node touching each qubit
        last_on_qubit: Dict[int, str] = {}
        
        for step in sorted(circuit_steps, key=lambda s: s.get('timestep', 0)):
            gate_type = step.get('gateType', '').upper()
            
            if gate_type == 'MEASUREMENT':
                continue
            
            # Get qubits
            if 'controls' in step:
                qubits = step.get('controls', []) + step.get('targets', [])
            else:
                qubits = [step.get('qubit', 0)]
            
            params = {'theta': step.get('theta')} if 'theta' in step else None
            
            # Add node
            node_id = dag.add_gate(gate_type, qubits, params)
            
            # Add edges from previous gates on same qubits
            for q in qubits:
                if q in last_on_qubit:
                    dag.add_edge(last_on_qubit[q], node_id)
                last_on_qubit[q] = node_id
        
        # Identify input/output nodes
        for node_id, node in dag.nodes.items():
            if not node.predecessors:
                dag.input_nodes.add(node_id)
            if not node.successors:
                dag.output_nodes.add(node_id)
        
        # Compute layers
        dag._compute_layers()
        
        return dag
    
    def _compute_layers(self) -> None:
        """Assign each node to a layer (for parallel execution)."""
        for node_id in self.topological_order():
            node = self.nodes[node_id]
            if node.predecessors:
                node.layer = max(
                    self.nodes[p].layer for p in node.predecessors
                ) + 1
            else:
                node.layer = 0
    
    def topological_order(self) -> List[str]:
        """Return nodes in topological order (respecting dependencies)."""
        visited = set()
        result = []
        
        def visit(node_id: str):
            if node_id in visited:
                return
            visited.add(node_id)
            
            for succ_id in self.nodes[node_id].successors:
                visit(succ_id)
            
            result.append(node_id)
        
        for node_id in self.input_nodes:
            visit(node_id)
        
        # Visit any remaining nodes (shouldn't happen in well-formed DAG)
        for node_id in self.nodes:
            visit(node_id)
        
        return list(reversed(result))
    
    def to_circuit(self) -> List[dict]:
        """Convert DAG back to circuit step list."""
        steps = []
        
        for node_id in self.topological_order():
            node = self.nodes[node_id]
            
            step = {
                'gateType': node.gate_type,
                'timestep': node.layer,
            }
            
            if len(node.qubits) == 1:
                step['qubit'] = node.qubits[0]
            else:
                step['controls'] = node.qubits[:-1]
                step['targets'] = [node.qubits[-1]]
            
            if node.params and node.params.get('theta') is not None:
                step['theta'] = node.params['theta']
            
            steps.append(step)
        
        return steps
    
    def depth(self) -> int:
        """Calculate circuit depth."""
        if not self.nodes:
            return 0
        return max(node.layer for node in self.nodes.values()) + 1
    
    def gate_count(self) -> Dict[str, int]:
        """Count gates by type."""
        counts = defaultdict(int)
        for node in self.nodes.values():
            counts[node.gate_type] += 1
        return dict(counts)
    
    def find_pattern(self, pattern: List[Tuple[str, int]]) -> List[List[str]]:
        """Find gate patterns in the DAG.
        
        Args:
            pattern: List of (gate_type, num_qubits) to match
        
        Returns:
            List of node ID sequences matching the pattern
        """
        matches = []
        
        for start_id in self.nodes:
            match = self._match_pattern_from(start_id, pattern)
            if match:
                matches.append(match)
        
        return matches
    
    def _match_pattern_from(
        self,
        start_id: str,
        pattern: List[Tuple[str, int]]
    ) -> Optional[List[str]]:
        """Try to match pattern starting from a node."""
        if not pattern:
            return []
        
        node = self.nodes.get(start_id)
        if not node:
            return None
        
        gate_type, num_qubits = pattern[0]
        
        if node.gate_type != gate_type or len(node.qubits) != num_qubits:
            return None
        
        if len(pattern) == 1:
            return [start_id]
        
        # Try to match rest of pattern with successors
        for succ_id in node.successors:
            rest_match = self._match_pattern_from(succ_id, pattern[1:])
            if rest_match:
                return [start_id] + rest_match
        
        return None
