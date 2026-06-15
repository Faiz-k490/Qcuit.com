/**
 * QNNPanel — Phase 6, Pillar D
 *
 * Quantum Neural Network designer with:
 *  - Left sidebar: preset, encoder + ansatz summary, optimizer, lr, max_iter
 *  - Center: live loss + accuracy charts, decision-boundary heatmap (2D),
 *            data scatter, export code blocks
 *  - Right: per-iteration log
 *
 * Streams from POST /api/qnn/train via useSSEStream.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Legend,
);

/* ─── Types ─────────────────────────────────────────────────────────────── */

type PresetName = 'xor' | 'parity' | 'moons';

interface PresetConfig {
  name: PresetName;
  encoder: { name: string; num_qubits: number; feature_dim: number };
  ansatz: { name: string; num_qubits: number; num_params: number };
  dataset: {
    name: string;
    feature_dim: number;
    num_samples: number;
    X: number[][];
    y: number[];
  };
  init_theta: number[];
  num_params: number;
  num_qubits: number;
  optimizer: { type?: string; name?: string; lr: number };
  max_iter: number;
  seed: number;
}

interface TrainEvent {
  iter?: number;
  loss?: number;
  accuracy?: number;
  params?: number[];
  grad_norm?: number;
  done?: boolean;
  final_loss?: number;
  final_accuracy?: number;
  final_params?: number[];
}

const PRESETS: { value: PresetName; label: string }[] = [
  { value: 'xor', label: 'XOR — 2 qubits, angle' },
  { value: 'parity', label: 'Parity — 3 qubits' },
  { value: 'moons', label: 'Two moons — ZZ feature map' },
];

const PRESET_VALUES: PresetName[] = PRESETS.map((preset) => preset.value);

function getInitialPreset(): PresetName {
  const value = new URLSearchParams(window.location.search).get('preset') as PresetName | null;
  return value && PRESET_VALUES.includes(value) ? value : 'xor';
}

/* ─── Chart options ─────────────────────────────────────────────────────── */

const CHART_COLORS = {
  loss: '#C5A059',
  acc: '#A8C25E',
  gridLine: 'rgba(197,160,89,0.08)',
  tickText: 'rgba(245,242,234,0.45)',
};

