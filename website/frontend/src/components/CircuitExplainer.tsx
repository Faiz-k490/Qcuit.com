/**
 * CircuitExplainer — Deterministic, zero-LLM side panel
 *
 * Calls POST /api/explain (pure Python, no API keys) and renders:
 *  - a high-level verdict for the circuit ("3-qubit GHZ state"),
 *  - per-column step list with Bloch vectors + entanglement entropy,
 *  - pairwise entanglement edges (mutual information),
 *  - top measurement outcomes.
 *
 * No external model calls; the only network dependency is the local Flask
 * backend that powers the visualizer.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCircuit } from '../store/CircuitContext';

// ─── Types matching the /api/explain response ───────────────────────
interface QubitInfo {
  qubit: number;
  name: string | null;
  mixed: boolean;
  bloch: [number, number, number];
  prob0: number;
  prob1: number;
  purity: number;
  entropy: number;
}

interface ColumnNarrative {
  column: number;
  gates_applied: string[];
  qubits: QubitInfo[];
  entangled_qubits: number[];
  summary: string;
}

interface EntanglementEdge {
  a: number;
  b: number;
  mutual_information: number;
}

interface ExplainResponse {
  hash: string;
  num_qubits: number;
  num_columns: number;
  verdict: string;
  columns: ColumnNarrative[];
  entanglement_edges: EntanglementEdge[];
  top_outcomes: { state: string; probability: number }[];
}

// ─── Helper: hash circuit state client-side for cache equality ──────
function circuitSignature(state: any): string {
  const canonical = JSON.stringify({
    numQubits: state.numQubits,
    gates: state.gates,
    multiQubitGates: state.multiQubitGates,
    measurements: state.measurements,
  });
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) {
    h = ((h << 5) + h + canonical.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ─── Inline Bloch dot — tiny visual of the qubit's pure state ───────
function BlochDot({ bloch, mixed }: { bloch: [number, number, number]; mixed: boolean }) {
  const [x, y, z] = bloch;
  const r = 14;
  const cx = 16 + x * r;
  const cy = 16 - z * r;
  const opacity = Math.max(0.4, 1 - Math.abs(y) * 0.4);
  return (
    <svg width={32} height={32} className="inline-block flex-shrink-0">
      <circle cx={16} cy={16} r={r} fill="none" stroke="rgba(197,160,89,0.25)" />
      <line x1={16} y1={2} x2={16} y2={30} stroke="rgba(197,160,89,0.15)" />
      <line x1={2} y1={16} x2={30} y2={16} stroke="rgba(197,160,89,0.15)" />
      <circle
        cx={cx}
        cy={cy}
        r={mixed ? 2 : 3}
        fill={mixed ? 'rgba(197,160,89,0.35)' : 'rgba(197,160,89,0.95)'}
        opacity={opacity}
      />
    </svg>
  );
}

// ─── Per-qubit row ───────────────────────────────────────────────────
function QubitRow({ q }: { q: QubitInfo }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <BlochDot bloch={q.bloch} mixed={q.mixed} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[11px] text-vegas-gold">q{q.qubit}</span>
          <span className="font-display text-[12px] text-isabelline/90">{q.name ?? '—'}</span>
          {q.entropy > 1e-3 && (
            <span
              className="font-mono text-[9px] text-isabelline/40"
              title="Von Neumann entropy (bits)"
            >
              S={q.entropy.toFixed(2)}
            </span>
          )}
        </div>
        <div className="font-mono text-[10px] text-isabelline/40 truncate">
          P(0)={q.prob0.toFixed(2)} · P(1)={q.prob1.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────
export function CircuitExplainer() {
  const { state } = useCircuit();
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCol, setExpandedCol] = useState<number | null>(null);

  const cacheRef = useRef<Record<string, ExplainResponse>>({});
  const lastSigRef = useRef<string | null>(null);

  const explain = useCallback(async () => {
    setError(null);
    setLoading(true);
    const sig = circuitSignature(state);
    lastSigRef.current = sig;

    if (cacheRef.current[sig]) {
      setData(cacheRef.current[sig]);
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numQubits: state.numQubits,
          gates: state.gates,
          multiQubitGates: state.multiQubitGates,
          measurements: state.measurements,
        }),
      });
      const body = await resp.json();
      if (!resp.ok) {
        setError(body.error || `HTTP ${resp.status}`);
        setLoading(false);
        return;
      }
      cacheRef.current[sig] = body;
      if (lastSigRef.current === sig) {
        setData(body);
      }
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    const handle = setTimeout(() => {
      explain();
    }, 300);
    return () => clearTimeout(handle);
  }, [explain]);

  const totalGates = useMemo(() => {
    return (
      Object.keys(state.gates).length +
      state.multiQubitGates.length +
      state.measurements.length
    );
  }, [state]);

  return (
    <div className="h-full flex flex-col bg-deep-jungle border-l border-vegas-gold/20">
      <div className="px-3 py-3 border-b border-vegas-gold/15 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs text-vegas-gold tracking-wider uppercase">
            Explainer
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              loading ? 'bg-vegas-gold animate-pulse' : 'bg-vegas-gold/40'
            }`}
          />
        </div>
        <button
          onClick={explain}
          disabled={loading}
          className="font-body text-[10px] text-isabelline/30 hover:text-isabelline/70 transition-colors uppercase tracking-wider disabled:opacity-40"
        >
          {loading ? 'Analysing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {totalGates === 0 && !data && (
          <div className="text-center py-12">
            <div className="font-display text-lg text-vegas-gold/30 mb-3">Empty Circuit</div>
            <p className="font-body text-xs text-isabelline/30 leading-relaxed max-w-[220px] mx-auto">
              Drop a gate on the canvas — the explainer will describe the state
              after every column, detect entanglement, and classify the result.
              Fully deterministic, no API keys.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-3 px-3 py-2 border border-muted-brick/30 rounded-sm">
            <span className="font-mono text-[10px] text-muted-brick/70 uppercase tracking-widest">
              Error
            </span>
            <p className="font-body text-xs text-muted-brick/80 mt-1">{error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="mb-4">
              <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                Verdict
              </span>
              <p className="font-display text-base text-isabelline mt-1 leading-snug">
                {data.verdict}
              </p>
              <p className="font-body text-[11px] text-isabelline/40 mt-1">
                {data.num_qubits} qubits · {data.num_columns} columns ·{' '}
                {data.entanglement_edges.length} entanglement edge
                {data.entanglement_edges.length === 1 ? '' : 's'}
              </p>
            </div>

            {data.top_outcomes.length > 0 && (
              <div className="mb-4">
                <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                  Top Outcomes
                </span>
                <div className="mt-1.5 space-y-0.5">
                  {data.top_outcomes.map((o) => (
                    <div key={o.state} className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-vegas-gold/80 w-16">
                        |{o.state}⟩
                      </span>
                      <div className="flex-1 h-1 bg-vegas-gold/10 rounded">
                        <div
                          className="h-1 bg-vegas-gold/70 rounded"
                          style={{ width: `${o.probability * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-isabelline/50 w-12 text-right">
                        {(o.probability * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.entanglement_edges.length > 0 && (
              <div className="mb-4">
                <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                  Entanglement
                </span>
                <div className="mt-1.5 space-y-0.5">
                  {data.entanglement_edges.map((e) => (
                    <div
                      key={`${e.a}-${e.b}`}
                      className="flex items-center gap-2 font-mono text-[11px] text-isabelline/70"
                    >
                      <span className="text-vegas-gold/80">q{e.a}</span>
                      <span className="text-isabelline/30">↔</span>
                      <span className="text-vegas-gold/80">q{e.b}</span>
                      <span className="ml-auto text-isabelline/40">
                        I = {e.mutual_information.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                Step by Step
              </span>
              <div className="mt-1.5 space-y-1.5">
                {data.columns.map((col, idx) => {
                  const isExpanded = expandedCol === idx;
                  const isInitial = col.column < 0;
                  const colLabel = isInitial ? 'init' : `t${col.column}`;
                  return (
                    <div
                      key={idx}
                      className="border border-vegas-gold/10 rounded-sm bg-forest-light/20"
                    >
                      <button
                        onClick={() => setExpandedCol(isExpanded ? null : idx)}
                        className="w-full px-2.5 py-1.5 flex items-start gap-2 text-left hover:bg-vegas-gold/5 transition-colors"
                      >
                        <span className="font-mono text-[10px] text-vegas-gold/70 mt-0.5 w-8 flex-shrink-0">
                          {colLabel}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[10px] text-isabelline/50 truncate">
                            {col.gates_applied.join(' · ') || '—'}
                          </div>
                          <div className="font-display text-[12px] text-isabelline/90 mt-0.5 leading-snug">
                            {col.summary}
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-isabelline/30 mt-0.5">
                          {isExpanded ? '−' : '+'}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-2.5 pb-2 pt-1 border-t border-vegas-gold/10">
                          {col.qubits.map((q) => (
                            <QubitRow key={q.qubit} q={q} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="font-mono text-[9px] text-isabelline/20 mt-4 tracking-wide text-center">
              SHA-256 {data.hash.slice(0, 12)}… · deterministic · zero-LLM
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default CircuitExplainer;
