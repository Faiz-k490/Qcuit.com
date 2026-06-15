/**
 * TrainerPanel — Phase 5, Pillar C
 *
 * Differentiable simulator UI with:
 *  - Left sidebar: preset picker, optimizer, hyperparameters
 *  - Center: live cost-curve + gradient-norm charts (Chart.js)
 *  - Right: scrollable per-iteration log (collapsible)
 *
 * Streams from POST /api/trainer/run via useSSEStream.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useSSEStream } from '../../hooks/useSSEStream';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/* ─── Types ───────────────────────────────────────────── */

interface PresetConfig {
  ansatz_name: string;
  ansatz_kwargs?: Record<string, unknown>;
  num_params: number;
  num_qubits: number;
  optimizer?: { name?: string; type?: string; lr: number };
  optimizer_config?: { name?: string; type?: string; lr: number };
  max_iter: number;
  init_params: number[];
  seed?: number;
}

interface TrainEvent {
  iter?: number;
  loss?: number;
  params?: number[];
  grad_norm?: number;
  done?: boolean;
  final_loss?: number;
  final_params?: number[];
}

type PresetName = 'vqe_h2' | 'qaoa_maxcut' | 'bloch_state_fit';

const PRESETS: { value: PresetName; label: string }[] = [
  { value: 'vqe_h2', label: 'VQE — H₂ molecule' },
  { value: 'qaoa_maxcut', label: 'QAOA — MaxCut' },
  { value: 'bloch_state_fit', label: 'Bloch state fit' },
];

const PRESET_VALUES: PresetName[] = PRESETS.map((preset) => preset.value);

function getInitialPreset(): PresetName {
  const value = new URLSearchParams(window.location.search).get('preset') as PresetName | null;
  return value && PRESET_VALUES.includes(value) ? value : 'vqe_h2';
}

/* ─── Chart options ───────────────────────────────────── */

const CHART_COLORS = {
  loss: '#C5A059',        // vegas-gold
  gradNorm: '#D4B878',    // brass-light
  gridLine: 'rgba(197,160,89,0.08)',
  tickText: 'rgba(245,242,234,0.45)',
};

function makeCostChartOptions(title: string, yLabel: string) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 } as const,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: title,
        color: CHART_COLORS.tickText,
        font: { family: "'Inter', sans-serif", size: 11 },
        padding: { bottom: 6 },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Iteration',
          color: CHART_COLORS.tickText,
          font: { family: "'Inter', sans-serif", size: 10 },
        },
        grid: { color: CHART_COLORS.gridLine },
        ticks: {
          color: CHART_COLORS.tickText,
          font: { family: "'JetBrains Mono', monospace", size: 9 },
          maxTicksLimit: 12,
        },
      },
      y: {
        title: {
          display: true,
          text: yLabel,
          color: CHART_COLORS.tickText,
          font: { family: "'Inter', sans-serif", size: 10 },
        },
        grid: { color: CHART_COLORS.gridLine },
        ticks: {
          color: CHART_COLORS.tickText,
          font: { family: "'JetBrains Mono', monospace", size: 9 },
        },
      },
    },
  };
}

/* ─── Component ───────────────────────────────────────── */

