/**
 * Debugging Timeline Component
 * 
 * Shows state snapshots at each timestep for debugging circuits.
 * Uses keyframe logic - stores every Nth step and recomputes on demand.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface StateSnapshot {
  timestep: number;
  probabilities: Record<string, number>;
  gatesApplied: string[];
}

interface DebugTimelineProps {
  numQubits: number;
  gates: Record<string, any>;
  multiQubitGates: any[];
  maxTimestep: number;
}

export function DebugTimeline({ numQubits, gates, multiQubitGates, maxTimestep }: DebugTimelineProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch snapshots from backend
  const fetchSnapshots = useCallback(async () => {
    if (maxTimestep === 0) {
      setSnapshots([]);
      return;
    }

    setLoading(true);
    try {
      const allOps = [
        ...Object.values(gates),
        ...multiQubitGates,
      ].sort((a: any, b: any) => a.timestep - b.timestep);

      const newSnapshots: StateSnapshot[] = [];

      const initialResponse = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numQubits,
          numClassical: numQubits,
          gates: {},
          multiQubitGates: [],
          measurements: [],
          noiseLevel: 0,
        }),
      });

      if (initialResponse.ok) {
        const data = await initialResponse.json();
        newSnapshots.push({
          timestep: 0,
          probabilities: data.probabilities,
          gatesApplied: [],
        });
      }

      for (let t = 1; t <= Math.min(maxTimestep, 10); t++) {
        const opsUpToT = allOps.filter((op: any) => op.timestep < t);
        const gatesDict: Record<string, any> = {};
        const multiGates: any[] = [];

        opsUpToT.forEach((op: any) => {
          if (op.controls !== undefined) {
            multiGates.push(op);
          } else {
            gatesDict[`q_${op.qubit}-${op.timestep}`] = op;
          }
        });

        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numQubits,
            numClassical: numQubits,
            gates: gatesDict,
            multiQubitGates: multiGates,
            measurements: [],
            noiseLevel: 0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const gateNames = opsUpToT.map((op: any) => op.gateType);
          newSnapshots.push({
            timestep: t,
            probabilities: data.probabilities,
            gatesApplied: gateNames,
          });
        }
      }

      setSnapshots(newSnapshots);
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    } finally {
      setLoading(false);
    }
  }, [numQubits, gates, multiQubitGates, maxTimestep]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= snapshots.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, snapshots.length]);

  const currentSnapshot = snapshots[currentStep];
  const topStates = currentSnapshot
    ? Object.entries(currentSnapshot.probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];

  return (
    <div className="h-full p-3 overflow-y-auto" style={{ backgroundColor: '#0A1F1C' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-body text-sm font-semibold text-isabelline">Debug Timeline</span>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
          loading ? 'bg-vegas-gold/10 text-vegas-gold/60 border-vegas-gold/20 animate-pulse' : 'bg-vegas-gold/15 text-vegas-gold border-vegas-gold/20'
        }`}>
          {loading ? 'Loading…' : `${snapshots.length} steps`}
        </span>
      </div>

      <button
        onClick={fetchSnapshots}
        disabled={loading}
        className="w-full mb-3 py-2 rounded border border-vegas-gold/30 bg-vegas-gold/10 text-vegas-gold hover:bg-vegas-gold/20 disabled:opacity-40 transition-colors font-body text-xs font-semibold"
      >
        {loading ? 'Computing…' : 'Compute Timeline'}
      </button>

      {snapshots.length > 0 && (
        <>
          {/* Playback controls */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button onClick={() => setCurrentStep(0)} title="Reset"
              className="w-7 h-7 rounded flex items-center justify-center text-isabelline/50 hover:text-isabelline hover:bg-vegas-gold/10 transition-colors text-sm">⏮</button>
            <button onClick={() => setIsPlaying(!isPlaying)} title={isPlaying ? 'Pause' : 'Play'}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-vegas-gold/20 text-vegas-gold hover:bg-vegas-gold/30 transition-colors text-sm">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => setCurrentStep(Math.min(currentStep + 1, snapshots.length - 1))} title="Next"
              className="w-7 h-7 rounded flex items-center justify-center text-isabelline/50 hover:text-isabelline hover:bg-vegas-gold/10 transition-colors text-sm">⏭</button>
          </div>

          {/* Timeline slider */}
          <div className="mb-4">
            <input
              type="range"
              min={0}
              max={snapshots.length - 1}
              step={1}
              value={currentStep}
              onChange={(e) => setCurrentStep(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-forest-light/60 accent-vegas-gold cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              {snapshots.map((_, i) => (
                <span key={i} className={`font-mono text-[9px] ${i === currentStep ? 'text-vegas-gold' : 'text-isabelline/25'}`}>{i}</span>
              ))}
            </div>
          </div>

          {/* Current state display */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(17,42,38,0.6)', border: '1px solid rgba(197,160,89,0.15)' }}>
            <div className="font-body text-[10px] text-isabelline/40 uppercase tracking-wider mb-1">
              Timestep {currentSnapshot?.timestep || 0}
            </div>

            {currentSnapshot?.gatesApplied.length ? (
              <div className="font-body text-xs text-isabelline/50 mb-2">
                Gates: {currentSnapshot.gatesApplied.join(', ')}
              </div>
            ) : (
              <div className="font-body text-xs text-isabelline/30 mb-2">Initial state |0…0⟩</div>
            )}

            <div className="font-body text-[10px] text-isabelline/40 uppercase tracking-wider mb-1.5">Top States</div>
            <div className="space-y-1">
              {topStates.map(([state, prob]) => (
                <div key={state} className="flex items-center justify-between">
                  <span className="font-mono text-xs text-isabelline/50">|{state}⟩</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(10,31,28,0.8)' }}>
                      <div className="h-full rounded-full bg-vegas-gold transition-all duration-300" style={{ width: `${prob * 100}%` }} />
                    </div>
                    <span className="font-mono text-xs text-isabelline w-12 text-right">{(prob * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {snapshots.length === 0 && !loading && (
        <div className="font-body text-xs text-isabelline/30 text-center mt-6">
          Click "Compute Timeline" to see state evolution at each timestep.
        </div>
      )}
    </div>
  );
}
