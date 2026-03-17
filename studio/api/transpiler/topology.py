"""Hardware Topology - Coupling Map and Backend Definitions

Represents physical qubit connectivity as a graph structure.
"""
from __future__ import annotations
from typing import Dict, List, Set, Tuple, Optional
from collections import deque


class CouplingMap:
    """Represents qubit connectivity as an adjacency list."""
    
    def __init__(self, edges: List[Tuple[int, int]], bidirectional: bool = True):
        """Initialize coupling map from edge list.
        
        Args:
            edges: List of (q1, q2) tuples representing connected qubits
            bidirectional: If True, edges work in both directions
        """
        self.edges: Set[Tuple[int, int]] = set()
        self.adjacency: Dict[int, Set[int]] = {}
        
        for q1, q2 in edges:
            self.edges.add((q1, q2))
            if bidirectional:
                self.edges.add((q2, q1))
            
            if q1 not in self.adjacency:
                self.adjacency[q1] = set()
            if q2 not in self.adjacency:
                self.adjacency[q2] = set()
            
            self.adjacency[q1].add(q2)
            if bidirectional:
                self.adjacency[q2].add(q1)
        
        self.num_qubits = max(max(e) for e in edges) + 1 if edges else 0
    
    def is_connected(self, q1: int, q2: int) -> bool:
        """Check if two qubits are directly connected."""
        return (q1, q2) in self.edges
    
    def neighbors(self, qubit: int) -> Set[int]:
        """Get all qubits connected to the given qubit."""
        return self.adjacency.get(qubit, set())
    
    def distance(self, q1: int, q2: int) -> int:
        """Compute shortest path distance between two qubits (BFS)."""
        if q1 == q2:
            return 0
        
        visited = {q1}
        queue = deque([(q1, 0)])
        
        while queue:
            current, dist = queue.popleft()
            
            for neighbor in self.neighbors(current):
                if neighbor == q2:
                    return dist + 1
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, dist + 1))
        
        return float('inf')  # Not connected
    
    def shortest_path(self, q1: int, q2: int) -> List[int]:
        """Find shortest path between two qubits."""
        if q1 == q2:
            return [q1]
        
        visited = {q1}
        queue = deque([(q1, [q1])])
        
        while queue:
            current, path = queue.popleft()
            
            for neighbor in self.neighbors(current):
                if neighbor == q2:
                    return path + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        
        return []  # Not connected


class HardwareTopology:
    """Predefined hardware backend topologies."""
    
    @staticmethod
    def linear(n: int) -> CouplingMap:
        """Linear chain: 0-1-2-3-..."""
        edges = [(i, i + 1) for i in range(n - 1)]
        return CouplingMap(edges)
    
    @staticmethod
    def ring(n: int) -> CouplingMap:
        """Ring topology: 0-1-2-...-n-1-0"""
        edges = [(i, (i + 1) % n) for i in range(n)]
        return CouplingMap(edges)
    
    @staticmethod
    def grid(rows: int, cols: int) -> CouplingMap:
        """2D grid topology."""
        edges = []
        for r in range(rows):
            for c in range(cols):
                idx = r * cols + c
                if c < cols - 1:
                    edges.append((idx, idx + 1))
                if r < rows - 1:
                    edges.append((idx, idx + cols))
        return CouplingMap(edges)
    
    @staticmethod
    def heavy_hex(n: int = 27) -> CouplingMap:
        """IBM Heavy-Hex topology (simplified 27-qubit version)."""
        # Approximate heavy-hex connectivity pattern
        edges = [
            (0, 1), (1, 2), (2, 3), (3, 4),
            (0, 5), (4, 9),
            (5, 6), (6, 7), (7, 8), (8, 9),
            (6, 11), (8, 13),
            (10, 11), (11, 12), (12, 13), (13, 14),
            (10, 15), (14, 19),
            (15, 16), (16, 17), (17, 18), (18, 19),
            (16, 21), (18, 23),
            (20, 21), (21, 22), (22, 23), (23, 24),
            (20, 25), (24, 26),
        ]
        return CouplingMap(edges)
    
    @staticmethod
    def ibm_brisbane() -> CouplingMap:
        """IBM Brisbane 127-qubit topology (simplified)."""
        # Create a 5x27 heavy-hex-like structure
        return HardwareTopology.grid(5, 27)
    
    @staticmethod
    def ionq_aria() -> CouplingMap:
        """IonQ Aria - fully connected (all-to-all)."""
        n = 25  # 25 qubits
        edges = [(i, j) for i in range(n) for j in range(i + 1, n)]
        return CouplingMap(edges)
    
    @staticmethod
    def rigetti_aspen() -> CouplingMap:
        """Rigetti Aspen - 80 qubit octagonal lattice (simplified)."""
        return HardwareTopology.grid(8, 10)


class Layout:
    """Mapping between logical and physical qubits."""
    
    def __init__(self, initial_mapping: Optional[Dict[int, int]] = None):
        """Initialize layout.
        
        Args:
            initial_mapping: Dict mapping logical qubit -> physical qubit
        """
        self.logical_to_physical: Dict[int, int] = initial_mapping or {}
        self.physical_to_logical: Dict[int, int] = {
            p: l for l, p in self.logical_to_physical.items()
        }
    
    def set_mapping(self, logical: int, physical: int) -> None:
        """Set a logical-to-physical qubit mapping."""
        # Remove old mappings
        if logical in self.logical_to_physical:
            old_physical = self.logical_to_physical[logical]
            del self.physical_to_logical[old_physical]
        if physical in self.physical_to_logical:
            old_logical = self.physical_to_logical[physical]
            del self.logical_to_physical[old_logical]
        
        self.logical_to_physical[logical] = physical
        self.physical_to_logical[physical] = logical
    
    def swap(self, physical1: int, physical2: int) -> None:
        """Swap the logical qubits at two physical positions."""
        l1 = self.physical_to_logical.get(physical1)
        l2 = self.physical_to_logical.get(physical2)
        
        if l1 is not None:
            self.logical_to_physical[l1] = physical2
            self.physical_to_logical[physical2] = l1
        else:
            if physical2 in self.physical_to_logical:
                del self.physical_to_logical[physical2]
        
        if l2 is not None:
            self.logical_to_physical[l2] = physical1
            self.physical_to_logical[physical1] = l2
        else:
            if physical1 in self.physical_to_logical:
                del self.physical_to_logical[physical1]
    
    def get_physical(self, logical: int) -> int:
        """Get physical qubit for a logical qubit."""
        return self.logical_to_physical.get(logical, logical)
    
    def get_logical(self, physical: int) -> int:
        """Get logical qubit at a physical position."""
        return self.physical_to_logical.get(physical, physical)
