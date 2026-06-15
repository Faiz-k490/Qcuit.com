/**
 * Qcuit Learn — quantum and QML curriculum reader.
 *
 * Replaces the previous bespoke lesson list with the manifest-driven
 * CourseEngine: 12 core lessons + 5 QML lessons, each in Read · Watch · Do
 * format with interactive widgets where the topic calls for one.
 */

import React from 'react';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBook2,
  IconBrain,
  IconCode,
  IconDeviceDesktopAnalytics,
  IconFlask2,
  IconRoute,
} from '@tabler/icons-react';
import { SiteNav } from '../components/SiteNav';
import { CourseEngine } from '../content/lessons/CourseEngine';

const LESSON_FLOW = [
  {
    label: '01 Read',
    title: 'Concept',
    copy: 'Short theory blocks for amplitudes, gates, encoders, ansatze, and training loops.',
    href: '#curriculum',
    icon: IconBook2,
  },
  {
    label: '02 Visualize',
    title: 'Circuit',
    copy: 'Open the same idea on the canvas, inspect state probabilities, then export code.',
    href: '/visualizer',
    icon: IconDeviceDesktopAnalytics,
  },
  {
    label: '03 QML Lab',
    title: 'Experiment',
    copy: 'Move into trainers, QNN panels, noise tools, and reproducible benchmark artifacts.',
    href: '/lab',
    icon: IconFlask2,
  },
];

const BEGINNER_PATH = [
  {
    label: '00',
    title: 'Start from zero',
    copy: 'Bits, qubits, amplitudes, measurement, and why quantum is not just parallel classical computing.',
    scope: 'Core 1-4',
    icon: IconBook2,
  },
  {
    label: '01',
    title: 'Build circuit intuition',
    copy: 'Single-qubit gates, CNOT, entanglement, interference, GHZ states, Grover, QFT, and noise.',
    scope: 'Core 5-12',
    icon: IconRoute,
  },
  {
    label: '02',
    title: 'Translate ML to QML',
    copy: 'Feature maps, ansatze, measurement as nonlinearity, losses, optimizers, and parameter-shift gradients.',
    scope: 'QML 1-4',
    icon: IconBrain,
  },
  {
    label: '03',
    title: 'Run a tiny model',
    copy: 'Use the parity classifier as the first complete QML workflow before moving to HEP graphs and LieEQGNNs.',
    scope: 'QML 5 + Lab',
    icon: IconFlask2,
  },
];

const PITFALLS = [
  ['Speedup hype', 'Most QML is research. Always compare against a strong classical baseline.'],
  ['Encoding cost', 'Putting classical data into a quantum state can dominate the whole experiment.'],
  ['Barren plateaus', 'Large random circuits can make gradients vanish before learning begins.'],
  ['Shots and noise', 'Real hardware adds sampling variance, gate errors, readout errors, and drift.'],
  ['Data leakage', 'Train/validation splits and preprocessing mistakes can fake a result fast.'],
  ['Symmetry mismatch', 'For HEP, respect Lorentz structure instead of feeding four-vectors like ordinary columns.'],
];

export function LearnPage() {
  return (
    <div className="noise-texture min-h-screen bg-deep-jungle text-isabelline flex flex-col">
      <SiteNav active="learn" />

      <header className="border-b border-vegas-gold/10 px-5 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 inline-flex items-center gap-2 border border-vegas-gold/25 px-3 py-2 text-vegas-gold">
            <IconBook2 size={18} stroke={1.7} />
            <span className="font-mono text-xs">Learn · QML concepts for the package</span>
          </div>

          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl leading-tight text-isabelline md:text-6xl">
                Learn QML from the ground up, then run it in Qcuit.
              </h1>
              <p className="mt-5 max-w-2xl font-body text-base leading-7 text-isabelline/62 md:text-lg">
                Start with no quantum background. Build circuit intuition, learn the honest QML
                workflow, and only then move into trainer panels, benchmarks, and HEP-oriented models.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {LESSON_FLOW.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="group border border-vegas-gold/15 bg-forest-light/20 p-5 transition-colors hover:border-vegas-gold/45"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <Icon size={22} stroke={1.7} className="text-vegas-gold" />
                      <IconArrowRight
                        size={16}
                        stroke={1.8}
                        className="text-isabelline/30 transition-colors group-hover:text-vegas-gold"
                      />
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/65">
                      {item.label}
                    </p>
                    <h2 className="mt-2 font-display text-xl text-isabelline">{item.title}</h2>
                    <p className="mt-3 font-body text-sm leading-6 text-isabelline/58">
                      {item.copy}
                    </p>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main id="curriculum" className="flex-1">
        <section className="border-b border-vegas-gold/10 px-5 py-10">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="mb-5 flex items-center gap-2 text-vegas-gold">
                <IconRoute size={18} stroke={1.8} />
                <span className="font-mono text-xs uppercase tracking-widest">Beginner roadmap</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {BEGINNER_PATH.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.label} className="border border-vegas-gold/15 bg-forest-light/20 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex h-9 w-9 items-center justify-center border border-vegas-gold/25 text-vegas-gold">
                          <Icon size={19} stroke={1.7} />
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-isabelline/38">
                          {item.scope}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/65">
                        Step {item.label}
                      </p>
                      <h2 className="mt-2 font-display text-xl text-isabelline">{item.title}</h2>
                      <p className="mt-3 font-body text-sm leading-6 text-isabelline/58">{item.copy}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="border border-muted-brick/25 bg-muted-brick/10 p-6">
              <div className="mb-4 flex items-center gap-2 text-muted-brick">
                <IconAlertTriangle size={19} stroke={1.8} />
                <span className="font-mono text-xs uppercase tracking-widest">QML pitfalls to learn early</span>
              </div>
              <div className="grid gap-3">
                {PITFALLS.map(([title, body]) => (
                  <div key={title} className="border border-isabelline/8 bg-deep-jungle/35 p-3">
                    <h3 className="font-body text-sm font-semibold text-isabelline">{title}</h3>
                    <p className="mt-1 font-body text-xs leading-5 text-isabelline/58">{body}</p>
                  </div>
                ))}
              </div>
              <a
                href="/docs"
                className="mt-5 inline-flex items-center gap-2 font-body text-sm text-vegas-gold hover:text-isabelline"
              >
                Read package docs
                <IconCode size={16} stroke={1.8} />
              </a>
            </aside>
          </div>
        </section>
        <CourseEngine />
      </main>

      <footer className="border-t border-vegas-gold/5 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <span className="font-body text-xs text-isabelline/30">
            © 2026 Qcuit · open-source quantum ML tooling
          </span>
          <div className="flex flex-wrap gap-4 font-body text-sm">
            <a href="/visualizer" className="text-vegas-gold hover:text-isabelline">
              Continue to Visualize
            </a>
            <a href="/lab" className="text-vegas-gold hover:text-isabelline">
              Open QML Lab
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LearnPage;
