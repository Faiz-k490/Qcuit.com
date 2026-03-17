/**
 * Resource Estimation Panel
 * 
 * Shows gate counts, estimated fidelity, runtime, and hardware metrics
 */

import React, { useEffect, useState } from 'react';

interface ResourceEstimate {
  backend: string;
  num_qubits: number;
  single_qubit_gates: number;
  two_qubit_gates: number;
  estimated_time_ns: number;
  estimated_fidelity: number;
  circuit_depth: number;
}

interface ResourcePanelProps {
  numQubits: number;
  gates: Record<string, any>;
  multiQubitGates: any[];
}

const BACKENDS = [
  { value: 'ibm_brisbane', label: 'IBM Brisbane (127Q)' },
  { value: 'ibm_osaka', label: 'IBM Osaka (127Q)' },
  { value: 'ionq_aria', label: 'IonQ Aria (25Q)' },
  { value: 'rigetti_aspen', label: 'Rigetti Aspen (80Q)' },
];

function formatTime(ns: number): string {
  if (ns < 1000) return `${ns.toFixed(0)} ns`;
  if (ns < 1e6) return `${(ns / 1000).toFixed(1)} μs`;
  if (ns < 1e9) return `${(ns / 1e6).toFixed(1)} ms`;
  return `${(ns / 1e9).toFixed(2)} s`;
}

function getFidelityTailwind(fidelity: number): string {
  if (fidelity > 0.99) return 'text-green-400';
  if (fidelity > 0.95) return 'text-lime-400';
  if (fidelity > 0.9) return 'text-vegas-gold';
  if (fidelity > 0.8) return 'text-orange-400';
  return 'text-muted-brick';
}

function getFidelityBarColor(fidelity: number): string {
  if (fidelity > 0.99) return '#4ade80';
  if (fidelity > 0.95) return '#a3e635';
  if (fidelity > 0.9) return '#C5A059';
  if (fidelity > 0.8) return '#fb923c';
  return '#8A2E2E';
}

export function ResourcePanel({ numQubits, gates, multiQubitGates }: ResourcePanelProps) {
  const [estimate, setEstimate] = useState<ResourceEstimate | null>(null);
  const [backend, setBackend] = useState('ibm_brisbane');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEstimate = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ numQubits, gates, multiQubitGates, backend }),
        });
        if (response.ok) {
          const data = await response.json();
          setEstimate(data);
        }
      } catch (err) {
        console.error('Failed to fetch estimate:', err);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(fetchEstimate, 300);
    return () => clearTimeout(timer);
  }, [numQubits, gates, multiQubitGates, backend]);

  const totalGates = (estimate?.single_qubit_gates || 0) + (estimate?.two_qubit_gates || 0);
  const maxQubits = backend.includes('ibm') ? 127 : backend.includes('ionq') ? 25 : 80;
  const fidelity = estimate?.estimated_fidelity || 1;

  return (
    <div className="h-full p-3 overflow-y-auto" style={{ backgroundColor: '#0A1F1C' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-body text-sm font-semibold text-isabelline">Resources</span>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
          loading ? 'bg-vegas-gold/10 text-vegas-gold/60 border-vegas-gold/20 animate-pulse' : 'bg-vegas-gold/15 text-vegas-gold border-vegas-gold/20'
        }`}>
          {loading ? 'Loading…' : 'Live'}
        </span>
      </div>

      {/* Backend selector */}
      <select
        value={backend}
        onChange={(e) => setBackend(e.target.value)}
        className="w-full mb-4 px-2.5 py-1.5 rounded bg-forest-light/60 border border-vegas-gold/20 text-isabelline/80 font-body text-xs focus:outline-none focus:border-vegas-gold/40 transition-colors"
      >
        {BACKENDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>

      <div className="space-y-3">
        {/* Gate Counts */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-body text-xs text-isabelline/50">⚡ Total Gates</span>
            <span className="font-mono text-sm font-semibold text-isabelline">{totalGates}</span>
          </div>
          <div className="pl-4 space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-body text-[11px] text-isabelline/30">1-qubit</span>
              <span className="font-mono text-[11px] text-isabelline/60">{estimate?.single_qubit_gates || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-[11px] text-isabelline/30">2-qubit</span>
              <span className="font-mono text-[11px] text-isabelline/60">{estimate?.two_qubit_gates || 0}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-vegas-gold/10" />

        {/* Circuit Depth */}
        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-isabelline/50">🔲 Circuit Depth</span>
          <span className="font-mono text-sm font-semibold text-isabelline">{estimate?.circuit_depth || 0}</span>
        </div>

        <div className="border-t border-vegas-gold/10" />

        {/* Runtime */}
        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-isabelline/50">⏱ Est. Runtime</span>
          <span className="font-mono text-sm font-semibold text-isabelline">{formatTime(estimate?.estimated_time_ns || 0)}</span>
        </div>

        <div className="border-t border-vegas-gold/10" />

        {/* Fidelity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-body text-xs text-isabelline/50">🎯 Est. Fidelity</span>
            <span className={`font-mono text-sm font-semibold ${getFidelityTailwind(fidelity)}`}>
              {(fidelity * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-forest-light/60 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${fidelity * 100}%`, backgroundColor: getFidelityBarColor(fidelity) }} />
          </div>
        </div>

        <div className="border-t border-vegas-gold/10" />

        {/* Qubit Usage */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-body text-xs text-isabelline/50">Qubit Usage</span>
            <span className="font-mono text-[11px] text-isabelline/60">{numQubits} / {maxQubits}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-forest-light/60 overflow-hidden">
            <div className="h-full rounded-full bg-vegas-gold/60 transition-all duration-500" style={{ width: `${(numQubits / maxQubits) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Hardware Notes */}
      <div className="mt-4 pt-3 border-t border-vegas-gold/10">
        <div className="font-body text-[10px] text-isabelline/40 uppercase tracking-wider mb-1">Hardware Notes</div>
        <div className="font-body text-[11px] text-isabelline/30 leading-relaxed">
          {backend === 'ibm_brisbane' && 'Superconducting • Heavy-hex topology • T1≈200μs • 2Q error≈1%'}
          {backend === 'ibm_osaka' && 'Superconducting • Heavy-hex topology • T1≈200μs • 2Q error≈1%'}
          {backend === 'ionq_aria' && 'Trapped ion • All-to-all connectivity • T1≈10s • 2Q error≈0.5%'}
          {backend === 'rigetti_aspen' && 'Superconducting • Octagonal lattice • T1≈30μs • 2Q error≈2%'}
        </div>
      </div>
    </div>
  );
}
