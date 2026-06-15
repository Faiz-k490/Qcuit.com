import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'qml-03-ansatze',
  title: 'Variational ansätze',
  subtitle: 'How to choose a parametrised circuit.',
  track: 'qml',
  order: 3,
  duration_min: 14,
  objectives: [
    'Recognise the three workhorse ansätze: hardware-efficient, real-amplitudes, SEL.',
    'State the expressivity-trainability tradeoff in one sentence.',
    'Identify "barren plateaus" and how to avoid them.',
  ],
  prerequisites: ['qml-02-encoding-data'],
  sections: [
    {
      kind: 'read',
      title: 'Three families',
      body: (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Hardware-efficient</strong> — alternating layers of single-qubit
              rotations and CNOTs along the device's native coupling graph. Cheap to run, but
              with no problem-specific structure: gradients vanish exponentially with qubit
              count for deep versions.
            </li>
            <li>
              <strong>Real-amplitudes</strong> — RY rotations only, plus CNOTs. The output
              statevector is always real, halving the parameter space and often dramatically
              improving trainability on classification tasks.
            </li>
            <li>
              <strong>Strongly-entangling layers (SEL)</strong> — three rotations per qubit
              (full SU(2)) plus a ring of CNOTs. The most expressive of the three; also the
              most prone to barren plateaus.
            </li>
          </ul>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Expressivity vs. trainability',
      body: (
        <>
          <p>
            A more expressive ansatz can approximate more functions; it can also have
            <em> exponentially vanishing gradients</em> over most of parameter space (a
            "barren plateau"). McClean et al. 2018 showed that for sufficiently random ansätze
            this is unavoidable.
          </p>
          <p>
            Practical mitigations: shallow layers, structured initialisation (small rotation
            angles), problem-aware ansatz design (Hamiltonian-Variational, QAOA-style), and
            using local cost functions instead of global ones.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'Counting parameters',
      body: (
        <>
          <p>For an n-qubit, L-layer hardware-efficient ansatz with one rotation block per layer:</p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            #params = n · L  (one RY per qubit per layer)
          </pre>
          <p>
            For SEL with three rotations per qubit per layer: <code>3 · n · L</code>. The
            parameter-shift gradient costs <em>two</em> circuit evaluations per parameter, so
            one Adam step on a 5-qubit, 4-layer SEL costs 120 circuit runs.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Hand-roll a tiny ansatz',
      body: (
        <>
          <p>
            In the Visualizer, build the following on 2 qubits: RY(θ₀) on qubit 0, RY(θ₁) on qubit 1,
            CNOT(0→1), RY(θ₂) on qubit 0, RY(θ₃) on qubit 1. That is one layer of a
            real-amplitudes ansatz with linear entanglement. Save as a notebook so you have a
            citable snapshot to compare against the trained QNN models in the next lesson.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
