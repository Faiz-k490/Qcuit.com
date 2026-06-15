export interface RunnableExample {
  title: string;
  level: string;
  body: string;
  action: string;
  href: string;
  secondary: string;
  lessonSlugs: string[];
  code: string;
}

export const RUNNABLE_EXAMPLES: RunnableExample[] = [
  {
    title: 'Bell pair',
    level: 'Foundation 5-6',
    body: 'Entanglement in the smallest useful circuit: H on one qubit, CNOT into the second, then simulate correlated outcomes.',
    action: 'Open and simulate',
    href: '/visualizer?preset=bell&run=1',
    secondary: 'Visualize',
    lessonSlugs: ['core-05-two-qubits-entanglement', 'core-06-cnot-entangling'],
    code: `from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

a, b = Qubit("a"), Qubit("b")
circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))
circ.add(Apply(CNOT, target=b, control=a))
circ.measure_all()

print(run_simulation(circ, shots=1024))`,
  },
  {
    title: 'GHZ state',
    level: 'Foundation 7',
    body: 'A three-qubit entanglement chain. Students can see how one Hadamard plus two CNOTs creates all-or-nothing measurement outcomes.',
    action: 'Open and simulate',
    href: '/visualizer?preset=ghz3&run=1',
    secondary: 'Visualize',
    lessonSlugs: ['core-07-ghz-multi'],
    code: `from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

q0, q1, q2 = Qubit("q0"), Qubit("q1"), Qubit("q2")
circ = Circuit(q0, q1, q2)
circ.add(Apply(Hadamard, target=q0))
circ.add(Apply(CNOT, target=q1, control=q0))
circ.add(Apply(CNOT, target=q2, control=q1))
circ.measure_all()

print(run_simulation(circ))`,
  },
  {
    title: 'Parity QNN',
    level: 'QML 5',
    body: 'A tiny classifier that makes encoding, ansatz parameters, loss, and training curves concrete before touching HEP data.',
    action: 'Train in QML Lab',
    href: '/lab?tab=qnn&preset=parity&run=1',
    secondary: 'QNN Lab',
    lessonSlugs: ['qml-05-parity-classifier'],
    code: `import numpy as np
from qcuit.qnn import parity_preset, qnn_train, to_pennylane

preset = parity_preset()
events = list(qnn_train(
    preset["model"],
    preset["dataset"]["X"],
    preset["dataset"]["y"],
    preset["init_theta"],
    iterations=preset["max_iter"],
    seed=preset["seed"],
))
final = events[-1]

print(final["accuracy"])
print(to_pennylane(
    preset["model"],
    np.asarray(final["params"]),
))`,
  },
  {
    title: 'QAOA MaxCut trainer',
    level: 'QML 4',
    body: 'A variational training loop with a cost curve, gradient norms, and a reproducible preset that maps cleanly back into qcuit.diff.',
    action: 'Train in QML Lab',
    href: '/lab?tab=trainer&preset=qaoa_maxcut&run=1',
    secondary: 'Trainer',
    lessonSlugs: ['qml-04-training-loops'],
    code: `from qcuit.diff import Adam, qaoa_maxcut_preset, train

cfg = qaoa_maxcut_preset(seed=42)
steps = list(train(
    circuit_fn=cfg["circuit_fn"],
    init_params=cfg["init_params"],
    observable=cfg["observable"],
    optimizer=Adam(lr=0.05),
    iterations=cfg["max_iter"],
    seed=cfg["seed"],
))

print(steps[-1]["loss"])`,
  },
  {
    title: 'HEP LieEQGNN benchmark',
    level: 'Research path',
    body: 'After the toy QML examples, this is the package workflow aimed at collider-style graph data and Lorentz-aware quantum blocks.',
    action: 'Open docs workflow',
    href: '/docs',
    secondary: 'qcuit.hep',
    lessonSlugs: ['qml-05-parity-classifier'],
    code: `from qcuit.hep import toy_quark_gluon_jets
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
print(report.metrics)`,
  },
];

export function examplesForLesson(slug: string): RunnableExample[] {
  return RUNNABLE_EXAMPLES.filter((example) => example.lessonSlugs.includes(slug));
}
