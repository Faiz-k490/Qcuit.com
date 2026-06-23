/**
 * PulsePanel — Phase 8, Pillar E
 *
 * Pulse-level (TDSE) simulator UI.
 *
 *  - Left sidebar: preset picker, envelope kind, duration / amplitude /
 *    detuning / DRAG α sliders.
 *  - Center: Bloch-sphere projection (X-Z plane) with the trajectory drawn
 *    as a path, plus a ⟨Z⟩(t) line chart.
 *  - Right: numeric summary (final state, π-pulse fidelity, integrated area).
 *
 * Calls deterministic Python at /api/pulse/{presets,preset,simulate,calibrate}.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend,
);

/* ─── Types ─────────────────────────────────────────────────────────── */

interface PresetConfig {
  name: string;
  label: string;
  envelope: 'square' | 'gaussian' | 'drag';
  envelope_kwargs: {
    duration: number;
    amplitude: number;
    sigma?: number;
  };
  duration: number;
  dt: number;
  detuning: number;
  drag_alpha: number;
  description: string;
}

interface Sample {
  t: number;
  x: number;
  y: number;
  z: number;
}

interface SimResult {
  envelope_name: string;
  duration: number;
  dt: number;
  detuning: number;
  drag_alpha: number;
  samples: Sample[];
  final_state: { c0_re: number; c0_im: number; c1_re: number; c1_im: number };
  pi_pulse_fidelity: number;
}

const PRESETS: { value: string; label: string }[] = [
  { value: 'rabi', label: 'Rabi oscillation' },
  { value: 'pi_pulse', label: 'π-pulse (gaussian)' },
  { value: 'sqrt_x', label: '√X (DRAG)' },
];

const COLORS = {
  loss: '#C5A059',
  brass: '#D4B878',
  brick: '#B85C50',
  grid: 'rgba(197,160,89,0.08)',
  tick: 'rgba(245,242,234,0.45)',
};

/* ─── Bloch projection SVG ──────────────────────────────────────────── */

interface BlochProjectionProps {
  samples: Sample[];
}

