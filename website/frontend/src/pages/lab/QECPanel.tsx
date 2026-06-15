/**
 * QECPanel — Phase 7, Pillar F
 *
 * Quantum Error Correction sandbox UI.
 *
 *  - Left sidebar: code picker, error legend, recovery / verdict summary.
 *  - Center: interactive lattice (SVG). Click a data qubit to cycle its
 *    injected Pauli (I → X → Y → Z → I). Stabilisers tile the lattice and
 *    light up when violated by the current error pattern.
 *  - Right: per-stabiliser syndrome bits and a chronological event log.
 *
 * Calls the deterministic Python backend at /api/qec/{codes, code, run}.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

/* ─── Types mirror website/api/qec ─────────────────────────────────── */

interface StabiliserDTO {
  name: string;
  pauli: 'X' | 'Z';
  qubits: number[];
  pos: [number, number] | null;
}

interface CodeDTO {
  name: string;
  num_data: number;
  distance: number;
  stabilisers: StabiliserDTO[];
  logical_x: number[];
  logical_z: number[];
  data_positions: [number, number][];
  description: string;
  decoder: string;
}

interface ErrorBits {
  x_bits: number[];
  z_bits: number[];
}

interface RunResult {
  code: string;
  errors: ErrorBits;
  syndrome: number[];
  stabiliser_names: string[];
  recovery: ErrorBits;
  residual: ErrorBits;
  success: boolean;
  decoder: string;
}

type Pauli = 'I' | 'X' | 'Y' | 'Z';

const PAULI_CYCLE: Pauli[] = ['I', 'X', 'Y', 'Z'];
const PAULI_COLOR: Record<Pauli, string> = {
  I: 'rgba(245,242,234,0.10)',
  X: '#C5A059',  // vegas-gold
  Y: '#D4B878',  // brass-light
  Z: '#B85C50',  // muted-brick
};

const CODE_LABELS: Record<string, string> = {
  repetition_3: 'Repetition-3',
  steane_7: 'Steane-7',
  shor_9: 'Shor-9',
  surface_d3: 'Surface (d=3)',
};

/* ─── Helpers ────────────────────────────────────────────────────── */

function bitsToPaulis(bits: ErrorBits): Pauli[] {
  const n = Math.max(bits.x_bits.length, bits.z_bits.length);
  const out: Pauli[] = [];
  for (let i = 0; i < n; i++) {
    const x = bits.x_bits[i] ?? 0;
    const z = bits.z_bits[i] ?? 0;
    if (x && z) out.push('Y');
    else if (x) out.push('X');
    else if (z) out.push('Z');
    else out.push('I');
  }
  return out;
}

function nextPauli(p: Pauli): Pauli {
  return PAULI_CYCLE[(PAULI_CYCLE.indexOf(p) + 1) % PAULI_CYCLE.length];
}

function paulisToErrorList(paulis: Pauli[]): { pauli: Pauli; qubit: number }[] {
  return paulis
    .map((p, q) => ({ pauli: p, qubit: q }))
    .filter((e) => e.pauli !== 'I');
}

/* ─── Lattice SVG ─────────────────────────────────────────────────── */

interface LatticeProps {
  code: CodeDTO;
  paulis: Pauli[];
  syndrome: number[];
  recovery: ErrorBits | null;
  onCycle: (qubit: number) => void;
}

