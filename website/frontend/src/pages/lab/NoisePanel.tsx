/**
 * NoisePanel — Phase 2, Pillar B
 *
 * Vendor-calibrated noise sandbox.
 *
 *  - Left sidebar: snapshot picker, snapshot summary, gate-count inputs.
 *  - Center: stacked error-budget bar + fidelity-vs-depth chart.
 *  - Right: snapshot detail table (per-qubit T1/T2/readout error).
 *
 * Calls deterministic Python at /api/noise/{snapshots,snapshot,apply,fidelity-curve}.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

/* ─── Types ─────────────────────────────────────────────────────────── */

interface SnapshotSummary {
  mean_t1_ns: number;
  mean_t2_ns: number;
  mean_gate_error_1q: number;
  mean_gate_error_2q: number;
  mean_readout_error: number;
}

interface Snapshot {
  name: string;
  vendor: string;
  device: string;
  num_qubits: number;
  t1_ns: number[];
  t2_ns: number[];
  gate_time_1q_ns: number;
  gate_time_2q_ns: number;
  gate_time_measure_ns: number;
  gate_error_1q: number[];
  gate_error_2q: { qubits: number[]; error: number }[];
  readout_error: number[];
  description: string;
  summary: SnapshotSummary;
}

interface BudgetBucket {
  label: string;
  value: number;
  color: string;
}

interface BudgetResult {
  snapshot: string;
  gate_counts: Record<string, number>;
  depth: number;
  single_qubit_err: number;
  two_qubit_err: number;
  decoherence_err: number;
  readout_err: number;
  total_err: number;
  fidelity: number;
  breakdown: BudgetBucket[];
}

interface CurvePoint {
  depth: number;
  fidelity: number;
  total_err: number;
}

const COLORS = {
  gold: '#C5A059',
  brass: '#D4B878',
  brick: '#B85C50',
  isabelline: 'rgba(245,242,234,0.55)',
  grid: 'rgba(197,160,89,0.08)',
  tick: 'rgba(245,242,234,0.45)',
};

const BUCKET_COLOR_MAP: Record<string, string> = {
  'vegas-gold': COLORS.gold,
  'brass-light': COLORS.brass,
  'muted-brick': COLORS.brick,
  isabelline: COLORS.isabelline,
};

function nanosToMicro(ns: number): string {
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(1)} ms`;
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(1)} μs`;
  return `${ns.toFixed(0)} ns`;
}

/* ─── Stacked error-budget bar ──────────────────────────────────────── */

