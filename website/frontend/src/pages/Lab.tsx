/**
 * Qcuit Research Lab — browser companion for the pip library.
 *
 * All six pillars now have working panels backed by deterministic Python:
 *  - Noise Lab    (Phase 2, Pillar B) — vendor-calibrated error budget
 *  - Trainer      (Phase 5, Pillar C) — differentiable QML trainer
 *  - QNN Workbench (Phase 6, Pillar D) — quantum neural networks
 *  - Notebook     (Phase 3, Pillar E) — reproducibility index
 *  - QEC Sandbox  (Phase 7, Pillar F) — stabiliser codes + decoders
 *  - Pulse Lab    (Phase 8, Pillar E) — TDSE Bloch trajectories
 *
 * Each tab links to its `/api/<pillar>/...` blueprint and renders the
 * matching panel component from `./lab/`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { IconFlask2 } from '@tabler/icons-react';
import { SiteNav } from '../components/SiteNav';
import { useMode } from '../hooks/useMode';
import { NotebookPanel } from './lab/NotebookPanel';
import TrainerPanel from './lab/TrainerPanel';
import QNNPanel from './lab/QNNPanel';
import QECPanel from './lab/QECPanel';
import PulsePanel from './lab/PulsePanel';
import NoisePanel from './lab/NoisePanel';

// ─── Tabs ───────────────────────────────────────────────────────────
interface LabTab {
  id: string;
  label: string;
  caption: string;
  status: 'available' | 'planned';
  description: string;
  bullets: string[];
}

const TABS: LabTab[] = [
  {
    id: 'noise',
    label: 'Noise Lab',
    caption: 'Vendor-calibrated noise models',
    status: 'available',
    description:
      'Apply per-qubit, per-gate Kraus channels from real device snapshots (T1, T2, gate error, readout). Visualise the error budget per circuit and per gate.',
    bullets: [
      'IBM / IonQ / Quantinuum calibration JSON snapshots',
      'Live error budget breakdown',
      'Fidelity vs depth plots, exportable',
    ],
  },
  {
    id: 'trainer',
    label: 'QML Trainer',
    caption: 'Differentiable quantum models',
    status: 'available',
    description:
      'Parameter-shift autograd over the statevector kernel. Run VQE, QAOA, state-fitting, and QML training experiments from the browser companion.',
    bullets: [
      'Live cost curve + parameter trajectory',
      'Built-in: VQE-H2, QAOA-MaxCut, Bloch state-fit',
      'Reproducible — same seed gives same trajectory',
    ],
  },
  {
    id: 'qnn',
    label: 'QNN Workbench',
    caption: 'Quantum neural networks',
    status: 'available',
    description:
      'Build, train, and export quantum neural networks. Use encoders and variational ansätze that mirror qcuit.models and export PennyLane or Qiskit-ML code.',
    bullets: [
      'Encoders: angle · amplitude · ZZ-feature-map',
      'Ansätze: hardware-efficient · real-amplitudes',
      'Datasets: XOR · parity · two-moons · blobs',
      'Exports: PennyLane · Qiskit Machine Learning',
    ],
  },
  {
    id: 'notebook',
    label: 'Notebook',
    caption: 'Reproducibility index',
    status: 'available',
    description:
      'Every circuit + noise + result is a single hashed JSON blob with a citable URL and an auto-generated BibTeX snippet.',
    bullets: [
      'SHA-256 hash per run',
      'BibTeX export',
      'Benchmark gallery: Bell · GHZ · QFT · Grover · VQE-H2',
    ],
  },
  {
    id: 'qec',
    label: 'QEC',
    caption: 'Error correction sandbox',
    status: 'available',
    description:
      'Browser-native stabiliser simulator for repetition, Steane, Shor, and distance-3 rotated surface codes. Inject errors, watch syndromes light up, see decoding in real time.',
    bullets: [
      'Repetition · Steane 7 · Shor 9 · Surface d=3',
      'Live syndrome visualiser',
      'MWPM-style decoder',
    ],
  },
  {
    id: 'pulse',
    label: 'Pulse Lab',
    caption: 'Below the circuit abstraction',
    status: 'available',
    description:
      'TDSE-driven Rabi widget that connects the Bloch sphere to a real Hamiltonian + drive pulse. Build your own √X.',
    bullets: [
      '2-level TDSE solver',
      'Gaussian / square / DRAG drive pulses',
      'Bloch sphere trajectory + ⟨X,Y,Z⟩(t) plot',
    ],
  },
];

// ─── Tab pill ───────────────────────────────────────────────────────
function TabPill({
  tab,
  active,
  onClick,
}: {
  tab: LabTab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-sm border transition-all ${
        active
          ? 'border-vegas-gold/40 bg-vegas-gold/10'
          : 'border-vegas-gold/10 bg-forest-light/20 hover:border-vegas-gold/25 hover:bg-vegas-gold/5'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`font-display text-sm tracking-wide ${
            active ? 'text-vegas-gold' : 'text-isabelline/80'
          }`}
        >
          {tab.label}
        </span>
        <span
          className={`ml-auto font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
            tab.status === 'available'
              ? 'bg-vegas-gold/20 text-vegas-gold'
              : 'bg-isabelline/5 text-isabelline/40'
          }`}
        >
          {tab.status === 'available' ? 'Live' : 'Soon'}
        </span>
      </div>
      <div className="font-body text-[10px] text-isabelline/40 mt-0.5">
        {tab.caption}
      </div>
    </button>
  );
}

// ─── Main shell ─────────────────────────────────────────────────────
export function Lab() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const [, setMode] = useMode();
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const applyUrlTab = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const tabId = params.get('tab');
    if (tabId && TABS.some((candidate) => candidate.id === tabId)) {
      setActiveTab(tabId);
    }
  }, []);

  useEffect(() => {
    applyUrlTab();
    window.addEventListener('popstate', applyUrlTab);
    return () => window.removeEventListener('popstate', applyUrlTab);
  }, [applyUrlTab]);

  const navigateToVisualizer = () => {
    setMode('build');
    window.history.pushState({}, '', '/visualizer');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-deep-jungle text-isabelline flex flex-col">
      <SiteNav active="lab" />

      <header className="border-b border-vegas-gold/10 px-5 py-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 border border-vegas-gold/25 px-3 py-2 text-vegas-gold">
              <IconFlask2 size={18} stroke={1.7} />
              <span className="font-mono text-xs">QML Lab · browser checks for package workflows</span>
            </div>
            <h1 className="font-display text-3xl leading-tight text-isabelline md:text-5xl">
              Local QML workbench for Qcuit experiments.
            </h1>
          </div>
          <p className="font-body text-sm leading-7 text-isabelline/62 md:text-base">
            These panels mirror importable Qcuit modules: quantum neural networks, parameter-shift
            trainers, noise models, notebook artifacts, pulse experiments, and error-correction tools.
            The pip package stays headless for notebooks, CI, and HPC jobs.
          </p>
        </div>
      </header>

      <div className="flex-1 grid min-h-0 lg:grid-cols-[260px_1fr]">
        {/* Sidebar: tab list */}
        <aside className="border-b border-vegas-gold/15 bg-forest-light/10 p-3 overflow-x-auto lg:border-b-0 lg:border-r lg:overflow-y-auto">
            <div className="font-mono text-[10px] text-vegas-gold/50 uppercase tracking-widest mb-2 px-1">
            Local companion panels
          </div>
          <div className="grid min-w-[720px] grid-cols-3 gap-1.5 lg:min-w-0 lg:grid-cols-1">
            {TABS.map((t) => (
              <TabPill
                key={t.id}
                tab={t}
                active={t.id === activeTab}
                onClick={() => setActiveTab(t.id)}
              />
            ))}
          </div>

          <div className="mt-4 min-w-[220px] px-2 py-3 border border-vegas-gold/10 rounded-sm bg-deep-jungle/40 lg:mt-6">
            <div className="font-mono text-[9px] text-vegas-gold/50 uppercase tracking-widest mb-1">
              Headless package
            </div>
            <p className="font-body text-[11px] text-isabelline/60 leading-relaxed">
              These panels mirror importable Qcuit modules. The pip library remains
              headless for notebooks, CI, and HPC jobs.
            </p>
          </div>
        </aside>

        {/* Main: tab content */}
        <main className={`overflow-hidden flex flex-col min-h-0 ${
          (tab.id === 'trainer' || tab.id === 'qnn' || tab.id === 'qec' || tab.id === 'pulse' || tab.id === 'noise') && tab.status === 'available' ? '' : 'p-8 overflow-y-auto'
        }`}>
          {tab.id === 'trainer' && tab.status === 'available' ? (
            <TrainerPanel />
          ) : tab.id === 'qnn' && tab.status === 'available' ? (
            <QNNPanel />
          ) : tab.id === 'qec' && tab.status === 'available' ? (
            <QECPanel />
          ) : tab.id === 'pulse' && tab.status === 'available' ? (
            <PulsePanel />
          ) : tab.id === 'noise' && tab.status === 'available' ? (
            <NoisePanel />
          ) : (
          <div className={tab.id === 'notebook' ? 'max-w-5xl' : 'max-w-2xl'}>
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-3xl text-isabelline">{tab.label}</h1>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                  tab.status === 'available'
                    ? 'bg-vegas-gold/20 text-vegas-gold'
                    : 'bg-isabelline/5 text-isabelline/40'
                }`}
              >
                {tab.status === 'available' ? 'Live' : 'Coming Soon'}
              </span>
            </div>
            <p className="font-display text-sm text-vegas-gold/70 italic mt-1">
              {tab.caption}
            </p>

            <hr className="border-vegas-gold/15 my-6" />

            {tab.id === 'notebook' && tab.status === 'available' ? (
              <NotebookPanel />
            ) : (
              <>
                <p className="font-body text-[14px] text-isabelline/80 leading-relaxed">
                  {tab.description}
                </p>

                <ul className="mt-5 space-y-1.5">
                  {tab.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2 font-body text-[13px] text-isabelline/70"
                    >
                      <span className="text-vegas-gold/60 mt-1">·</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab.status !== 'available' && (
              <div className="mt-8 px-4 py-3 border border-vegas-gold/15 rounded-sm bg-forest-light/20">
                <div className="font-mono text-[10px] text-vegas-gold/60 uppercase tracking-widest mb-1">
                  Status
                </div>
                <p className="font-body text-[12px] text-isabelline/70 leading-relaxed">
                  Phase 1 shell. The deterministic Circuit Explainer is
                  already live in <button
                    onClick={navigateToVisualizer}
                    className="underline decoration-vegas-gold/40 hover:text-vegas-gold transition-colors"
                  >Build mode</button>; the rest of the Lab tools ship on the
                  roadmap.
                </p>
              </div>
            )}
          </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Lab;