function Lattice({ code, paulis, syndrome, recovery, onCycle }: LatticeProps) {
  // Compute bounding box across data qubits and stabilisers, then map to SVG.
  const allPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [...code.data_positions];
    for (const s of code.stabilisers) {
      if (s.pos) pts.push(s.pos);
    }
    return pts;
  }, [code]);

  const { sx, sy, w, h } = useMemo(() => {
    const xs = allPoints.map((p) => p[0]);
    const ys = allPoints.map((p) => p[1]);
    const minX = Math.min(...xs, 0);
    const minY = Math.min(...ys, 0);
    const maxX = Math.max(...xs, 1);
    const maxY = Math.max(...ys, 1);
    const pad = 60;
    const cell = 90;
    const width = (maxX - minX) * cell + pad * 2;
    const height = (maxY - minY) * cell + pad * 2;
    return {
      sx: (x: number) => (x - minX) * cell + pad,
      sy: (y: number) => (y - minY) * cell + pad,
      w: width,
      h: height,
    };
  }, [allPoints]);

  const recoveryPaulis = recovery
    ? bitsToPaulis(recovery)
    : new Array(code.num_data).fill('I');

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Connecting grid lines between adjacent data qubits */}
      {code.data_positions.map((p, i) =>
        code.data_positions.slice(i + 1).map((q, j) => {
          const dx = Math.abs(p[0] - q[0]);
          const dy = Math.abs(p[1] - q[1]);
          if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            return (
              <line
                key={`gl-${i}-${i + 1 + j}`}
                x1={sx(p[0])}
                y1={sy(p[1])}
                x2={sx(q[0])}
                y2={sy(q[1])}
                stroke="rgba(197,160,89,0.10)"
                strokeWidth={1}
              />
            );
          }
          return null;
        })
      )}

      {/* Stabilisers — drawn as labeled tiles over their qubit support */}
      {code.stabilisers.map((s, si) => {
        const violated = syndrome[si] === 1;
        const isX = s.pauli === 'X';
        // Compute centroid + bounding box across the stabiliser's qubit support.
        const pts = s.qubits.map((q) => code.data_positions[q]);
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const rx = Math.max(0.4, (Math.max(...xs) - Math.min(...xs)) / 2 + 0.4);
        const ry = Math.max(0.4, (Math.max(...ys) - Math.min(...ys)) / 2 + 0.4);
        const baseFill = isX
          ? violated
            ? 'rgba(197,160,89,0.35)'
            : 'rgba(197,160,89,0.06)'
          : violated
            ? 'rgba(184,92,80,0.35)'
            : 'rgba(184,92,80,0.06)';
        const stroke = isX
          ? violated
            ? '#C5A059'
            : 'rgba(197,160,89,0.25)'
          : violated
            ? '#B85C50'
            : 'rgba(184,92,80,0.25)';
        return (
          <g key={`stab-${si}`}>
            <ellipse
              cx={sx(cx)}
              cy={sy(cy)}
              rx={rx * 90 - 8}
              ry={ry * 90 - 8}
              fill={baseFill}
              stroke={stroke}
              strokeWidth={violated ? 2 : 1}
            />
            {s.pos && (
              <text
                x={sx(s.pos[0])}
                y={sy(s.pos[1]) - 4}
                textAnchor="middle"
                fontSize={10}
                fontFamily="'JetBrains Mono', monospace"
                fill={violated ? stroke : 'rgba(245,242,234,0.35)'}
              >
                {s.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Data qubits */}
      {code.data_positions.map((p, q) => {
        const pauli = paulis[q] ?? 'I';
        const rec = recoveryPaulis[q] as Pauli;
        const hasRec = rec !== 'I';
        return (
          <g
            key={`q-${q}`}
            onClick={() => onCycle(q)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              cx={sx(p[0])}
              cy={sy(p[1])}
              r={18}
              fill={pauli === 'I' ? '#1a2a23' : PAULI_COLOR[pauli]}
              stroke={pauli === 'I' ? 'rgba(197,160,89,0.35)' : PAULI_COLOR[pauli]}
              strokeWidth={2}
            />
            {hasRec && (
              <circle
                cx={sx(p[0])}
                cy={sy(p[1])}
                r={24}
                fill="none"
                stroke={PAULI_COLOR[rec]}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
            <text
              x={sx(p[0])}
              y={sy(p[1]) + 4}
              textAnchor="middle"
              fontSize={13}
              fontFamily="'Inter', sans-serif"
              fontWeight={600}
              fill={pauli === 'I' ? 'rgba(245,242,234,0.5)' : '#0F1A14'}
            >
              {pauli === 'I' ? `q${q}` : pauli}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Main panel ─────────────────────────────────────────────────── */

export default function QECPanel() {
  const [codeNames, setCodeNames] = useState<string[]>([]);
  const [codeName, setCodeName] = useState<string>('repetition_3');
  const [code, setCode] = useState<CodeDTO | null>(null);
  const [paulis, setPaulis] = useState<Pauli[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  /* ── Fetch code list once ── */
  useEffect(() => {
    let aborted = false;
    fetch('/api/qec/codes')
      .then((r) => r.json())
      .then((j) => {
        if (aborted) return;
        if (Array.isArray(j.codes)) setCodeNames(j.codes);
      })
      .catch((e) => !aborted && setError(String(e)));
    return () => {
      aborted = true;
    };
  }, []);

  /* ── Fetch selected code layout ── */
  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError(null);
    fetch('/api/qec/code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: codeName }),
    })
      .then((r) => r.json())
      .then((j: CodeDTO | { error: string }) => {
        if (aborted) return;
        if ('error' in j) {
          setError(j.error);
          return;
        }
        setCode(j);
        setPaulis(new Array(j.num_data).fill('I'));
        setResult(null);
        setLog([]);
      })
      .catch((e) => !aborted && setError(String(e)))
      .finally(() => !aborted && setLoading(false));
    return () => {
      aborted = true;
    };
  }, [codeName]);

  /* ── Run pipeline whenever the error pattern changes ── */
  const runPipeline = useCallback(
    async (next: Pauli[]) => {
      if (!code) return;
      const errors = paulisToErrorList(next);
      if (errors.length === 0) {
        setResult(null);
        return;
      }
      try {
        const resp = await fetch('/api/qec/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.name, errors }),
        });
        const json = (await resp.json()) as RunResult | { error: string };
        if ('error' in json) {
          setError(json.error);
          return;
        }
        setResult(json);
        const stamp = errors
          .map((e) => `${e.pauli}${e.qubit}`)
          .join(' · ');
        setLog((l) =>
          [
            `${json.success ? '✓' : '✗'} ${stamp} → syndrome [${json.syndrome.join(
              '',
            )}] · ${json.success ? 'corrected' : 'LOGICAL ERROR'}`,
            ...l,
          ].slice(0, 60),
        );
      } catch (e: any) {
        setError(e.message || String(e));
      }
    },
    [code],
  );

  const cycleQubit = (q: number) => {
    setPaulis((prev) => {
      const next = [...prev];
      next[q] = nextPauli(next[q] ?? 'I');
      runPipeline(next);
      return next;
    });
  };

  const handleReset = () => {
    if (!code) return;
    setPaulis(new Array(code.num_data).fill('I'));
    setResult(null);
  };

  const handleRandom = () => {
    if (!code) return;
    const next: Pauli[] = new Array(code.num_data).fill('I');
    const q = Math.floor(Math.random() * code.num_data);
    const p = PAULI_CYCLE[1 + Math.floor(Math.random() * 3)];
    next[q] = p;
    setPaulis(next);
    runPipeline(next);
  };

  const recoveryPaulis = result ? bitsToPaulis(result.recovery) : null;
  const residualPaulis = result ? bitsToPaulis(result.residual) : null;

  return (
    <div className="flex flex-col h-full -mx-8 -mt-0">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-vegas-gold/15 bg-forest-light/20">
        <h2 className="font-display text-base text-isabelline tracking-wide mr-auto">
          QEC Sandbox
        </h2>

        <button
          onClick={handleRandom}
          disabled={!code || loading}
          className="px-3 py-1.5 rounded bg-vegas-gold text-deep-jungle font-body text-xs font-semibold hover:bg-brass-light disabled:opacity-40 transition-all"
        >
          ⚡ Inject random
        </button>
        <button
          onClick={handleReset}
          disabled={!code}
          className="px-3 py-1.5 rounded border border-vegas-gold/20 text-isabelline/50 font-body text-xs hover:text-isabelline hover:bg-vegas-gold/10 disabled:opacity-30 transition-all"
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Body: 3 columns ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left sidebar ── */}
        <aside className="w-72 flex-shrink-0 border-r border-vegas-gold/15 bg-forest-light/10 p-4 overflow-y-auto space-y-5">
          {/* Code picker */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Code
            </label>
            <select
              value={codeName}
              onChange={(e) => setCodeName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-body text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
            >
              {(codeNames.length > 0
                ? codeNames
                : ['repetition_3', 'steane_7', 'shor_9', 'surface_d3']
              ).map((name) => (
                <option key={name} value={name}>
                  {CODE_LABELS[name] ?? name}
                </option>
              ))}
            </select>
            {code && (
              <p className="font-body text-[10px] text-isabelline/30 mt-1">
                d={code.distance} · {code.num_data} data · {code.stabilisers.length}{' '}
                stabs · {code.decoder}
              </p>
            )}
          </div>

          {/* Legend */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Legend
            </label>
            <div className="space-y-1.5">
              {(['X', 'Y', 'Z'] as Pauli[]).map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: PAULI_COLOR[p] }}
                  />
                  <span className="font-mono text-[11px] text-isabelline/70">
                    {p}-error
                  </span>
                </div>
              ))}
              <p className="font-body text-[10px] text-isabelline/40 leading-relaxed pt-1">
                Click a data qubit to cycle its Pauli (I → X → Y → Z). Dashed
                ring shows the decoder's proposed recovery.
              </p>
            </div>
          </div>

          {/* Verdict */}
          {result && (
            <div
              className={`px-3 py-2.5 border rounded ${
                result.success
                  ? 'border-vegas-gold/30 bg-vegas-gold/5'
                  : 'border-muted-brick/40 bg-muted-brick/10'
              }`}
            >
              <div
                className={`font-mono text-[10px] uppercase tracking-widest mb-1 ${
                  result.success ? 'text-vegas-gold' : 'text-muted-brick'
                }`}
              >
                {result.success ? 'Corrected' : 'Logical Error'}
              </div>
              {recoveryPaulis && (
                <p className="font-mono text-[10px] text-isabelline/70 leading-relaxed">
                  Recovery:{' '}
                  {recoveryPaulis
                    .map((p, q) => (p === 'I' ? null : `${p}${q}`))
                    .filter(Boolean)
                    .join(' · ') || '(none)'}
                </p>
              )}
              {residualPaulis && (
                <p className="font-mono text-[10px] text-isabelline/40 leading-relaxed">
                  Residual:{' '}
                  {residualPaulis
                    .map((p, q) => (p === 'I' ? null : `${p}${q}`))
                    .filter(Boolean)
                    .join(' · ') || '(identity)'}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="px-3 py-2 border border-muted-brick/30 rounded bg-muted-brick/5">
              <p className="font-mono text-[10px] text-muted-brick/80">{error}</p>
            </div>
          )}

          {code && (
            <div className="px-3 py-2 border border-vegas-gold/10 rounded bg-deep-jungle/40">
              <div className="font-mono text-[9px] text-vegas-gold/50 uppercase tracking-widest mb-1">
                About this code
              </div>
              <p className="font-body text-[11px] text-isabelline/60 leading-relaxed">
                {code.description}
              </p>
            </div>
          )}
        </aside>

        {/* ── Center: lattice ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4">
          {loading && (
            <p className="font-mono text-[10px] text-vegas-gold/40">Loading code…</p>
          )}
          {code && (
            <div className="flex-1 min-h-[320px] bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3 flex items-center justify-center">
              <Lattice
                code={code}
                paulis={paulis.length ? paulis : new Array(code.num_data).fill('I')}
                syndrome={result?.syndrome ?? new Array(code.stabilisers.length).fill(0)}
                recovery={result?.recovery ?? null}
                onCycle={cycleQubit}
              />
            </div>
          )}
          {code && paulis.every((p) => p === 'I') && (
            <p className="font-body text-[11px] text-isabelline/35 text-center mt-3">
              Click any data qubit to inject a Pauli error and watch the syndrome
              light up.
            </p>
          )}
        </div>

        {/* ── Right: syndrome + log ── */}
        <aside className="w-72 flex-shrink-0 border-l border-vegas-gold/15 bg-forest-light/10 flex flex-col">
          <div className="px-3 py-2 border-b border-vegas-gold/10">
            <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
              Syndrome
            </span>
          </div>
          <div className="px-3 py-2 border-b border-vegas-gold/10 max-h-[40%] overflow-y-auto">
            {code ? (
              <div className="space-y-1">
                {code.stabilisers.map((s, i) => {
                  const bit = result?.syndrome?.[i] ?? 0;
                  return (
                    <div
                      key={s.name}
                      className="flex items-center justify-between px-1.5 py-0.5 rounded"
                    >
                      <span className="font-mono text-[10px] text-isabelline/60">
                        {s.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold ${
                          bit
                            ? s.pauli === 'X'
                              ? 'text-vegas-gold'
                              : 'text-muted-brick'
                            : 'text-isabelline/30'
                        }`}
                      >
                        {bit}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="font-body text-[10px] text-isabelline/30">
                No code loaded.
              </p>
            )}
          </div>

          <div className="px-3 py-2 border-b border-vegas-gold/10">
            <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
              Event Log
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-px">
            {log.length === 0 && (
              <p className="font-body text-[10px] text-isabelline/25 text-center py-4">
                No events yet
              </p>
            )}
            {log.map((line, i) => (
              <div
                key={i}
                className="font-mono text-[10px] text-isabelline/60 px-2 py-1 rounded hover:bg-vegas-gold/5 transition-colors truncate"
                title={line}
              >
                {line}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
