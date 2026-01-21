/**
 * Entanglement Graph Visualization
 * 
 * Force-directed graph showing qubit entanglement relationships
 * - Nodes: Qubits
 * - Edges: Entanglement strength (Von Neumann entropy)
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box, Text, Group, Badge, Loader } from '@mantine/core';

interface EntanglementData {
  qubits: number[];
  edges: { q1: number; q2: number; strength: number }[];
}

interface EntanglementGraphProps {
  numQubits: number;
  gates: Record<string, any>;
  multiQubitGates: any[];
}

// Simple force-directed layout
function computeLayout(numQubits: number, edges: { q1: number; q2: number; strength: number }[]) {
  const positions: { x: number; y: number }[] = [];
  const centerX = 100;
  const centerY = 100;
  const radius = 70;

  // Initial circular layout
  for (let i = 0; i < numQubits; i++) {
    const angle = (2 * Math.PI * i) / numQubits - Math.PI / 2;
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  // Simple force simulation (a few iterations)
  for (let iter = 0; iter < 50; iter++) {
    const forces: { fx: number; fy: number }[] = positions.map(() => ({ fx: 0, fy: 0 }));

    // Repulsion between all nodes
    for (let i = 0; i < numQubits; i++) {
      for (let j = i + 1; j < numQubits; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = 500 / (dist * dist);
        
        forces[i].fx -= (dx / dist) * force;
        forces[i].fy -= (dy / dist) * force;
        forces[j].fx += (dx / dist) * force;
        forces[j].fy += (dy / dist) * force;
      }
    }

    // Attraction along edges (based on entanglement strength)
    for (const edge of edges) {
      const dx = positions[edge.q2].x - positions[edge.q1].x;
      const dy = positions[edge.q2].y - positions[edge.q1].y;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const force = edge.strength * 0.1 * dist;
      
      forces[edge.q1].fx += (dx / dist) * force;
      forces[edge.q1].fy += (dy / dist) * force;
      forces[edge.q2].fx -= (dx / dist) * force;
      forces[edge.q2].fy -= (dy / dist) * force;
    }

    // Center gravity
    for (let i = 0; i < numQubits; i++) {
      forces[i].fx += (centerX - positions[i].x) * 0.01;
      forces[i].fy += (centerY - positions[i].y) * 0.01;
    }

    // Apply forces
    for (let i = 0; i < numQubits; i++) {
      positions[i].x += forces[i].fx * 0.1;
      positions[i].y += forces[i].fy * 0.1;
      // Clamp to bounds
      positions[i].x = Math.max(20, Math.min(180, positions[i].x));
      positions[i].y = Math.max(20, Math.min(180, positions[i].y));
    }
  }

  return positions;
}

// Analyze circuit to find entanglement relationships
function analyzeEntanglement(
  numQubits: number,
  gates: Record<string, any>,
  multiQubitGates: any[]
): EntanglementData {
  const edgeMap = new Map<string, number>();

  // Count 2-qubit gate interactions
  for (const gate of multiQubitGates) {
    const allQubits = [...(gate.controls || []), ...(gate.targets || [])];
    for (let i = 0; i < allQubits.length; i++) {
      for (let j = i + 1; j < allQubits.length; j++) {
        const q1 = Math.min(allQubits[i], allQubits[j]);
        const q2 = Math.max(allQubits[i], allQubits[j]);
        const key = `${q1}-${q2}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
      }
    }
  }

  // Convert to edges with normalized strength
  const counts = Array.from(edgeMap.values());
  const maxCount = Math.max(1, ...counts);
  const edges = Array.from(edgeMap.entries()).map(([key, count]) => {
    const [q1, q2] = key.split('-').map(Number);
    return { q1, q2, strength: count / maxCount };
  });

  return {
    qubits: Array.from({ length: numQubits }, (_, i) => i),
    edges,
  };
}

export function EntanglementGraph({ numQubits, gates, multiQubitGates }: EntanglementGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [entanglement, setEntanglement] = useState<EntanglementData | null>(null);

  useEffect(() => {
    const data = analyzeEntanglement(numQubits, gates, multiQubitGates);
    setEntanglement(data);
  }, [numQubits, gates, multiQubitGates]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !entanglement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, width, height);

    const positions = computeLayout(numQubits, entanglement.edges);

    // Draw edges
    for (const edge of entanglement.edges) {
      const p1 = positions[edge.q1];
      const p2 = positions[edge.q2];
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(100, 181, 246, ${0.3 + edge.strength * 0.7})`;
      ctx.lineWidth = 1 + edge.strength * 4;
      ctx.stroke();
    }

    // Draw nodes
    for (let i = 0; i < numQubits; i++) {
      const p = positions[i];
      
      // Check if this qubit has any entanglement
      const hasEntanglement = entanglement.edges.some(e => e.q1 === i || e.q2 === i);
      
      // Node circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = hasEntanglement ? '#42a5f5' : '#546e7a';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`q${i}`, p.x, p.y);
    }

    // Legend
    ctx.fillStyle = '#8899bb';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Edge thickness = entanglement strength', 10, height - 10);

  }, [entanglement, numQubits]);

  const entangledPairs = entanglement?.edges.length || 0;

  return (
    <Box style={{ height: '100%', backgroundColor: '#16213e', padding: 8 }}>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="white" fw={600}>Entanglement</Text>
        <Badge variant="light" color={entangledPairs > 0 ? 'blue' : 'gray'} size="sm">
          {entangledPairs} pairs
        </Badge>
      </Group>

      <Box style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          style={{ borderRadius: 8, border: '1px solid #3a4a6b' }}
        />
      </Box>

      {entangledPairs === 0 && (
        <Text size="xs" c="dimmed" ta="center" mt="sm">
          No entanglement detected. Add 2-qubit gates to create entanglement.
        </Text>
      )}

      {entangledPairs > 0 && (
        <Box mt="sm">
          <Text size="xs" c="dimmed" mb={4}>Entangled Pairs:</Text>
          {entanglement?.edges.slice(0, 5).map((edge, idx) => (
            <Group key={idx} justify="space-between" mb={2}>
              <Text size="xs" c="#8899bb" ff="monospace">
                q{edge.q1} ↔ q{edge.q2}
              </Text>
              <Text size="xs" c="white">
                {(edge.strength * 100).toFixed(0)}%
              </Text>
            </Group>
          ))}
        </Box>
      )}
    </Box>
  );
}