export default function TrainerPanel() {
  /* ── Preset & config state ── */
  const [presetName, setPresetName] = useState<PresetName>(() => getInitialPreset());
  const [preset, setPreset] = useState<PresetConfig | null>(null);
  const [optimizer, setOptimizer] = useState<'sgd' | 'adam'>('adam');
  const [lr, setLr] = useState<number>(0.1);
  const [maxIter, setMaxIter] = useState<number>(100);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);

  /* ── Log panel visibility ── */
  const [showLog, setShowLog] = useState(true);
  const autoRunRef = useRef(new URLSearchParams(window.location.search).get('run') === '1');

  /* ── SSE stream ── */
  const { data, isStreaming, error: streamError, start, stop } =
    useSSEStream<TrainEvent>();

  /* ── Derived chart data ── */
  const iterEvents = data.filter((e) => e.iter !== undefined && !e.done);
  const labels = iterEvents.map((e) => String(e.iter));
  const lossData = iterEvents.map((e) => e.loss ?? 0);
  const gradData = iterEvents.map((e) => e.grad_norm ?? 0);

  const finalEvent = data.find((e) => e.done);

  const logRef = useRef<HTMLDivElement>(null);

  /* ── Fetch preset on mount / change ── */
  const fetchPreset = useCallback(async (name: PresetName) => {
    setPresetLoading(true);
    setPresetError(null);
    try {
      const resp = await fetch('/api/trainer/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const cfg: PresetConfig = await resp.json();
      setPreset(cfg);
      const optCfg: { name?: string; type?: string; lr?: number } =
        cfg.optimizer ?? cfg.optimizer_config ?? {};
      const optName = (optCfg.name ?? optCfg.type ?? 'adam').toLowerCase();
      setOptimizer((optName === 'sgd' ? 'sgd' : 'adam'));
      setLr(optCfg.lr ?? 0.1);
      setMaxIter(cfg.max_iter ?? 100);
    } catch (err: any) {
      setPresetError(err.message || 'Failed to load preset');
    } finally {
      setPresetLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreset(presetName);
  }, [presetName, fetchPreset]);

  /* ── Actions ── */
  const handleRun = useCallback(() => {
    if (!preset) return;
    // Send preset name + per-field overrides — the backend resolves the
    // ansatz / observable / init_params internally.
    start('/api/trainer/run', {
      preset: presetName,
      seed: preset.seed ?? 42,
      optimizer: { type: optimizer, lr },
      max_iter: maxIter,
      init_params: preset.init_params,
    });
  }, [lr, maxIter, optimizer, preset, presetName, start]);

  const handleReset = () => {
    stop();
    // Re-trigger a fresh data clear by restarting with the same preset
    fetchPreset(presetName);
  };

  useEffect(() => {
    if (!autoRunRef.current || !preset || isStreaming) return;
    autoRunRef.current = false;
    handleRun();
  }, [handleRun, isStreaming, preset]);

  /* ── Auto-scroll log ── */
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0; // newest at top
    }
  }, [data.length]);

  /* ── Render ── */
  return (
    <div className="flex flex-col h-full -mx-8 -mt-0">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-vegas-gold/15 bg-forest-light/20">
        <h2 className="font-display text-base text-isabelline tracking-wide mr-auto">
          Trainer
        </h2>

        <button
          onClick={handleRun}
          disabled={isStreaming || !preset}
          className="px-4 py-1.5 rounded bg-vegas-gold text-deep-jungle font-body text-xs font-semibold hover:bg-brass-light disabled:opacity-40 transition-all"
        >
          {isStreaming ? 'Running…' : '▶ Run'}
        </button>
        <button
          onClick={stop}
          disabled={!isStreaming}
          className="px-3 py-1.5 rounded border border-muted-brick/40 text-muted-brick/80 font-body text-xs hover:bg-muted-brick/10 disabled:opacity-30 transition-all"
        >
          ■ Stop
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded border border-vegas-gold/20 text-isabelline/50 font-body text-xs hover:text-isabelline hover:bg-vegas-gold/10 transition-all"
        >
          ↺ Reset
        </button>
      </div>

      {/* ── Body: 3 columns ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ── Left sidebar ── */}
        <aside className="w-72 flex-shrink-0 border-r border-vegas-gold/15 bg-forest-light/10 p-4 overflow-y-auto space-y-5">
          {/* Preset picker */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Preset
            </label>
            <select
              value={presetName}
              onChange={(e) => setPresetName(e.target.value as PresetName)}
              disabled={isStreaming}
              className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-body text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors disabled:opacity-50"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {presetLoading && (
              <p className="font-mono text-[10px] text-vegas-gold/40 mt-1">
                Loading…
              </p>
            )}
            {presetError && (
              <p className="font-mono text-[10px] text-muted-brick/80 mt-1">
                {presetError}
              </p>
            )}
          </div>

          {/* Optimizer */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Optimizer
            </label>
            <div className="flex gap-3">
              {(['sgd', 'adam'] as const).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="optimizer"
                    checked={optimizer === opt}
                    onChange={() => setOptimizer(opt)}
                    disabled={isStreaming}
                    className="accent-vegas-gold"
                  />
                  <span className="font-body text-xs text-isabelline/70 uppercase">
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Learning rate */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Learning rate
            </label>
            <input
              type="number"
              step={0.001}
              min={0.0001}
              max={10}
              value={lr}
              onChange={(e) => setLr(parseFloat(e.target.value) || 0.1)}
              disabled={isStreaming}
              className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Max iterations */}
          <div>
            <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
              Max iterations
            </label>
            <input
              type="number"
              step={1}
              min={1}
              max={10000}
              value={maxIter}
              onChange={(e) =>
                setMaxIter(parseInt(e.target.value, 10) || 100)
              }
              disabled={isStreaming}
              className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Initial params (read-only) */}
          {preset && (
            <div>
              <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                Init params ({preset.num_params})
              </label>
              <div className="bg-deep-jungle/60 border border-vegas-gold/10 rounded p-2 max-h-28 overflow-y-auto">
                <pre className="font-mono text-[10px] text-isabelline/50 whitespace-pre-wrap break-all leading-relaxed">
                  [{preset.init_params.map((p) => p.toFixed(4)).join(', ')}]
                </pre>
              </div>
              <p className="font-body text-[10px] text-isabelline/30 mt-1">
                {preset.ansatz_name} · {preset.num_qubits} qubits
              </p>
            </div>
          )}

          {/* Final result */}
          {finalEvent && (
            <div className="px-3 py-2.5 border border-vegas-gold/25 rounded bg-vegas-gold/5">
              <div className="font-mono text-[10px] text-vegas-gold uppercase tracking-widest mb-1">
                Training Complete
              </div>
              <div className="font-mono text-xs text-isabelline/80">
                Final loss:{' '}
                <span className="text-vegas-gold font-semibold">
                  {finalEvent.final_loss?.toFixed(6)}
                </span>
              </div>
            </div>
          )}

          {streamError && (
            <div className="px-3 py-2 border border-muted-brick/30 rounded bg-muted-brick/5">
              <p className="font-mono text-[10px] text-muted-brick/80">
                {streamError}
              </p>
            </div>
          )}
        </aside>

        {/* ── Center: charts ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 gap-4">
          {/* Cost curve */}
          <div className="flex-1 min-h-[220px] bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3">
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: 'Loss',
                    data: lossData,
                    borderColor: CHART_COLORS.loss,
                    backgroundColor: 'rgba(197,160,89,0.1)',
                    borderWidth: 2,
                    pointRadius: lossData.length > 80 ? 0 : 2,
                    pointBackgroundColor: CHART_COLORS.loss,
                    tension: 0.2,
                    fill: true,
                  },
                ],
              }}
              options={makeCostChartOptions('Cost Curve', 'Loss')}
            />
          </div>

          {/* Gradient norm */}
          <div className="min-h-[160px] h-[200px] bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3">
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: 'Grad Norm',
                    data: gradData,
                    borderColor: CHART_COLORS.gradNorm,
                    backgroundColor: 'rgba(212,184,120,0.08)',
                    borderWidth: 1.5,
                    pointRadius: gradData.length > 80 ? 0 : 1.5,
                    pointBackgroundColor: CHART_COLORS.gradNorm,
                    tension: 0.2,
                    fill: true,
                  },
                ],
              }}
              options={makeCostChartOptions('Gradient Norm', '‖∇L‖')}
            />
          </div>

          {iterEvents.length === 0 && !isStreaming && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-body text-sm text-isabelline/30 text-center leading-relaxed">
                Select a preset and click <span className="text-vegas-gold/60">Run</span> to
                start training.
                <br />
                <span className="text-[11px]">
                  Cost curve and gradient norm will stream live.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* ── Right: iteration log (collapsible) ── */}
        {showLog && (
          <aside className="w-72 flex-shrink-0 border-l border-vegas-gold/15 bg-forest-light/10 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-vegas-gold/10">
              <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
                Iteration Log
              </span>
              <button
                onClick={() => setShowLog(false)}
                className="text-isabelline/30 hover:text-isabelline/60 text-xs transition-colors"
                title="Collapse log"
              >
                ✕
              </button>
            </div>
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto p-2 space-y-px"
            >
              {[...iterEvents].reverse().map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-vegas-gold/5 transition-colors"
                >
                  <span className="font-mono text-[10px] text-vegas-gold/60 w-8 text-right flex-shrink-0">
                    {e.iter}
                  </span>
                  <span className="font-mono text-[10px] text-isabelline/60 flex-1 truncate">
                    loss={e.loss?.toFixed(5)}
                  </span>
                  <span className="font-mono text-[10px] text-isabelline/35 flex-shrink-0">
                    ∇{e.grad_norm?.toFixed(4)}
                  </span>
                </div>
              ))}
              {iterEvents.length === 0 && (
                <p className="font-body text-[10px] text-isabelline/25 text-center py-4">
                  No iterations yet
                </p>
              )}
            </div>
          </aside>
        )}

        {/* Collapsed log toggle */}
        {!showLog && (
          <button
            onClick={() => setShowLog(true)}
            className="w-8 flex-shrink-0 border-l border-vegas-gold/15 bg-forest-light/10 flex items-center justify-center hover:bg-vegas-gold/5 transition-colors"
            title="Show iteration log"
          >
            <span className="font-mono text-[10px] text-vegas-gold/40 rotate-90 whitespace-nowrap">
              Log ▶
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
