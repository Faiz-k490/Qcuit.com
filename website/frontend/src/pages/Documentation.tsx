/**
 * Qcuit Documentation Page
 *
 * Library-first instructions and function reference.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowRight,
  IconAtom,
  IconBook2,
  IconBrandGithub,
  IconChevronDown,
  IconDeviceDesktopAnalytics,
  IconExternalLink,
  IconMicroscope,
  IconNetwork,
  IconPackage,
  IconSearch,
  IconTerminal2,
} from '@tabler/icons-react';
import { SiteNav } from '../components/SiteNav';
import { PROJECT_LINKS } from '../lib/projectLinks';

type SectionId = 'start' | 'local' | 'reference' | 'hep' | 'models' | 'visualizer';
type IconType = React.ComponentType<{ size?: number; stroke?: number; className?: string }>;

const SECTIONS: { id: SectionId; label: string; icon: IconType; summary: string }[] = [
  { id: 'start', label: 'Use Qcuit', icon: IconPackage, summary: 'Install commands, first circuit, HEP benchmark, CLI.' },
  { id: 'local', label: 'Run Locally', icon: IconTerminal2, summary: 'Backend/frontend commands, health checks, visualizer API contract.' },
  { id: 'reference', label: 'Core API', icon: IconAtom, summary: 'Qubit, Circuit, Apply, gates, backend, notebooks.' },
  { id: 'hep', label: 'HEP API', icon: IconMicroscope, summary: 'Lorentz math, jet data, metrics, reproducibility.' },
  { id: 'models', label: 'Models API', icon: IconNetwork, summary: 'LorentzNet, LieEQGNN, quantum layers, benchmarks.' },
  { id: 'visualizer', label: 'Visualize', icon: IconDeviceDesktopAnalytics, summary: 'Optional circuit canvas for learning and inspection.' },
];

const INSTALL = `pip install qcuit
pip install "qcuit[qiskit]"
pip install "qcuit[hep]"
pip install "qcuit[hep,hep-io]"
pip install "qcuit[hep,pyg]"
pip install "qcuit[hep,qml]"
pip install "qcuit[all]"`;

const FIRST_CIRCUIT = `from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

a, b = Qubit("a"), Qubit("b")
circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))
circ.add(Apply(CNOT, target=b, control=a))
circ.measure_all()
circ.draw()

print(run_simulation(circ, shots=1024))`;

const HEP_BENCHMARK = `from qcuit.hep import load_top_tagging, toy_quark_gluon_jets
from qcuit.models import LieEQGNN
from qcuit.benchmarks import benchmark_classifier, set_seed

set_seed(11)

# Real local file path after installing qcuit[hep,hep-io].
data = load_top_tagging("/data/top-tagging/train.h5", max_nodes=200, limit=50_000)
# Smoke-test fallback:
# data = toy_quark_gluon_jets(num_jets=64, n_nodes=6)

model = LieEQGNN(
    n_scalar=data.n_scalar,
    n_hidden=4,
    n_layers=2,
    quantum_blocks=["phi_e"],
    quantum_backend="torch",
)

report = benchmark_classifier(model, data, epochs=10)
print(report.metrics)`;

const CLI = `qcuit-lie-eqgnn-demo --epochs 10 --backend torch
qcuit-lie-eqgnn-demo --epochs 10 --backend pennylane --out report.json`;

const LOCAL_RUN = `# Terminal 1: backend API
make backend

# Terminal 2: React frontend
make frontend

# Health checks
curl -sS http://localhost:5001/health
curl -sS http://localhost:5001/api/health`;

const VISUALIZER_SMOKE = `cd website
PYTHONPATH=. python3 -m pytest api/tests/test_visualizer_connectivity.py

# Full local verification
PYTHONPATH=. python3 -m pytest api/tests
cd ../library && python3 -m pytest tests
cd ../website/frontend && npm run build`;

const VISUALIZER_PAYLOAD = `{
  "numQubits": 2,
  "numClassical": 2,
  "gates": {
    "h-0-0": { "id": "h-0-0", "gateType": "H", "target": 0, "timestep": 0 }
  },
  "multiQubitGates": [
    { "id": "cx1", "gateType": "CNOT", "control": 0, "target": 1, "timestep": 1 }
  ],
  "measurements": [],
  "noiseLevel": 0
}`;

const CORE_REFERENCE = [
  ['Qubit(name)', 'Creates a named qubit. Names must be non-empty strings.'],
  ['Circuit(*qubits)', 'Creates a circuit over one or more Qubit objects.'],
  ['Circuit.add(operation)', 'Appends an Apply operation after validating target/control qubits.'],
  ['Circuit.measure_all()', 'Marks every qubit for terminal measurement.'],
  ['Circuit.draw()', 'Prints an ASCII circuit diagram with H, X, CNOT, and measurement markers.'],
  ['QcuitError(message)', 'Friendly exception used for validation and human-readable guidance.'],
  ['Apply(gate, target, control=None)', 'Wraps a gate class and its target/control qubits.'],
  ['Hadamard', 'Single-qubit H gate label used by the backend and ASCII renderer.'],
  ['PauliX', 'Single-qubit X gate label used by the backend and ASCII renderer.'],
  ['CNOT', 'Two-qubit controlled-NOT gate. Requires control and target qubits.'],
  ['run_simulation(circuit, shots=1024)', 'Optional qiskit extra: translates a Circuit to Qiskit Aer and returns counts.'],
  ['canonical_json(payload)', 'Creates deterministic JSON with sorted keys and no NaN/Inf values.'],
  ['canonical_hash(payload)', 'SHA-256 digest of canonical JSON.'],
  ['Notebook.build(...)', 'Builds a reproducible run artifact without writing it.'],
  ['Notebook.save(..., store_dir)', 'Writes a hash-addressed run artifact to disk.'],
  ['Notebook.load(run_hash, store_dir)', 'Loads a saved run artifact by hash or returns None.'],
  ['Notebook.list_hashes(store_dir)', 'Lists saved reproducibility artifact hashes.'],
  ['Notebook.to_dict()', 'Serializes a Notebook artifact.'],
  ['Notebook.from_dict(data)', 'Creates a Notebook artifact from serialized data.'],
];

const HEP_REFERENCE = [
  ['JetDataset(p4s, scalars, labels, node_mask=None, edge_mask=None)', 'Torch-compatible jet graph dataset. p4s must be [jets, nodes, 4].'],
  ['JetDataset.from_arrays(...)', 'Constructs a JetDataset from arrays or tensors.'],
  ['JetDataset.from_kinematics(...)', 'Builds padded jet graphs from jagged pt/eta/phi/mass arrays.'],
  ['JetDataset.from_npz(path)', 'Loads p4s/scalars-or-nodes/labels from an NPZ file.'],
  ['JetDataset.from_top_tagging(path)', 'Loads local Top Tagging-style HDF5/NPZ files. Requires qcuit[hep-io].'],
  ['JetDataset.from_jetclass(path)', 'Loads local JetClass-style ROOT TTrees through uproot/awkward. Requires qcuit[hep-io].'],
  ['JetDataset.split(train, val, test, seed)', 'Deterministic train/val/test split with small-dataset safeguards.'],
  ['JetDataset.dataloaders(...)', 'Builds PyTorch dataloaders using Qcuit jet collation.'],
  ['JetDataset.to_pyg_data_list()', 'Exports PyTorch Geometric Data objects. Requires qcuit[pyg].'],
  ['JetBatch.to(device, dtype=None)', 'Moves a collated batch to CPU/GPU.'],
  ['collate_jets(samples)', 'Flattens batched jets into model-ready graph tensors.'],
  ['four_vectors_from_ptetaphim(...)', 'Converts constituent kinematics into [E, px, py, pz] four-vectors.'],
  ['load_top_tagging(path, ...)', 'Functional loader for local Top Tagging benchmark files.'],
  ['load_jetclass(path, ...)', 'Functional loader for local JetClass ROOT files with branch overrides.'],
  ['toy_quark_gluon_jets(...)', 'Creates a balanced toy quark/gluon-like dataset for smoke tests and notebooks.'],
  ['minkowski_metric()', 'Returns diag(1, -1, -1, -1).'],
  ['euclidean_metric()', 'Returns the 4D Euclidean metric.'],
  ['resolve_metric(metric)', 'Accepts "minkowski", "euclidean", arrays, or tensors and returns a metric.'],
  ['minkowski_dot(p, q, metric=None)', 'Computes p^T g q over the final axis.'],
  ['minkowski_norm(p, metric=None)', 'Computes p^T g p over the final axis.'],
  ['psi(values)', 'Signed log feature map used by LorentzNet/LieEQGNN.'],
  ['lorentz_boost(beta, axis="x")', 'Builds a 4x4 Lorentz boost matrix.'],
  ['apply_lorentz_transform(vectors, transform)', 'Applies a Lorentz transform to one or many four-vectors.'],
  ['check_metric_invariance(generators, metric, atol)', 'Checks L.T @ g + g @ L == 0 for Lie generators.'],
  ['invariant_metric_from_generators(...)', 'Torch LBFGS helper for extracting an invariant metric tensor.'],
  ['build_roc(labels, scores, target_efficiencies)', 'Returns ROC arrays, AUC, thresholds, and background rejection.'],
  ['background_rejection(labels, scores, target_efficiency)', 'Returns 1/FPR at a target signal efficiency.'],
  ['binary_classification_metrics(labels, logits_or_scores)', 'Returns accuracy and AUC for binary classifiers.'],
  ['parameter_count(model, trainable_only=True)', 'Counts trainable or all Torch parameters.'],
];

const MODEL_REFERENCE = [
  ['LorentzNet(...)', 'Classical Lorentz-equivariant graph classifier baseline.'],
  ['LorentzNet.forward(...)', 'Runs scalars, four-vectors, edges, masks, and n_nodes through the graph model.'],
  ['LorentzNet.forward_batch(batch)', 'Convenience wrapper for JetBatch.'],
  ['LGEB(...)', 'Lorentz Group Equivariant Block used by LorentzNet.'],
  ['LieEQGNN(...)', 'Lie-equivariant quantum graph model with optional quantum phi_e/phi_h/phi_x/phi_m blocks.'],
  ['QLieGEB(...)', 'Quantum version of LGEB that swaps chosen submodules with DressedQuantumLayer.'],
  ['DressedQuantumLayer(n_qubits, depth, backend)', 'Torch module wrapping a small variational circuit. Backend can be torch, pennylane, or auto.'],
  ['entangling_layer(qml, n_qubits)', 'Applies the staggered CNOT pattern used by the quantum layer.'],
  ['BenchmarkReport(metrics, history, config)', 'Serializable train/eval result object.'],
  ['BenchmarkReport.to_dict()', 'Returns report as plain Python dictionaries/lists.'],
  ['BenchmarkReport.to_json(path)', 'Writes a benchmark report to JSON.'],
  ['set_seed(seed)', 'Seeds Python, NumPy, Torch, and CUDA when available.'],
  ['benchmark_classifier(model, dataset, ...)', 'Trains/evaluates a classifier and returns BenchmarkReport.'],
  ['lie_eqgnn_demo(argv=None)', 'CLI entry point behind qcuit-lie-eqgnn-demo.'],
];

type SearchEntry = {
  label: string;
  detail: string;
  section: SectionId;
};

const SEARCH_ENTRIES: SearchEntry[] = [
  ...SECTIONS.map((section) => ({
    label: section.label,
    detail: section.summary,
    section: section.id,
  })),
  ...CORE_REFERENCE.map(([label, detail]) => ({ label, detail, section: 'reference' as const })),
  ...HEP_REFERENCE.map(([label, detail]) => ({ label, detail, section: 'hep' as const })),
  ...MODEL_REFERENCE.map(([label, detail]) => ({ label, detail, section: 'models' as const })),
  { label: 'Install commands', detail: 'pip install qcuit and optional extras.', section: 'start' },
  { label: 'Run locally', detail: 'make backend, make frontend, health checks, visualizer smoke tests.', section: 'local' },
  { label: 'Backend health', detail: '/health and /api/health confirm the Flask API is live.', section: 'local' },
  { label: 'Visualize route', detail: '/visualizer circuit canvas companion.', section: 'visualizer' },
];

function DocsSearch({ onSelect }: { onSelect: (section: SectionId) => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trimmed = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmed) return SEARCH_ENTRIES.slice(0, 5);
    return SEARCH_ENTRIES.filter((entry) => (
      `${entry.label} ${entry.detail}`.toLowerCase().includes(trimmed)
    )).slice(0, 7);
  }, [trimmed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="relative min-w-0 max-w-xl flex-1">
      <div className="flex items-center gap-2 border border-vegas-gold/20 bg-forest-light/35 px-3 py-2">
        <IconSearch size={16} stroke={1.8} className="text-isabelline/45" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder="Search docs..."
          className="min-w-0 flex-1 bg-transparent font-body text-sm text-isabelline outline-none placeholder:text-isabelline/35"
        />
        <span className="border border-isabelline/10 px-1.5 py-0.5 font-mono text-[10px] text-isabelline/35">⌘K</span>
      </div>
      {(focused || query.length > 0) && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 border border-vegas-gold/20 bg-[#0d171f] shadow-2xl shadow-black/30">
          {results.length > 0 ? results.map((result) => (
            <button
              key={`${result.section}-${result.label}`}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(result.section);
                setQuery('');
                setFocused(false);
              }}
              className="block w-full border-b border-isabelline/5 px-4 py-3 text-left last:border-b-0 hover:bg-vegas-gold/10"
            >
              <span className="block font-mono text-xs text-vegas-gold">{result.label}</span>
              <span className="mt-1 block truncate font-body text-xs text-isabelline/50">{result.detail}</span>
            </button>
          )) : (
            <div className="px-4 py-3 font-body text-sm text-isabelline/45">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}

function VersionSelect() {
  return (
    <label className="relative hidden md:block">
      <select
        aria-label="Documentation version"
        className="appearance-none border border-vegas-gold/20 bg-forest-light/35 py-2 pl-3 pr-8 font-mono text-xs text-isabelline outline-none"
        defaultValue="0.1.0"
      >
        <option value="0.1.0">v0.1.0</option>
        <option value="main">main</option>
      </select>
      <IconChevronDown size={14} stroke={1.8} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-isabelline/45" />
    </label>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="w-full max-w-full overflow-x-auto border border-vegas-gold/15 bg-[#111827] p-5">
      <code className="block whitespace-pre font-mono text-xs leading-6 text-isabelline/85">{code}</code>
    </pre>
  );
}

function ReferenceTable({ rows }: { rows: string[][] }) {
  return (
    <div className="w-full max-w-full overflow-hidden border border-vegas-gold/12">
      {rows.map(([name, description]) => (
        <div key={name} className="grid gap-3 border-b border-vegas-gold/10 bg-forest-light/20 p-4 last:border-b-0 md:grid-cols-[0.34fr_0.66fr]">
          <code className="min-w-0 break-words font-mono text-xs text-vegas-gold">{name}</code>
          <p className="font-body text-sm leading-6 text-isabelline/68">{description}</p>
        </div>
      ))}
    </div>
  );
}

function SectionButton({ section, active, onClick }: { section: (typeof SECTIONS)[number]; active: boolean; onClick: () => void }) {
  const Icon = section.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full border p-4 text-left transition-colors ${
        active ? 'border-vegas-gold/45 bg-vegas-gold/10' : 'border-vegas-gold/12 bg-forest-light/20 hover:border-vegas-gold/35'
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <Icon size={20} stroke={1.7} className={active ? 'text-vegas-gold' : 'text-isabelline/55'} />
        <span className={active ? 'font-body text-sm text-vegas-gold' : 'font-body text-sm text-isabelline'}>
          {section.label}
        </span>
      </div>
      <p className="font-body text-xs leading-5 text-isabelline/50">{section.summary}</p>
    </button>
  );
}

export function Documentation() {
  const [active, setActive] = useState<SectionId>('start');

  return (
    <div className="noise-texture min-h-screen bg-deep-jungle text-isabelline">
      <SiteNav active="docs" />
      <header className="px-5 pb-12 pt-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 inline-flex items-center gap-2 border border-vegas-gold/25 px-3 py-2 text-vegas-gold">
            <IconBook2 size={18} stroke={1.7} />
            <span className="font-mono text-xs">Library instructions and function reference</span>
          </div>
          <h1 className="max-w-4xl font-display text-5xl leading-tight text-isabelline md:text-6xl">
            Use Qcuit as a Python package. Keep the visualizer optional.
          </h1>
          <p className="mt-6 max-w-3xl font-body text-lg leading-8 text-isabelline/62">
            These docs explain every public function in the pip-first Qcuit surface: circuits,
            HEP data, Lorentz math, LieEQGNN models, quantum layers, benchmarks, CLI, and the
            optional browser visualizer.
          </p>
          <div className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
            <DocsSearch onSelect={setActive} />
            <VersionSelect />
          </div>
        </div>
      </header>

      <main className="px-5 pb-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
            {SECTIONS.map((section) => (
              <SectionButton
                key={section.id}
                section={section}
                active={active === section.id}
                onClick={() => setActive(section.id)}
              />
            ))}
          </aside>

          <section className="min-w-0 space-y-8">
            {active === 'start' && (
              <>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">Install</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    Start with the light base package, then add extras only when your workflow needs them.
                  </p>
                  <div className="mt-5"><CodeBlock code={INSTALL} /></div>
                  <a
                    href={PROJECT_LINKS.pypi}
                    className="mt-4 inline-flex items-center gap-2 font-body text-sm text-vegas-gold hover:text-isabelline"
                  >
                    Open the qcuit PyPI package
                    <IconExternalLink size={15} stroke={1.8} />
                  </a>
                </div>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">First quantum circuit</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    Requires <code className="font-mono text-vegas-gold">qcuit[qiskit]</code> for local Aer simulation.
                  </p>
                  <div className="mt-5"><CodeBlock code={FIRST_CIRCUIT} /></div>
                </div>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">HEP LieEQGNN benchmark</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    Requires <code className="font-mono text-vegas-gold">qcuit[hep]</code>. Switch
                    <code className="ml-1 font-mono text-vegas-gold">quantum_backend</code> to pennylane after installing
                    <code className="ml-1 font-mono text-vegas-gold">qcuit[hep,qml]</code>.
                  </p>
                  <div className="mt-5"><CodeBlock code={HEP_BENCHMARK} /></div>
                </div>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">CLI smoke benchmark</h2>
                  <div className="mt-5"><CodeBlock code={CLI} /></div>
                </div>
              </>
            )}

            {active === 'local' && (
              <>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">Run everything locally</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    Qcuit runs as two local processes: Flask on port 5001 and React on port 3001.
                    The frontend proxies every <code className="font-mono text-vegas-gold">/api/*</code> request to the backend.
                  </p>
                  <div className="mt-5"><CodeBlock code={LOCAL_RUN} /></div>
                </div>

                <div>
                  <h2 className="font-display text-3xl text-isabelline">Visualize backend contract</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    The visualizer sends frontend-shaped gates with <code className="font-mono text-vegas-gold">target</code>
                    and <code className="ml-1 font-mono text-vegas-gold">control</code>. The API normalizes them for simulation,
                    code export, optimization, transpilation, resource estimation, statevector views, and deterministic explanations.
                  </p>
                  <div className="mt-5"><CodeBlock code={VISUALIZER_PAYLOAD} /></div>
                </div>

                <div>
                  <h2 className="font-display text-3xl text-isabelline">Local test commands</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    Run the visualizer smoke test when the canvas cannot connect. Run the broader suite before presenting the project.
                  </p>
                  <div className="mt-5"><CodeBlock code={VISUALIZER_SMOKE} /></div>
                </div>
              </>
            )}

            {active === 'reference' && (
              <>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">Core API reference</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    These are the base circuit and reproducibility functions.
                  </p>
                </div>
                <ReferenceTable rows={CORE_REFERENCE} />
              </>
            )}

            {active === 'hep' && (
              <>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">HEP API reference</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    Lorentz geometry, jet graph data, and classifier metrics for HEP workflows.
                  </p>
                </div>
                <ReferenceTable rows={HEP_REFERENCE} />
              </>
            )}

            {active === 'models' && (
              <>
                <div>
                  <h2 className="font-display text-3xl text-isabelline">Models, quantum layers, benchmarks</h2>
                  <p className="mt-3 font-body leading-7 text-isabelline/62">
                    Importable model templates and benchmark helpers for headless research runs.
                  </p>
                </div>
                <ReferenceTable rows={MODEL_REFERENCE} />
              </>
            )}

            {active === 'visualizer' && (
              <>
                <div className="border border-vegas-gold/18 bg-forest-light/25 p-7">
                  <div className="mb-4 flex items-center gap-3 text-vegas-gold">
                    <IconDeviceDesktopAnalytics size={22} stroke={1.7} />
                    <span className="font-mono text-xs">Optional companion</span>
                  </div>
                  <h2 className="font-display text-3xl text-isabelline">Not sold on quantum? Try this to visualize it.</h2>
                  <p className="mt-4 font-body leading-7 text-isabelline/62">
                    The browser circuit canvas remains available as the visualizer. It is useful for teaching,
                    checking circuit intuition, and exporting Qiskit, Braket, or OpenQASM snippets. It is
                    not required by the pip library and is not part of the base install.
                  </p>
                  <a
                    href="/visualizer"
                    className="mt-6 inline-flex items-center gap-2 bg-vegas-gold px-6 py-3 font-body text-sm font-medium text-deep-jungle hover:bg-brass-light"
                  >
                    Open the visualizer
                    <IconArrowRight size={17} stroke={1.8} />
                  </a>
                </div>
                <ReferenceTable
                  rows={[
                    ['Visualize route', '/visualizer, /simulator, /studio, and /app all open the same circuit canvas for compatibility.'],
                    ['Canvas workflow', 'Place gates visually, simulate, inspect probabilities, and export code.'],
                    ['Research boundary', 'Use the visualizer for intuition; use qcuit.hep, qcuit.models, and qcuit.benchmarks for lab workflows.'],
                  ]}
                />
              </>
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-vegas-gold/10 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <p className="font-body text-sm text-isabelline/35">Qcuit documentation for the open-source pip library.</p>
          <a
            href={PROJECT_LINKS.repository}
            className="inline-flex items-center gap-2 font-body text-sm text-vegas-gold hover:text-isabelline"
          >
            <IconBrandGithub size={17} stroke={1.8} />
            Source repository
          </a>
        </div>
      </footer>
    </div>
  );
}

export default Documentation;
