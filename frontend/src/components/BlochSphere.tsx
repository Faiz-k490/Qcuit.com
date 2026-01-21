/**
 * Bloch Sphere Visualization Component
 * 
 * Visualizes single-qubit states on the Bloch sphere:
 * - θ (theta): angle from |0⟩ axis (0 to π)
 * - φ (phi): phase angle in XY plane (0 to 2π)
 * 
 * |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
 */

import React, { useRef, useEffect, useState } from 'react';
import { Box, Text, Group, Badge, Select } from '@mantine/core';

interface BlochSphereProps {
  numQubits: number;
  gates: Record<string, any>;
  multiQubitGates: any[];
}

interface BlochState {
  theta: number;  // 0 to PI
  phi: number;    // 0 to 2*PI
  x: number;      // Bloch vector X
  y: number;      // Bloch vector Y
  z: number;      // Bloch vector Z
}

export function BlochSphere({ numQubits, gates, multiQubitGates }: BlochSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedQubit, setSelectedQubit] = useState<string>('0');
  const [blochState, setBlochState] = useState<BlochState>({ theta: 0, phi: 0, x: 0, y: 0, z: 1 });
  const [loading, setLoading] = useState(false);

  // Fetch reduced density matrix for selected qubit
  useEffect(() => {
    const fetchBlochState = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/statevector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numQubits, gates, multiQubitGates }),
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        const qsphere = data.qsphere || [];
        
        // Calculate Bloch vector from statevector
        // For single qubit or reduced density matrix trace
        const qubitIdx = parseInt(selectedQubit);
        const bloch = calculateBlochVector(qsphere, numQubits, qubitIdx);
        setBlochState(bloch);
      } catch (err) {
        // Default to |0⟩ state
        setBlochState({ theta: 0, phi: 0, x: 0, y: 0, z: 1 });
      } finally {
        setLoading(false);
      }
    };
    
    const timer = setTimeout(fetchBlochState, 300);
    return () => clearTimeout(timer);
  }, [numQubits, gates, multiQubitGates, selectedQubit]);

  // Calculate Bloch vector from Q-Sphere data
  function calculateBlochVector(qsphere: any[], numQubits: number, qubitIdx: number): BlochState {
    if (qsphere.length === 0) {
      return { theta: 0, phi: 0, x: 0, y: 0, z: 1 };
    }

    // For a single qubit, directly calculate from amplitudes
    // For multi-qubit, trace out other qubits (simplified approach)
    let alpha = { re: 0, im: 0 };  // |0⟩ amplitude
    let beta = { re: 0, im: 0 };   // |1⟩ amplitude

    qsphere.forEach((state: any) => {
      const bitstring = state.state;
      const bit = bitstring[numQubits - 1 - qubitIdx];  // Get bit for this qubit
      const mag = state.magnitude;
      const phase = state.phase;
      
      // Accumulate amplitudes
      if (bit === '0') {
        alpha.re += mag * Math.cos(phase);
        alpha.im += mag * Math.sin(phase);
      } else {
        beta.re += mag * Math.cos(phase);
        beta.im += mag * Math.sin(phase);
      }
    });

    // Normalize
    const norm = Math.sqrt(alpha.re**2 + alpha.im**2 + beta.re**2 + beta.im**2);
    if (norm > 0) {
      alpha.re /= norm; alpha.im /= norm;
      beta.re /= norm; beta.im /= norm;
    }

    // Calculate Bloch vector components
    // x = 2*Re(α*β̄), y = 2*Im(α*β̄), z = |α|² - |β|²
    const x = 2 * (alpha.re * beta.re + alpha.im * beta.im);
    const y = 2 * (alpha.im * beta.re - alpha.re * beta.im);
    const z = (alpha.re**2 + alpha.im**2) - (beta.re**2 + beta.im**2);

    // Calculate angles
    const r = Math.sqrt(x**2 + y**2 + z**2);
    const theta = r > 0 ? Math.acos(Math.max(-1, Math.min(1, z / r))) : 0;
    const phi = Math.atan2(y, x);

    return { theta, phi, x, y, z };
  }

  // Render Bloch sphere
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 30;
    
    // Clear
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, width, height);
    
    // Draw sphere outline
    ctx.strokeStyle = '#3a4a6b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw equator (XY plane)
    ctx.strokeStyle = '#3a4a6b';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radius, radius * 0.3, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw axes
    ctx.strokeStyle = '#4a5a7b';
    ctx.lineWidth = 1;
    
    // Z axis (vertical)
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 10);
    ctx.lineTo(centerX, centerY + radius + 10);
    ctx.stroke();
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(centerX - radius - 10, centerY);
    ctx.lineTo(centerX + radius + 10, centerY);
    ctx.stroke();
    
    // Y axis (into screen - show as diagonal)
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.5, centerY + radius * 0.3);
    ctx.lineTo(centerX + radius * 0.5, centerY - radius * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Axis labels
    ctx.fillStyle = '#8899bb';
    ctx.font = '12px monospace';
    ctx.fillText('|0⟩', centerX + 5, centerY - radius - 12);
    ctx.fillText('|1⟩', centerX + 5, centerY + radius + 18);
    ctx.fillText('|+⟩', centerX + radius + 8, centerY + 4);
    ctx.fillText('|-⟩', centerX - radius - 20, centerY + 4);
    
    // Draw Bloch vector
    const { x, y, z } = blochState;
    
    // Project 3D to 2D (simple orthographic with slight rotation)
    const projX = centerX + (x * radius);
    const projY = centerY - (z * radius) + (y * radius * 0.3);
    
    // Draw vector line
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(projX, projY);
    ctx.stroke();
    
    // Draw arrow head
    const angle = Math.atan2(projY - centerY, projX - centerX);
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(projX, projY);
    ctx.lineTo(projX - 10 * Math.cos(angle - 0.3), projY - 10 * Math.sin(angle - 0.3));
    ctx.lineTo(projX - 10 * Math.cos(angle + 0.3), projY - 10 * Math.sin(angle + 0.3));
    ctx.closePath();
    ctx.fill();
    
    // Draw state point
    ctx.beginPath();
    ctx.arc(projX, projY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#4fc3f7';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
  }, [blochState]);

  const qubitOptions = Array.from({ length: numQubits }, (_, i) => ({
    value: String(i),
    label: `q[${i}]`
  }));

  return (
    <Box style={{ height: '100%', backgroundColor: '#16213e', padding: 8 }}>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="white" fw={600}>Bloch Sphere</Text>
        <Select
          size="xs"
          value={selectedQubit}
          onChange={(v) => setSelectedQubit(v || '0')}
          data={qubitOptions}
          style={{ width: 80 }}
        />
      </Group>
      
      <Box style={{ display: 'flex', justifyContent: 'center' }}>
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          style={{ borderRadius: 8, border: '1px solid #3a4a6b' }}
        />
      </Box>
      
      {/* State info */}
      <Box mt="sm" p="xs" style={{ backgroundColor: '#1a1a2e', borderRadius: 6 }}>
        <Group justify="space-between" mb={4}>
          <Text size="xs" c="#8899bb">θ (theta)</Text>
          <Text size="xs" c="white" ff="monospace">{(blochState.theta / Math.PI).toFixed(3)}π</Text>
        </Group>
        <Group justify="space-between" mb={4}>
          <Text size="xs" c="#8899bb">φ (phi)</Text>
          <Text size="xs" c="white" ff="monospace">{(blochState.phi / Math.PI).toFixed(3)}π</Text>
        </Group>
        <Group justify="space-between">
          <Text size="xs" c="#8899bb">Vector</Text>
          <Text size="xs" c="white" ff="monospace">
            ({blochState.x.toFixed(2)}, {blochState.y.toFixed(2)}, {blochState.z.toFixed(2)})
          </Text>
        </Group>
      </Box>
      
      <Box mt="xs">
        <Text size="xs" c="dimmed" ta="center">
          {blochState.z > 0.99 ? '|0⟩ state' : 
           blochState.z < -0.99 ? '|1⟩ state' :
           Math.abs(blochState.x) > 0.99 ? '|+⟩ or |-⟩ state' :
           'Superposition'}
        </Text>
      </Box>
    </Box>
  );
}