function makeChartOptions(title: string, yLabel: string, yMin?: number, yMax?: number) {
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
        ...(yMin !== undefined ? { min: yMin } : {}),
        ...(yMax !== undefined ? { max: yMax } : {}),
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

/* ─── Decision-boundary heatmap (2D only) ──────────────────────────────── */

function DecisionBoundary({
  preset,
  dataset,
  values,
  resolution,
}: {
  preset: PresetName;
  dataset: PresetConfig['dataset'];
  values: number[] | null;
  resolution: number;
}) {
  if (!values || values.length === 0) return null;
  const W = 240;
  const H = 240;
  const cell = W / resolution;

  const pi = Math.PI;
  const cells: React.ReactElement[] = [];
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const v = values[i * resolution + j] ?? 0;
      // v in [-1, 1] → color from muted-brick (-1) → vegas-gold (+1)
      const t = (v + 1) / 2;
      const r = Math.round(120 + t * (197 - 120));
      const g = Math.round(50 + t * (160 - 50));
      const b = Math.round(40 + t * (89 - 40));
      cells.push(
        <rect
          key={`${i}-${j}`}
          x={j * cell}
          y={(resolution - 1 - i) * cell}
          width={cell}
          height={cell}
          fill={`rgb(${r},${g},${b})`}
          opacity={0.55}
        />,
      );
    }
  }
  // Sample dots
  const dots = dataset.X.map((xy, k) => {
    const px = (xy[0] / pi) * W;
    const py = H - (xy[1] / pi) * H;
    const yk = dataset.y[k];
    return (
      <circle
        key={`dot-${k}`}
        cx={px}
        cy={py}
        r={3.5}
        fill={yk > 0 ? '#F5F2EA' : '#1A2D24'}
        stroke="#000"
        strokeWidth={0.6}
      />
    );
  });
  return (
    <div className="flex flex-col items-start gap-2">
      <span className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest">
        Decision boundary · {preset}
      </span>
      <svg width={W} height={H} className="border border-vegas-gold/15 rounded">
        {cells}
        {dots}
      </svg>
      <span className="font-mono text-[9px] text-isabelline/35">
        x ∈ [0, π]² · light = +1 prediction
      </span>
    </div>
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function QNNPanel() {
  const [presetName, setPresetName] = useState<PresetName>(() => getInitialPreset());
  const [preset, setPreset] = useState<PresetConfig | null>(null);
  const [optimizer, setOptimizer] = useState<'sgd' | 'adam'>('adam');
  const [lr, setLr] = useState<number>(0.15);
  const [maxIter, setMaxIter] = useState<number>(25);
  const [presetLoading, setPresetLoading] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);

  const [showLog, setShowLog] = useState(true);
  const [boundaryValues, setBoundaryValues] = useState<number[] | null>(null);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [exportCode, setExportCode] = useState<{ pennylane?: string; qiskit?: string }>({});
  const [activeBottomTab, setActiveBottomTab] = useState<'boundary' | 'export'>('boundary');
  const autoRunRef = useRef(new URLSearchParams(window.location.search).get('run') === '1');

  const { data, isStreaming, error: streamError, start, stop } = useSSEStream<TrainEvent>();

  const iterEvents = data.filter((e) => e.iter !== undefined && !e.done);
  const labels = iterEvents.map((e) => String(e.iter));
  const lossData = iterEvents.map((e) => e.loss ?? 0);
  const accData = iterEvents.map((e) => e.accuracy ?? 0);
  const finalEvent = data.find((e) => e.done);

  const logRef = useRef<HTMLDivElement>(null);

  /* ── Fetch preset on mount / change ── */
  const fetchPreset = useCallback(async (name: PresetName) => {
    setPresetLoading(true);
    setPresetError(null);
    setBoundaryValues(null);
    setExportCode({});
    try {
      const resp = await fetch('/api/qnn/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const cfg: PresetConfig = await resp.json();
      setPreset(cfg);
      const optName = (cfg.optimizer.type ?? cfg.optimizer.name ?? 'adam').toLowerCase();
      setOptimizer(optName === 'sgd' ? 'sgd' : 'adam');
      setLr(cfg.optimizer.lr ?? 0.15);
      setMaxIter(cfg.max_iter ?? 25);
    } catch (err: any) {
      setPresetError(err.message || 'Failed to load preset');
    } finally {
      setPresetLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreset(presetName);
  }, [presetName, fetchPreset]);

  /* ── Train ── */
  const handleRun = useCallback(() => {
    if (!preset) return;
    setBoundaryValues(null);
    setExportCode({});
    start('/api/qnn/train', {
      preset: presetName,
      seed: preset.seed ?? 42,
      optimizer: { type: optimizer, lr },
      max_iter: maxIter,
      init_theta: preset.init_theta,
    });
  }, [lr, maxIter, optimizer, preset, presetName, start]);

  const handleReset = () => {
    stop();
    fetchPreset(presetName);
  };

  useEffect(() => {
    if (!autoRunRef.current || !preset || isStreaming) return;
    autoRunRef.current = false;
    handleRun();
  }, [handleRun, isStreaming, preset]);

  /* ── On training complete: fetch decision boundary + export code ── */
  useEffect(() => {
    if (!finalEvent || !preset) return;
    const finalTheta = finalEvent.final_params ?? preset.init_theta;
    if (preset.dataset.feature_dim === 2) {
      void (async () => {
        setBoundaryLoading(true);
        try {
          const resolution = 24;
          const grid: number[][] = [];
          for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
              grid.push([
                (j / (resolution - 1)) * Math.PI,
                (i / (resolution - 1)) * Math.PI,
              ]);
            }
          }
          const resp = await fetch('/api/qnn/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preset: presetName,
              theta: finalTheta,
              x: grid,
            }),
          });
          if (resp.ok) {
            const body = await resp.json();
            setBoundaryValues(body.values as number[]);
          }
        } finally {
          setBoundaryLoading(false);
        }
      })();
    }

    // Fetch both export code blobs in parallel.
    void (async () => {
      const fetchExport = async (framework: 'pennylane' | 'qiskit_ml') => {
        const resp = await fetch('/api/qnn/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preset: presetName,
            theta: finalTheta,
            framework,
          }),
        });
        if (!resp.ok) return null;
        const body = await resp.json();
        return body.code as string;
      };
      const [pl, qk] = await Promise.all([
        fetchExport('pennylane'),
        fetchExport('qiskit_ml'),
      ]);
      setExportCode({
        pennylane: pl ?? undefined,
        qiskit: qk ?? undefined,
      });
    })();
  }, [finalEvent, preset, presetName]);

  /* ── Render ── */
  return (
    <div className="flex flex-col h-full -mx-8 -mt-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-vegas-gold/15 bg-forest-light/20">
        <h2 className="font-display text-base text-isabelline tracking-wide mr-auto">
          QNN Workbench
        </h2>
        <button
          onClick={handleRun}
          disabled={isStreaming || !preset}
          className="px-4 py-1.5 rounded bg-vegas-gold text-deep-jungle font-body text-xs font-semibold hover:bg-brass-light disabled:opacity-40 transition-all"
        >
          {isStreaming ? 'Training…' : '▶ Train'}
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

      {/* Body: 3 columns */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-vegas-gold/15 bg-forest-light/10 p-4 overflow-y-auto space-y-5">
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
              <p className="font-mono text-[10px] text-vegas-gold/40 mt-1">Loading…</p>
            )}
            {presetError && (
              <p className="font-mono text-[10px] text-muted-brick/80 mt-1">{presetError}</p>
            )}
          </div>

          {preset && (
            <>
              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Architecture
                </label>
                <div className="bg-deep-jungle/60 border border-vegas-gold/10 rounded p-2 space-y-1">
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-vegas-gold/60">encoder</span>
                    <span className="text-isabelline/70">{preset.encoder.name}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-vegas-gold/60">ansatz</span>
                    <span className="text-isabelline/70">{preset.ansatz.name}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-vegas-gold/60">qubits</span>
                    <span className="text-isabelline/70">{preset.num_qubits}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-vegas-gold/60">params</span>
                    <span className="text-isabelline/70">{preset.num_params}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[10px]">
                    <span className="text-vegas-gold/60">samples</span>
                    <span className="text-isabelline/70">{preset.dataset.num_samples}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Optimizer
                </label>
                <div className="flex gap-3">
                  {(['sgd', 'adam'] as const).map((opt) => (
                    <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="qnn-optimizer"
                        checked={optimizer === opt}
                        onChange={() => setOptimizer(opt)}
                        disabled={isStreaming}
                        className="accent-vegas-gold"
                      />
                      <span className="font-body text-xs text-isabelline/70 uppercase">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Learning rate
                </label>
                <input
                  type="number"
                  step={0.01}
                  min={0.001}
                  max={10}
                  value={lr}
                  onChange={(e) => setLr(parseFloat(e.target.value) || 0.15)}
                  disabled={isStreaming}
                  className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-1.5">
                  Max iterations
                </label>
                <input
                  type="number"
                  step={1}
                  min={1}
                  max={500}
                  value={maxIter}
                  onChange={(e) => setMaxIter(parseInt(e.target.value, 10) || 25)}
                  disabled={isStreaming}
                  className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/60 border border-vegas-gold/20 text-isabelline/80 font-mono text-xs focus:outline-none focus:border-vegas-gold/50 transition-colors disabled:opacity-50"
                />
              </div>
            </>
          )}

          {finalEvent && (
            <div className="px-3 py-2.5 border border-vegas-gold/25 rounded bg-vegas-gold/5">
              <div className="font-mono text-[10px] text-vegas-gold uppercase tracking-widest mb-1">
                Training Complete
              </div>
              <div className="font-mono text-xs text-isabelline/80">
                Final loss:{' '}
                <span className="text-vegas-gold font-semibold">
                  {finalEvent.final_loss?.toFixed(5)}
                </span>
              </div>
              <div className="font-mono text-xs text-isabelline/80">
                Accuracy:{' '}
                <span className="text-vegas-gold font-semibold">
                  {((finalEvent.final_accuracy ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {streamError && (
            <div className="px-3 py-2 border border-muted-brick/30 rounded bg-muted-brick/5">
              <p className="font-mono text-[10px] text-muted-brick/80">{streamError}</p>
            </div>
          )}
        </aside>

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 gap-4">
          <div className="flex-1 min-h-[200px] bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3">
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
                    pointRadius: lossData.length > 60 ? 0 : 2,
                    tension: 0.2,
                    fill: true,
                  },
                ],
              }}
              options={makeChartOptions('Loss (MSE)', 'Loss')}
            />
          </div>

          <div className="min-h-[170px] h-[200px] bg-deep-jungle/40 border border-vegas-gold/10 rounded p-3">
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: 'Accuracy',
                    data: accData,
                    borderColor: CHART_COLORS.acc,
                    backgroundColor: 'rgba(168,194,94,0.1)',
                    borderWidth: 2,
                    pointRadius: accData.length > 60 ? 0 : 2,
                    tension: 0.2,
                    fill: true,
                  },
                ],
              }}
              options={makeChartOptions('Accuracy', 'acc', 0, 1)}
            />
          </div>

          {/* Bottom panel: tabs for boundary + export */}
          <div className="border border-vegas-gold/10 rounded">
            <div className="flex gap-1 border-b border-vegas-gold/10 px-2 py-1.5">
              {(['boundary', 'export'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveBottomTab(tab)}
                  className={`px-3 py-1 rounded font-body text-[11px] uppercase tracking-wide transition-colors ${
                    activeBottomTab === tab
                      ? 'bg-vegas-gold/15 text-vegas-gold'
                      : 'text-isabelline/40 hover:text-isabelline/70'
                  }`}
                >
                  {tab === 'boundary' ? 'Decision boundary' : 'Export code'}
                </button>
              ))}
            </div>
            <div className="p-3">
              {activeBottomTab === 'boundary' && (
                <div className="flex items-start gap-4">
                  {preset?.dataset.feature_dim === 2 ? (
                    boundaryValues ? (
                      <DecisionBoundary
                        preset={presetName}
                        dataset={preset.dataset}
                        values={boundaryValues}
                        resolution={24}
                      />
                    ) : (
                      <p className="font-body text-[11px] text-isabelline/30">
                        {boundaryLoading
                          ? 'Computing decision boundary…'
                          : finalEvent
                          ? 'No boundary yet.'
                          : 'Train the model to see its decision boundary.'}
                      </p>
                    )
                  ) : (
                    <p className="font-body text-[11px] text-isabelline/40">
                      Decision boundary heatmap is shown for 2D inputs only
                      (current dataset is {preset?.dataset.feature_dim}D).
                    </p>
                  )}
                </div>
              )}
              {activeBottomTab === 'export' && (
                <div className="space-y-3">
                  {!finalEvent && (
                    <p className="font-body text-[11px] text-isabelline/30">
                      Train the model to generate exportable PennyLane and Qiskit-ML code.
                    </p>
                  )}
                  {exportCode.pennylane && (
                    <div>
                      <div className="font-mono text-[10px] text-vegas-gold/60 uppercase tracking-widest mb-1">
                        PennyLane
                      </div>
                      <pre className="bg-deep-jungle/60 border border-vegas-gold/10 rounded p-3 font-mono text-[10px] text-isabelline/75 leading-snug overflow-x-auto whitespace-pre">
                        {exportCode.pennylane}
                      </pre>
                    </div>
                  )}
                  {exportCode.qiskit && (
                    <div>
                      <div className="font-mono text-[10px] text-vegas-gold/60 uppercase tracking-widest mb-1">
                        Qiskit Machine Learning
                      </div>
                      <pre className="bg-deep-jungle/60 border border-vegas-gold/10 rounded p-3 font-mono text-[10px] text-isabelline/75 leading-snug overflow-x-auto whitespace-pre">
                        {exportCode.qiskit}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {iterEvents.length === 0 && !isStreaming && (
            <div className="flex-1 flex items-center justify-center">
              <p className="font-body text-sm text-isabelline/30 text-center leading-relaxed">
                Choose a preset and click <span className="text-vegas-gold/60">Train</span> to start.
                <br />
                <span className="text-[11px]">
                  Loss + accuracy stream live; decision boundary appears on completion.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Right: log */}
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
            <div ref={logRef} className="flex-1 overflow-y-auto p-2 space-y-px">
              {[...iterEvents].reverse().map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-vegas-gold/5 transition-colors"
                >
                  <span className="font-mono text-[10px] text-vegas-gold/60 w-7 text-right flex-shrink-0">
                    {e.iter}
                  </span>
                  <span className="font-mono text-[10px] text-isabelline/60 flex-1 truncate">
                    L={e.loss?.toFixed(4)}
                  </span>
                  <span className="font-mono text-[10px] text-isabelline/35 flex-shrink-0">
                    a={(e.accuracy ?? 0).toFixed(2)}
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