function BlochProjection({ samples }: BlochProjectionProps) {
  const R = 110;
  const cx = 140;
  const cy = 140;

  const path = samples
    .map((s, i) => {
      const px = cx + R * s.x;
      const py = cy - R * s.z; // y in SVG is flipped; ⟨Z⟩ up
      return `${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`;
    })
    .join(' ');

  const last = samples[samples.length - 1];

  return (
    <svg viewBox="0 0 280 280" className="w-full h-full">
      {/* Bloch circle */}
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="rgba(15,26,20,0.6)"
        stroke="rgba(197,160,89,0.25)"
        strokeWidth={1.5}
      />
      {/* Equator (X-Y plane ⇒ horizontal line through z=0) */}
      <line
        x1={cx - R}
        y1={cy}
        x2={cx + R}
        y2={cy}
        stroke="rgba(197,160,89,0.12)"
        strokeDasharray="3 4"
      />
      {/* Z axis */}
      <line
        x1={cx}
        y1={cy - R}
        x2={cx}
        y2={cy + R}
        stroke="rgba(197,160,89,0.12)"
        strokeDasharray="3 4"
      />
      {/* Axis labels */}
      <text x={cx} y={cy - R - 6} textAnchor="middle" fontSize={10}
        fontFamily="'JetBrains Mono', monospace" fill={COLORS.tick}>
        |0⟩
      </text>
      <text x={cx} y={cy + R + 14} textAnchor="middle" fontSize={10}
        fontFamily="'JetBrains Mono', monospace" fill={COLORS.tick}>
        |1⟩
      </text>
      <text x={cx + R + 4} y={cy + 3} fontSize={10}
        fontFamily="'JetBrains Mono', monospace" fill={COLORS.tick}>
        +X
      </text>
      <text x={cx - R - 16} y={cy + 3} fontSize={10}
        fontFamily="'JetBrains Mono', monospace" fill={COLORS.tick}>
        −X
      </text>

      {/* Trajectory path */}
      {samples.length > 1 && (
        <path
          d={path}
          stroke={COLORS.loss}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Final state dot */}
      {last && (
        <circle
          cx={cx + R * last.x}
          cy={cy - R * last.z}
          r={4}
          fill={COLORS.loss}
          stroke="#0F1A14"
          strokeWidth={1}
        />
      )}
    </svg>
  );
}

/* ─── Main panel ────────────────────────────────────────────────────── */

export default function PulsePanel() {
  const [presetName, setPresetName] = useState<string>('rabi');
  const [config, setConfig] = useState<PresetConfig | null>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Fetch preset ── */
  const fetchPreset = useCallback(async (name: string) => {
    setError(null);
    try {
      const resp = await fetch('/api/pulse/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = (await resp.json()) as PresetConfig;
      setConfig(json);
      setResult(null);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }, []);

  useEffect(() => {
    fetchPreset(presetName);
  }, [presetName, fetchPreset]);

  /* ── Run simulation ── */
  const handleRun = async () => {
    if (!config) return;
    setRunning(true);
    setError(null);
    try {
      const resp = await fetch('/api/pulse/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          envelope: config.envelope,
          envelope_kwargs: config.envelope_kwargs,
          duration: config.duration,
          dt: config.dt,
          detuning: config.detuning,
          drag_alpha: config.drag_alpha,
          n_samples: 200,
        }),
      });
      const json = (await resp.json()) as SimResult | { error: string };
      if ('error' in json) {
        setError(json.error);
      } else {
        setResult(json);
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  const updateConfig = (
    patch: Partial<Omit<PresetConfig, 'envelope_kwargs'>> & {
      envelope_kwargs?: Partial<PresetConfig['envelope_kwargs']>;
    },
  ) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...patch,
        envelope_kwargs: {
          ...prev.envelope_kwargs,
          ...(patch.envelope_kwargs ?? {}),
        },
      };
    });
  };

  /* ── Chart data ── */
  const samples = result?.samples ?? [];
  const labels = samples.map((s) => s.t.toFixed(2));
  const zData = samples.map((s) => s.z);
  const xData = samples.map((s) => s.x);
  const yData = samples.map((s) => s.y);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 } as const,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: COLORS.tick,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          boxWidth: 12,
        },
      },
      title: {
        display: true,
        text: 'Bloch components vs t',
        color: COLORS.tick,
        font: { family: "'Inter', sans-serif", size: 11 },
      },
    },
    scales: {
      x: {
        ticks: {
          color: COLORS.tick,
          font: { family: "'JetBrains Mono', monospace", size: 9 },
          maxTicksLimit: 10,
        },
        grid: { color: COLORS.grid },
      },
      y: {
        min: -1.1,
        max: 1.1,
        ticks: {
          color: COLORS.tick,
          font: { family: "'JetBrains Mono', monospace", size: 9 },
        },
        grid: { color: COLORS.grid },
      },
    },
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-vegas-gold/15 bg-forest-light/20">
        <h2 className="font-display text-base text-isabelline tracking-wide mr-auto">
          Pulse Lab
        </h2>
        <button
          onClick={handleRun}
          disabled={!config || running}
          className="px-4 py-1.5 rounded bg-vegas-gold text-deep-jungle font-body text-xs font-semibold hover:bg-brass-light disabled:opacity-40 transition-all"
        >
          {running ? 'Running…' : '▶ Run'}
        </button>
        <button
          onClick={() => fetchPreset(presetName)}
          className="px-3 py-1.5 rounded border border-vegas-gold/20 text-isabelline/50 font-body text-xs hover:text-isabelline hover:bg-vegas-gold/10 transition-all"
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Body: 3 columns ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left sidebar ── */}
        <aside className="w-72 flex-shrink-0 border-r border-vegas-gold/15 bg-forest-light/10 p-4 overflow-y-auto space-y-5">
          {/* Preset */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Preset
            </label>
            <select
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              disabled={running}
              className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-body text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {config && (
            <>
              {/* Envelope kind */}
              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Envelope
                </label>
                <select
                  value={config.envelope}
                  onChange={(e) => updateConfig({ envelope: e.target.value as PresetConfig['envelope'] })}
                  disabled={running}
                  className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-body text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
                >
                  <option value="square">square</option>
                  <option value="gaussian">gaussian</option>
                  <option value="drag">drag</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Duration
                </label>
                <input
                  type="number"
                  step={0.1}
                  min={0.1}
                  max={200}
                  value={config.duration}
                  onChange={(e) => {
                    const d = parseFloat(e.target.value) || config.duration;
                    updateConfig({ duration: d, envelope_kwargs: { duration: d } });
                  }}
                  disabled={running}
                  className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
                />
              </div>

              {/* Amplitude */}
              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Amplitude (Ω)
                </label>
                <input
                  type="number"
                  step={0.01}
                  min={-10}
                  max={10}
                  value={config.envelope_kwargs.amplitude}
                  onChange={(e) =>
                    updateConfig({
                      envelope_kwargs: {
                        amplitude: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  disabled={running}
                  className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
                />
              </div>

              {/* Detuning */}
              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Detuning (Δ)
                </label>
                <input
                  type="number"
                  step={0.01}
                  min={-10}
                  max={10}
                  value={config.detuning}
                  onChange={(e) => updateConfig({ detuning: parseFloat(e.target.value) || 0 })}
                  disabled={running}
                  className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
                />
              </div>

              {/* DRAG alpha (only for drag envelope) */}
              {config.envelope === 'drag' && (
                <div>
                  <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                    DRAG α
                  </label>
                  <input
                    type="number"
                    step={0.05}
                    min={-2}
                    max={2}
                    value={config.drag_alpha}
                    onChange={(e) => updateConfig({ drag_alpha: parseFloat(e.target.value) || 0 })}
                    disabled={running}
                    className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors"
                  />
                </div>
              )}

              <div className="px-3 py-2 border border-vegas-gold/10 rounded bg-deep-jungle/40">
                <div className="font-mono text-[9px] text-vegas-gold/50 uppercase tracking-widest mb-1">
                  About this preset
                </div>
                <p className="font-body text-[11px] text-isabelline/60 leading-relaxed">
                  {config.description}
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="px-3 py-2 border border-muted-brick/30 rounded bg-muted-brick/5">
              <p className="font-mono text-[10px] text-muted-brick/80">{error}</p>
            </div>
          )}
        </aside>

        {/* ── Center: Bloch + plot ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 gap-4">
          <div className="flex gap-4 min-h-[280px]">
            <div className="w-[280px] flex-shrink-0 bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3 flex items-center justify-center">
              {samples.length > 0 ? (
                <BlochProjection samples={samples} />
              ) : (
                <p className="font-body text-[11px] text-isabelline/30 text-center">
                  Bloch sphere
                  <br />
                  (X–Z projection)
                </p>
              )}
            </div>
            <div className="flex-1 min-h-[260px] bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3">
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: '⟨Z⟩',
                      data: zData,
                      borderColor: COLORS.loss,
                      backgroundColor: 'rgba(197,160,89,0.1)',
                      borderWidth: 1.8,
                      pointRadius: 0,
                      tension: 0.15,
                    },
                    {
                      label: '⟨X⟩',
                      data: xData,
                      borderColor: COLORS.brass,
                      backgroundColor: 'rgba(212,184,120,0.05)',
                      borderWidth: 1.3,
                      pointRadius: 0,
                      tension: 0.15,
                    },
                    {
                      label: '⟨Y⟩',
                      data: yData,
                      borderColor: COLORS.brick,
                      backgroundColor: 'rgba(184,92,80,0.05)',
                      borderWidth: 1.3,
                      pointRadius: 0,
                      tension: 0.15,
                    },
                  ],
                }}
                options={chartOptions}
              />
            </div>
          </div>

          {samples.length === 0 && !running && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-body text-sm text-isabelline/30 text-center leading-relaxed">
                Pick a preset and click <span className="text-vegas-gold/60">Run</span> to
                integrate the TDSE.
                <br />
                <span className="text-[11px]">
                  The Bloch projection draws the trajectory.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* ── Right: numeric summary ── */}
        <aside className="w-64 flex-shrink-0 border-l border-vegas-gold/15 bg-forest-light/10 flex flex-col">
          <div className="px-3 py-2 border-b border-vegas-gold/10">
            <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
              Result
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {result ? (
              <>
                <div className="px-3 py-2.5 border border-vegas-gold/25 rounded bg-vegas-gold/5">
                  <div className="font-mono text-[10px] text-vegas-gold uppercase tracking-widest mb-1">
                    π-pulse fidelity
                  </div>
                  <div className="font-mono text-sm text-isabelline">
                    {result.pi_pulse_fidelity.toFixed(6)}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1">
                    Final state
                  </div>
                  <pre className="font-mono text-[10px] text-isabelline/70 whitespace-pre-wrap leading-relaxed">
{`c₀ = ${result.final_state.c0_re.toFixed(4)} ${result.final_state.c0_im >= 0 ? '+' : '-'} ${Math.abs(result.final_state.c0_im).toFixed(4)}i
c₁ = ${result.final_state.c1_re.toFixed(4)} ${result.final_state.c1_im >= 0 ? '+' : '-'} ${Math.abs(result.final_state.c1_im).toFixed(4)}i`}
                  </pre>
                </div>
                <div className="font-mono text-[10px] text-isabelline/40 leading-relaxed">
                  Δ = {result.detuning.toFixed(3)} · dt = {result.dt.toFixed(4)} ·{' '}
                  {result.samples.length} samples
                </div>
              </>
            ) : (
              <p className="font-body text-[10px] text-isabelline/25 text-center py-4">
                No run yet
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
