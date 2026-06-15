/**
 * Qcuit.com Landing Page
 *
 * Researcher-first homepage for the pip library. The browser surfaces are
 * framed as optional support material, not as the primary product.
 */

import React, { useState } from 'react';
import {
  IconArrowRight,
  IconBook2,
  IconBrandGithub,
  IconCheck,
  IconCopy,
  IconDeviceDesktopAnalytics,
  IconExternalLink,
  IconFlask2,
  IconMicroscope,
  IconTerminal2,
} from '@tabler/icons-react';
import { SiteNav } from '../components/SiteNav';
import { INSTALL_COMMAND, PROJECT_LINKS } from '../lib/projectLinks';

type IconType = React.ComponentType<{ size?: number; stroke?: number; className?: string }>;

const INSTALL_COMMANDS = [
  ['Base', 'pip install qcuit'],
  ['HEP workflows', 'pip install "qcuit[hep]"'],
  ['ROOT / HDF5 IO', 'pip install "qcuit[hep,hep-io]"'],
  ['QML backends', 'pip install "qcuit[hep,qml]"'],
];

const RESEARCH_TASKS: {
  title: string;
  body: string;
  href: string;
  icon: IconType;
}[] = [
  {
    title: 'Inspect the API surface',
    body: 'Install commands, function reference, HEP loaders, Lorentz math, LieEQGNN, benchmarks, and CLI.',
    href: '/docs',
    icon: IconBook2,
  },
  {
    title: 'Run a QML benchmark',
    body: 'Use the local QML Lab for trainer, QNN, noise, notebook, QEC, and pulse checks that mirror package modules.',
    href: '/lab',
    icon: IconFlask2,
  },
  {
    title: 'Visualize a circuit',
    body: 'Open the canvas when circuit intuition helps, then move the result back into Python workflows.',
    href: '/visualizer',
    icon: IconDeviceDesktopAnalytics,
  },
];

const MODULE_ROWS = [
  ['qcuit', 'Readable circuits', 'Qubit, Circuit, Apply, Hadamard, CNOT'],
  ['qcuit.hep', 'HEP jet graph utilities', 'JetDataset, load_top_tagging, load_jetclass, minkowski_dot'],
  ['qcuit.models', 'Lorentz-aware models', 'LorentzNet, LieEQGNN, QLieGEB'],
  ['qcuit.quantum', 'Hybrid QML layers', 'DressedQuantumLayer, entangling_layer'],
  ['qcuit.benchmarks', 'Headless evaluation', 'benchmark_classifier, BenchmarkReport, set_seed'],
  ['qcuit-lie-eqgnn-demo', 'CLI smoke benchmark', '--epochs, --backend, --out'],
];

const QUICKSTART = `from qcuit.hep import toy_quark_gluon_jets
from qcuit.models import LieEQGNN
from qcuit.benchmarks import benchmark_classifier, set_seed

set_seed(11)
data = toy_quark_gluon_jets(num_jets=64, n_nodes=6)

model = LieEQGNN(
    n_scalar=data.n_scalar,
    n_hidden=4,
    n_layers=2,
    quantum_blocks=["phi_e"],
    quantum_backend="torch",
)

report = benchmark_classifier(model, data, epochs=5)
print(report.metrics)`;

