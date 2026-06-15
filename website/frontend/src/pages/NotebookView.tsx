/**
 * NotebookView — Read-only Visualizer view for /n/<hash>.
 *
 * Loads the artifact from /api/notebook/<hash>, hydrates the global
 * CircuitContext with its circuit + results, and renders the existing
 * Visualizer chrome (App.v5) with a permanent banner indicating read-only,
 * citable status.
 *
 * The banner is implemented as a thin wrapper that conditionally renders
 * a top strip above <App />. App.v5's own controls still work for
 * inspection (re-simulate, view code), but the source hash and permalink
 * stay visible.
 */

import React, { useEffect, useState } from 'react';
import { CircuitEditor } from '../App.v5';
import { CircuitProvider, useCircuit } from '../store/CircuitContext';
import type { CircuitState, SimulationResult } from '../types';

interface NotebookArtifact {
  run_hash: string;
  schema_version: string;
  created_at: string;
  circuit: CircuitState;
  noise_config: { depolarizing?: number; T1?: number; T2?: number };
  shots: number;
  seed: number;
  results: {
    probabilities: Record<string, number>;
    statevector_real: number[];
    statevector_imag: number[];
    counts: Record<string, number>;
  };
  metadata: Record<string, any>;
}

function getHashFromPath(): string | null {
  const m = window.location.pathname.match(/^\/n\/([0-9a-fA-F]{8,})\/?$/);
  return m ? m[1] : null;
}

// Inner: runs inside CircuitProvider so we can call useCircuit()
function NotebookLoader({ hash }: { hash: string }) {
  const { loadCircuit, setResults } = useCircuit();
  const [artifact, setArtifact] = useState<NotebookArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/notebook/${hash}`);
        if (!resp.ok) {
          if (resp.status === 404) throw new Error('Notebook not found.');
          throw new Error(`HTTP ${resp.status}`);
        }
        const data: NotebookArtifact = await resp.json();
        if (cancelled) return;
        setArtifact(data);

        // Hydrate the Visualizer state with the persisted circuit.
        if (data.circuit) {
          loadCircuit(data.circuit);
        }

        // Hydrate results so the visualisations populate immediately.
        const simResult: SimulationResult = {
          probabilities: data.results?.probabilities || {},
          code: { qiskit: '', braket: '', openqasm: '' },
        };
        setResults(simResult);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash, loadCircuit, setResults]);

  if (error) {
    return (
      <div className="min-h-screen bg-deep-jungle text-isabelline flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl text-vegas-gold mb-2">Notebook unavailable</h1>
          <p className="font-body text-sm text-isabelline/70 mb-4">{error}</p>
          <p className="font-mono text-[10px] text-isabelline/40 break-all">{hash}</p>
          <a
            href="/lab"
            className="inline-block mt-6 font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-vegas-gold/30 text-vegas-gold hover:bg-vegas-gold/10 transition-all"
          >
            Open Lab → Notebook
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Read-only banner */}
      <div className="bg-vegas-gold/15 border-b border-vegas-gold/40 px-4 py-1.5 flex items-center gap-3 flex-wrap z-40">
        <span className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold">
          Notebook
        </span>
        <span className="font-mono text-[10px] text-vegas-gold/80">SHA-256</span>
        <span className="font-mono text-[10px] text-isabelline break-all">{hash}</span>
        {artifact && (
          <>
            <span className="font-mono text-[10px] text-isabelline/50">
              · {artifact.metadata?.num_qubits ?? artifact.circuit?.numQubits ?? '—'} qubits
            </span>
            <span className="font-mono text-[10px] text-isabelline/50">
              · seed {artifact.seed}
            </span>
            <span className="font-mono text-[10px] text-isabelline/50">
              · {artifact.created_at}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() =>
              navigator.clipboard
                .writeText(window.location.href)
                .catch(() => {})
            }
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-vegas-gold/30 text-vegas-gold/80 hover:bg-vegas-gold/10 transition-all"
          >
            Copy URL
          </button>
          <a
            href={`/api/notebook/${hash}/bibtex`}
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-vegas-gold/30 text-vegas-gold/80 hover:bg-vegas-gold/10 transition-all"
          >
            BibTeX
          </a>
          <a
            href="/visualizer"
            className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-vegas-gold/30 text-vegas-gold/80 hover:bg-vegas-gold/10 transition-all"
          >
            Exit
          </a>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <CircuitEditor />
      </div>
    </div>
  );
}

export function NotebookView() {
  const [hash, setHash] = useState<string | null>(() => getHashFromPath());

  useEffect(() => {
    const update = () => setHash(getHashFromPath());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  if (!hash) {
    return (
      <div className="min-h-screen bg-deep-jungle text-isabelline flex items-center justify-center">
        <p className="font-body text-sm text-isabelline/60">
          No notebook hash in URL. Try <code className="font-mono text-vegas-gold">/n/&lt;hash&gt;</code>.
        </p>
      </div>
    );
  }

  return (
    <CircuitProvider>
      <NotebookLoader hash={hash} />
    </CircuitProvider>
  );
}

export default NotebookView;
