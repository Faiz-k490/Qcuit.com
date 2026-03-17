/**
 * Q-cuit Sphere Visualization Component
 * 
 * 3D visualization of quantum state amplitudes using Three.js
 * - Nodes: Each basis state is a point on a sphere
 * - Radius: Proportional to amplitude magnitude |α|
 * - Color: Represents phase (complex argument)
 */

import React, { useRef, useEffect, useState } from 'react';

interface QSphereState {
  state: string;
  magnitude: number;
  phase: number;
  probability: number;
}

interface QSphereProps {
  numQubits: number;
  gates: Record<string, any>;
  multiQubitGates: any[];
}

// Phase to color mapping (HSL)
function phaseToColor(phase: number): string {
  // Map phase [-π, π] to hue [0, 360]
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
  return `hsl(${hue}, 80%, 60%)`;
}

// Convert basis state index to 3D position on Bloch sphere
function stateToPosition(stateIndex: number, numStates: number, magnitude: number): [number, number, number] {
  if (numStates === 1) {
    return [0, 0, 0];
  }
  
  // Distribute states evenly on sphere surface
  const phi = Math.acos(1 - 2 * (stateIndex + 0.5) / numStates);
  const theta = Math.PI * (1 + Math.sqrt(5)) * stateIndex;
  
  const radius = 80 * magnitude; // Scale by magnitude
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  
  return [x, y, z];
}

export function QSphere({ numQubits, gates, multiQubitGates }: QSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qsphereData, setQsphereData] = useState<QSphereState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch statevector from backend
  useEffect(() => {
    const fetchStatevector = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/statevector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numQubits,
            gates,
            multiQubitGates,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch statevector');
        }
        
        const data = await response.json();
        setQsphereData(data.qsphere || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // Debounce the fetch
    const timer = setTimeout(fetchStatevector, 300);
    return () => clearTimeout(timer);
  }, [numQubits, gates, multiQubitGates]);

  // Render 2D projection of Q-Sphere (simplified without Three.js)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || qsphereData.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear canvas
    ctx.fillStyle = '#0A1F1C';
    ctx.fillRect(0, 0, width, height);
    
    // Draw sphere outline
    ctx.strokeStyle = 'rgba(197,160,89,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw axes
    ctx.strokeStyle = 'rgba(197,160,89,0.2)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(centerX - 90, centerY);
    ctx.lineTo(centerX + 90, centerY);
    ctx.moveTo(centerX, centerY - 90);
    ctx.lineTo(centerX, centerY + 90);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw axis labels
    ctx.fillStyle = 'rgba(245,242,234,0.5)';
    ctx.font = '10px monospace';
    ctx.fillText('|0⟩', centerX - 5, centerY - 85);
    ctx.fillText('|1⟩', centerX - 5, centerY + 95);
    
    // Draw states
    qsphereData.forEach((state, index) => {
      const [x, y] = stateToPosition(index, qsphereData.length, state.magnitude);
      
      // Project to 2D (simple orthographic)
      const screenX = centerX + x;
      const screenY = centerY - y; // Flip Y for screen coords
      
      // Draw state point
      const radius = Math.max(4, state.magnitude * 20);
      const color = phaseToColor(state.phase);
      
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw state label for significant states
      if (state.probability > 0.05) {
        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.fillText(`|${state.state}⟩`, screenX + radius + 2, screenY + 3);
      }
    });
    
    // Draw legend
    ctx.fillStyle = 'rgba(245,242,234,0.5)';
    ctx.font = '10px sans-serif';
    ctx.fillText('Phase:', 10, height - 25);
    
    // Phase gradient legend
    const gradientWidth = 100;
    for (let i = 0; i < gradientWidth; i++) {
      const phase = ((i / gradientWidth) * 2 - 1) * Math.PI;
      ctx.fillStyle = phaseToColor(phase);
      ctx.fillRect(50 + i, height - 30, 1, 10);
    }
    ctx.fillStyle = 'rgba(245,242,234,0.5)';
    ctx.fillText('-π', 50, height - 10);
    ctx.fillText('0', 95, height - 10);
    ctx.fillText('π', 145, height - 10);
    
  }, [qsphereData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#0A1F1C' }}>
        <div className="font-body text-xs text-vegas-gold/60 animate-pulse">Loading statevector…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#0A1F1C' }}>
        <div className="font-body text-sm text-muted-brick mb-1">Load failed</div>
        <div className="font-body text-xs text-isabelline/40 text-center">Backend not responding. Ensure the API server is running on port 5001.</div>
        <button onClick={() => window.location.reload()} className="mt-3 px-3 py-1 rounded border border-vegas-gold/30 text-vegas-gold/70 hover:bg-vegas-gold/10 font-body text-xs transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div className="h-full p-2 overflow-auto" style={{ backgroundColor: '#0A1F1C' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-sm font-semibold text-isabelline">Q-cuit Sphere</span>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-vegas-gold/15 text-vegas-gold border border-vegas-gold/20">
          {qsphereData.length} states
        </span>
      </div>

      <div className="flex justify-center">
        <canvas ref={canvasRef} width={200} height={200}
          className="rounded-lg" style={{ border: '1px solid rgba(197,160,89,0.2)' }} />
      </div>

      {/* State list */}
      <div className="mt-2 max-h-[100px] overflow-y-auto">
        {qsphereData.slice(0, 8).map((s) => (
          <div key={s.state} className="flex items-center justify-between mb-0.5">
            <span className="font-mono text-xs text-isabelline/50">|{s.state}⟩</span>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: phaseToColor(s.phase) }} />
              <span className="font-mono text-xs text-isabelline">{(s.probability * 100).toFixed(1)}%</span>
            </div>
          </div>
        ))}
        {qsphereData.length > 8 && (
          <div className="font-body text-xs text-isabelline/30 text-center mt-1">+{qsphereData.length - 8} more</div>
        )}
      </div>
    </div>
  );
}