function CopyInstall() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex w-full max-w-xl items-stretch border border-vegas-gold/28 bg-[#0d171f]">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-4 py-3 font-mono text-sm text-isabelline">
        {INSTALL_COMMAND}
      </code>
      <button
        onClick={copy}
        className="flex w-28 items-center justify-center gap-2 border-l border-vegas-gold/20 bg-vegas-gold text-sm font-medium text-deep-jungle hover:bg-brass-light"
        title="Copy install command"
      >
        {copied ? <IconCheck size={17} stroke={2} /> : <IconCopy size={17} stroke={1.8} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function CodePanel() {
  return (
    <div className="min-w-0 border border-vegas-gold/18 bg-[#101820]">
      <div className="flex items-center justify-between border-b border-vegas-gold/10 px-4 py-3">
        <span className="font-mono text-xs text-isabelline/55">research_quickstart.py</span>
        <span className="font-mono text-xs text-vegas-gold">headless benchmark</span>
      </div>
      <pre className="max-w-full overflow-x-auto p-5">
        <code className="block whitespace-pre font-mono text-xs leading-6 text-isabelline/84">
          {QUICKSTART}
        </code>
      </pre>
    </div>
  );
}

function ResearchTask({ title, body, href, icon: Icon }: (typeof RESEARCH_TASKS)[number]) {
  return (
    <a
      href={href}
      className="group flex min-w-0 gap-4 border border-vegas-gold/15 bg-forest-light/20 p-5 transition-colors hover:border-vegas-gold/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-vegas-gold/25 text-vegas-gold">
        <Icon size={21} stroke={1.7} />
      </div>
      <div className="min-w-0">
        <h3 className="font-body text-base font-semibold text-isabelline group-hover:text-vegas-gold">
          {title}
        </h3>
        <p className="mt-2 font-body text-sm leading-6 text-isabelline/58">{body}</p>
      </div>
      <IconArrowRight size={17} stroke={1.8} className="ml-auto mt-1 shrink-0 text-isabelline/28 group-hover:text-vegas-gold" />
    </a>
  );
}

export function LandingPage() {
  return (
    <div className="noise-texture min-h-screen bg-deep-jungle text-isabelline">
      <SiteNav active="home" />

      <header className="px-5 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div className="min-w-0">
            <div className="mb-6 inline-flex items-center gap-2 border border-vegas-gold/22 px-3 py-2 text-vegas-gold">
              <IconMicroscope size={18} stroke={1.7} />
              <span className="font-mono text-xs">Python package for HEP and quantum ML research</span>
            </div>

            <h1 className="font-display text-4xl leading-tight text-isabelline md:text-6xl">
              A QML research library for HEP workflows.
            </h1>
            <p className="mt-6 max-w-2xl font-body text-base leading-7 text-isabelline/64 md:text-lg">
              Use Qcuit to prototype readable quantum circuits, load HEP jet graph datasets,
              build Lorentz-aware QML models, and run reproducible benchmarks from Python.
              The website exists to document the package and provide optional teaching tools.
            </p>

            <div id="install" className="mt-8">
              <CopyInstall />
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="/docs"
                className="inline-flex items-center justify-center gap-2 bg-vegas-gold px-5 py-3 font-body text-sm font-medium text-deep-jungle hover:bg-brass-light"
              >
                Read docs
                <IconArrowRight size={17} stroke={1.8} />
              </a>
              <a
                href={PROJECT_LINKS.pypi}
                className="inline-flex items-center justify-center gap-2 border border-isabelline/15 px-5 py-3 font-body text-sm text-isabelline/72 hover:border-vegas-gold/45 hover:text-vegas-gold"
              >
                PyPI package
                <IconExternalLink size={16} stroke={1.8} />
              </a>
              <a
                href={PROJECT_LINKS.repository}
                className="inline-flex items-center justify-center gap-2 border border-vegas-gold/45 px-5 py-3 font-body text-sm text-vegas-gold hover:bg-vegas-gold hover:text-deep-jungle"
              >
                Source
                <IconBrandGithub size={17} stroke={1.8} />
              </a>
            </div>
          </div>

          <CodePanel />
        </div>
      </header>

      <main>
        <section id="workflows" className="border-y border-vegas-gold/10 bg-[#0d171f] px-5 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.68fr_1.32fr]">
            <div>
              <span className="font-mono text-xs text-vegas-gold">FOR QML RESEARCHERS</span>
              <h2 className="mt-3 font-display text-3xl leading-tight text-isabelline md:text-4xl">
                Find the thing you came for quickly.
              </h2>
              <p className="mt-4 font-body leading-7 text-isabelline/58">
              The public site now follows the package: install first, API docs second,
                browser tools only where they clarify the Python workflow.
              </p>
            </div>
            <div className="grid gap-3">
              {RESEARCH_TASKS.map((task) => (
                <ResearchTask key={task.title} {...task} />
              ))}
            </div>
          </div>
        </section>

        <section id="api" className="px-5 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-3xl">
              <span className="font-mono text-xs text-vegas-gold">PACKAGE SURFACE</span>
              <h2 className="mt-3 font-display text-3xl text-isabelline md:text-4xl">
                The active project centers on six importable surfaces.
              </h2>
            </div>

            <div className="overflow-hidden border border-vegas-gold/15">
              {MODULE_ROWS.map(([module, purpose, apis]) => (
                <div
                  key={module}
                  className="grid gap-3 border-b border-vegas-gold/10 bg-forest-light/20 p-4 last:border-b-0 md:grid-cols-[0.22fr_0.28fr_0.5fr]"
                >
                  <code className="font-mono text-xs text-vegas-gold">{module}</code>
                  <p className="font-body text-sm text-isabelline/74">{purpose}</p>
                  <p className="font-mono text-xs leading-5 text-isabelline/50">{apis}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-vegas-gold/10 bg-isabelline px-5 py-12 text-deep-jungle">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <span className="font-mono text-xs text-deep-jungle/55">INSTALL OPTIONS</span>
              <h2 className="mt-3 font-display text-3xl text-deep-jungle">
                Keep the base install small. Add research extras deliberately.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {INSTALL_COMMANDS.map(([label, command]) => (
                <div key={label} className="border border-deep-jungle/15 bg-white p-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-deep-jungle/45">{label}</p>
                  <code className="mt-2 block break-words font-mono text-sm text-deep-jungle">{command}</code>
                </div>
              ))}
            </div>
            <a
              href={PROJECT_LINKS.pypi}
              className="inline-flex items-center gap-2 font-body text-sm text-deep-jungle/68 hover:text-deep-jungle lg:col-start-2"
            >
              View qcuit on PyPI
              <IconExternalLink size={15} stroke={1.8} />
            </a>
          </div>
        </section>

        <section className="px-5 py-14">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <span className="font-mono text-xs text-vegas-gold">BROWSER COMPANION</span>
              <h2 className="mt-3 font-display text-3xl text-isabelline md:text-4xl">
                Optional tools, kept in their lane.
              </h2>
              <p className="mt-4 font-body leading-7 text-isabelline/58">
                Learn, Visualize, and QML Lab support the library. They are useful for students,
                circuit intuition, and quick local checks, but they are not required for package use.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Learn', '/explore', 'Guided lessons'],
                ['Visualize', '/visualizer', 'Circuit intuition'],
                ['QML Lab', '/lab', 'Browser-side checks'],
              ].map(([label, href, detail]) => (
                <a
                  key={label}
                  href={href}
                  className="group border border-vegas-gold/15 bg-forest-light/20 p-5 hover:border-vegas-gold/40"
                >
                  <p className="font-body text-base font-semibold text-isabelline group-hover:text-vegas-gold">
                    {label}
                  </p>
                  <p className="mt-2 font-body text-sm text-isabelline/50">{detail}</p>
                  <div className="mt-5 inline-flex items-center gap-2 font-body text-sm text-vegas-gold">
                    Open
                    <IconExternalLink size={15} stroke={1.8} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-vegas-gold/10 px-5 py-10">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="font-body text-sm text-isabelline/44">MIT licensed. Built for notebooks, CI, and cluster jobs.</p>
              <p className="mt-1 font-mono text-xs text-isabelline/30">make verify / qcuit-lie-eqgnn-demo / docs/REPO_MAP.md</p>
            </div>
            <a
              href="/docs"
              className="inline-flex items-center gap-2 font-body text-sm text-vegas-gold hover:text-isabelline"
            >
              Full function reference
              <IconTerminal2 size={17} stroke={1.8} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