function ErrorBudgetBar({ result }: { result: BudgetResult }) {
  // Use ε rather than fidelity so the bar visualises infidelity directly.
  const total = result.breakdown.reduce((a, b) => a + b.value, 0);
  if (total === 0) {
    return (
      <p className="font-body text-[11px] text-isabelline/40">
        No errors estimated.
      </p>
    );
  }
  return (
    <div>
      <div className="flex h-7 rounded overflow-hidden border border-vegas-gold/15 bg-deep-jungle/40">
        {result.breakdown.map((b) => {
          const pct = (b.value / total) * 100;
          if (pct < 0.1) return null;
          return (
            <div
              key={b.label}
              style={{
                width: `${pct}%`,
                background: BUCKET_COLOR_MAP[b.color] ?? COLORS.gold,
              }}
              title={`${b.label}: ε = ${b.value.toExponential(2)}`}
            />
          );
        })}
      </div>
      <div className="mt-2 space-y-1">
        {result.breakdown.map((b) => (
          <div
            key={b.label}
            className="flex items-center justify-between font-mono text-[10px] text-isabelline/70"
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: BUCKET_COLOR_MAP[b.color] ?? COLORS.gold }}
              />
              {b.label}
            </span>
            <span>{b.value.toExponential(2)}</span>
          </div>
        ))}
        <div className="border-t border-vegas-gold/15 mt-2 pt-2 flex items-center justify-between font-mono text-[10px] text-isabelline">
          <span>Total infidelity</span>
          <span className="text-vegas-gold font-bold">
            {(1 - result.fidelity).toExponential(2)}
          </span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-isabelline/60">
          <span>Fidelity</span>
          <span>{result.fidelity.toFixed(6)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main panel ────────────────────────────────────────────────────── */

export default function NoisePanel() {
  const [snapshotNames, setSnapshotNames] = useState<string[]>([]);
  const [snapshotName, setSnapshotName] = useState<string>('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [budget, setBudget] = useState<BudgetResult | null>(null);
  const [curve, setCurve] = useState<CurvePoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Circuit summary inputs
  const [n1q, setN1q] = useState<number>(20);
  const [n2q, setN2q] = useState<number>(4);
  const [nMeas, setNMeas] = useState<number>(5);
  const [depth, setDepth] = useState<number>(10);

  /* ── List snapshots once ── */
  useEffect(() => {
    let aborted = false;
    fetch('/api/noise/snapshots')
      .then((r) => r.json())
      .then((j) => {
        if (aborted) return;
        const names: string[] = j.snapshots ?? [];
        setSnapshotNames(names);
        if (names.length > 0) setSnapshotName(names[0]);
      })
      .catch((e) => !aborted && setError(String(e)));
    return () => {
      aborted = true;
    };
  }, []);

  /* ── Fetch selected snapshot ── */
  useEffect(() => {
    if (!snapshotName) return;
    let aborted = false;
    fetch('/api/noise/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: snapshotName }),
    })
      .then((r) => r.json())
      .then((j: Snapshot | { error: string }) => {
        if (aborted) return;
        if ('error' in j) {
          setError(j.error);
          return;
        }
        setSnapshot(j);
        setError(null);
      })
      .catch((e) => !aborted && setError(String(e)));
    return () => {
      aborted = true;
    };
  }, [snapshotName]);

  /* ── Run budget when inputs change ── */
  const recompute = useCallback(async () => {
    if (!snapshotName) return;
    try {
      const [applyResp, curveResp] = await Promise.all([
        fetch('/api/noise/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshot: snapshotName,
            gate_counts: { '1q': n1q, '2q': n2q, meas: nMeas },
            depth,
          }),
        }),
        fetch('/api/noise/fidelity-curve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            snapshot: snapshotName,
            gate_mix: { '1q': Math.max(1, Math.round(n1q / Math.max(1, depth))),
                        '2q': Math.max(0, Math.round(n2q / Math.max(1, depth))) },
            max_depth: 50,
          }),
        }),
      ]);
      const applyJson = (await applyResp.json()) as BudgetResult | { error: string };
      const curveJson = (await curveResp.json()) as { curve: CurvePoint[]; snapshot: string } | { error: string };
      if ('error' in applyJson) {
        setError(applyJson.error);
      } else {
        setBudget(applyJson);
      }
      if ('error' in curveJson) {
        setError(curveJson.error);
      } else {
        setCurve(curveJson.curve);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }, [snapshotName, n1q, n2q, nMeas, depth]);

  useEffect(() => {
    if (snapshotName) recompute();
  }, [snapshotName, n1q, n2q, nMeas, depth, recompute]);

  /* ── Chart data ── */
  const curveLabels = curve.map((c) => String(c.depth));
  const curveData = curve.map((c) => c.fidelity);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 } as const,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Fidelity vs depth',
        color: COLORS.tick,
        font: { family: "'Inter', sans-serif", size: 11 },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Depth',
          color: COLORS.tick,
          font: { family: "'Inter', sans-serif", size: 10 },
        },
        ticks: {
          color: COLORS.tick,
          font: { family: "'JetBrains Mono', monospace", size: 9 },
          maxTicksLimit: 12,
        },
        grid: { color: COLORS.grid },
      },
      y: {
        min: 0,
        max: 1.02,
        title: {
          display: true,
          text: 'F',
          color: COLORS.tick,
          font: { family: "'Inter', sans-serif", size: 10 },
        },
        ticks: {
          color: COLORS.tick,
          font: { family: "'JetBrains Mono', monospace", size: 9 },
        },
        grid: { color: COLORS.grid },
      },
    },
  };

  return (
    <div className="flex flex-col h-full -mx-8 -mt-0">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-vegas-gold/15 bg-forest-light/20">
        <h2 className="font-display text-base text-isabelline tracking-wide mr-auto">
          Noise Lab
        </h2>
        <button
          onClick={recompute}
          disabled={!snapshotName}
          className="px-3 py-1.5 rounded border border-vegas-gold/20 text-isabelline/50 font-body text-xs hover:text-isabelline hover:bg-vegas-gold/10 disabled:opacity-30 transition-all"
        >
          ↺ Recompute
        </button>
      </div>

      {/* ── Body: 3 columns ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left sidebar ── */}
        <aside className="w-72 flex-shrink-0 border-r border-vegas-gold/15 bg-forest-light/10 p-4 overflow-y-auto space-y-5">
          {/* Snapshot */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Calibration snapshot
            </label>
            <select
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-body text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
            >
              {snapshotNames.length === 0 ? (
                <option value="">(no snapshots found)</option>
              ) : (
                snapshotNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
            {snapshot && (
              <p className="font-body text-[10px] text-isabelline/30 mt-1">
                {snapshot.vendor} · {snapshot.device} · {snapshot.num_qubits} qubits
              </p>
            )}
          </div>

          {/* Snapshot summary */}
          {snapshot && (
            <div className="px-3 py-2 border border-vegas-gold/10 rounded bg-deep-jungle/40 space-y-1">
              <div className="font-mono text-[9px] text-vegas-gold/50 uppercase tracking-widest mb-1">
                Mean parameters
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[10px] text-isabelline/70">
                <span>T₁</span>
                <span className="text-right">{nanosToMicro(snapshot.summary.mean_t1_ns)}</span>
                <span>T₂</span>
                <span className="text-right">{nanosToMicro(snapshot.summary.mean_t2_ns)}</span>
                <span>1q error</span>
                <span className="text-right">
                  {snapshot.summary.mean_gate_error_1q.toExponential(2)}
                </span>
                <span>2q error</span>
                <span className="text-right">
                  {snapshot.summary.mean_gate_error_2q.toExponential(2)}
                </span>
                <span>readout</span>
                <span className="text-right">
                  {snapshot.summary.mean_readout_error.toExponential(2)}
                </span>
              </div>
            </div>
          )}

          {/* Circuit summary inputs */}
          <div className="space-y-3">
            <div className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
              Circuit summary
            </div>
            {[
              { label: '1q gates', value: n1q, set: setN1q, step: 1, min: 0 },
              { label: '2q gates', value: n2q, set: setN2q, step: 1, min: 0 },
              { label: 'measurements', value: nMeas, set: setNMeas, step: 1, min: 0 },
              { label: 'depth', value: depth, set: setDepth, step: 1, min: 1 },
            ].map((row) => (
              <div key={row.label}>
                <label className="block font-mono text-[10px] text-isabelline/45 uppercase tracking-wider mb-1">
                  {row.label}
                </label>
                <input
                  type="number"
                  step={row.step}
                  min={row.min}
                  value={row.value}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    row.set(Number.isFinite(v) ? Math.max(row.min, v) : row.min);
                  }}
                  className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="px-3 py-2 border border-muted-brick/30 rounded bg-muted-brick/5">
              <p className="font-mono text-[10px] text-muted-brick/80">{error}</p>
            </div>
          )}

          {snapshot && (
            <div className="px-3 py-2 border border-vegas-gold/10 rounded bg-deep-jungle/40">
              <div className="font-mono text-[9px] text-vegas-gold/50 uppercase tracking-widest mb-1">
                About this snapshot
              </div>
              <p className="font-body text-[11px] text-isabelline/60 leading-relaxed">
                {snapshot.description}
              </p>
            </div>
          )}
        </aside>

        {/* ── Center: budget + curve ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 gap-4">
          {/* Error budget */}
          <div className="bg-deep-jungle/40 border border-vegas-gold/10 rounded p-4">
            <div className="font-mono text-[10px] text-vegas-gold/60 uppercase tracking-widest mb-2">
              Error budget
            </div>
            {budget ? (
              <ErrorBudgetBar result={budget} />
            ) : (
              <p className="font-body text-[11px] text-isabelline/30">
                Pick a snapshot to compute the budget.
              </p>
            )}
          </div>

          {/* Fidelity curve */}
          <div className="flex-1 min-h-[260px] bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3">
            <Line
              data={{
                labels: curveLabels,
                datasets: [
                  {
                    label: 'Fidelity',
                    data: curveData,
                    borderColor: COLORS.gold,
                    backgroundColor: 'rgba(197,160,89,0.12)',
                    borderWidth: 1.8,
                    pointRadius: 0,
                    tension: 0.15,
                    fill: true,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>
        </div>

        {/* ── Right: per-qubit table ── */}
        <aside className="w-72 flex-shrink-0 border-l border-vegas-gold/15 bg-forest-light/10 flex flex-col">
          <div className="px-3 py-2 border-b border-vegas-gold/10">
            <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
              Per-qubit parameters
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-px">
            {snapshot ? (
              <table className="w-full font-mono text-[10px] text-isabelline/70">
                <thead className="text-vegas-gold/60 sticky top-0 bg-forest-light/40">
                  <tr>
                    <th className="text-left px-2 py-1">q</th>
                    <th className="text-right px-2 py-1">T₁</th>
                    <th className="text-right px-2 py-1">T₂</th>
                    <th className="text-right px-2 py-1">RO</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.t1_ns.map((t1, q) => (
                    <tr key={q} className="hover:bg-vegas-gold/5 transition-colors">
                      <td className="px-2 py-1">{q}</td>
                      <td className="px-2 py-1 text-right">{nanosToMicro(t1)}</td>
                      <td className="px-2 py-1 text-right">
                        {nanosToMicro(snapshot.t2_ns[q] ?? 0)}
                      </td>
                      <td className="px-2 py-1 text-right">
                        {(snapshot.readout_error[q] ?? 0).toExponential(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="font-body text-[10px] text-isabelline/25 text-center py-4">
                No snapshot loaded
              </p>
            )}

            {snapshot && snapshot.gate_error_2q.length > 0 && (
              <div className="mt-3 px-2">
                <div className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mt-2 mb-1">
                  2q edges
                </div>
                <div className="space-y-0.5">
                  {snapshot.gate_error_2q.map((g, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between font-mono text-[10px] text-isabelline/60"
                    >
                      <span>{g.qubits.join('–')}</span>
                      <span>{g.error.toExponential(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
