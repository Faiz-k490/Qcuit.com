import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'qml-05-parity-classifier',
  title: 'A complete QNN — the parity classifier',
  subtitle: 'End-to-end model that lands in 30 seconds.',
  track: 'qml',
  order: 5,
  duration_min: 18,
  objectives: [
    'Describe the parity dataset and why it is the QML "hello world."',
    'Specify a 4-qubit encoder + ansatz + observable that achieves ≥95% accuracy.',
    'Read the trained-model export and run it independently with PennyLane / Qiskit-ML.',
  ],
  prerequisites: ['qml-04-training-loops'],
  sections: [
    {
      kind: 'read',
      title: 'The parity dataset',
      body: (
        <>
          <p>
            Inputs are random 4-bit strings <code>x ∈ {'{0,1}⁴'}</code>. The label is the parity:
            <code> y = x₀ ⊕ x₁ ⊕ x₂ ⊕ x₃</code>. There are 16 possible inputs; 8 have parity 0
            and 8 have parity 1.
          </p>
          <p>
            Parity is a notoriously bad task for a single classical perceptron and a
            <em> trivial</em> task for a small quantum circuit — a single ZZZZ observable on
            the right state literally <em>computes the parity</em>. It is the canonical
            quantum sanity check.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'A minimal architecture',
      body: (
        <>
          <p>
            Recipe:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li><strong>Encoder.</strong> Angle encoding: <code>RY(π · xᵢ)</code> on each qubit.</li>
            <li><strong>Ansatz.</strong> 4 layers of real-amplitudes (one RY per qubit per layer + a CNOT ring).</li>
            <li><strong>Observable.</strong> <code>Z⊗Z⊗Z⊗Z</code> (parity-of-Z).</li>
            <li><strong>Loss.</strong> Mean squared error between the observable expectation
              and the (±1)-encoded label.</li>
            <li><strong>Optimiser.</strong> Adam, lr = 0.05, 100 iterations.</li>
          </ol>
          <p className="mt-2">
            Parameter count: 16 (4 qubits × 4 layers). Gradient cost: 32 circuit evals per
            step. The whole training run is ~3200 circuit evaluations on 16 data points —
            seconds on a laptop CPU.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Reading the trained export',
      body: (
        <>
          <p>
            The QNN Workbench can emit a standalone PennyLane (and
            Qiskit-ML) Python file containing the encoder, ansatz, trained parameters, and an
            inference loop. The file runs without Qcuit — paste it into a fresh Python
            environment and it predicts the same outputs.
          </p>
          <p>
            Pair the export with the Phase 3 Notebook save: the run hash on the QNN's training
            curve gives you a citable, reproducible reference for any results you publish.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Until Phase 6 ships',
      body: (
        <>
          <p>
            You can already prototype the encoder-and-ansatz half today. In the Visualizer, build:
            RY(θ₀) on q0, RY(θ₁) on q1, RY(θ₂) on q2, RY(θ₃) on q3 (the encoder); then a
            CNOT ring (0→1, 1→2, 2→3, 3→0) and a second RY layer (the ansatz). Save it as a
            notebook. Once Phase 6's trainer lands, this same circuit will be trainable from
            the Lab pane and the resulting parameters round-tripped into a downloadable
            script.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
