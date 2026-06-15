import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-05-two-qubits-entanglement',
  title: 'Two qubits and entanglement',
  subtitle: 'Where the state space stops factoring.',
  track: 'core',
  order: 5,
  duration_min: 15,
  objectives: [
    'Write a separable two-qubit state and recognise when one is not.',
    'Construct |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 by hand from H + CNOT.',
    'State what "measuring one qubit instantly tells you the other" really means.',
  ],
  prerequisites: ['core-04-superposition-measurement'],
  sections: [
    {
      kind: 'read',
      title: 'Two qubits, four basis states',
      body: (
        <>
          <p>
            A two-qubit system has basis states <code>|00⟩, |01⟩, |10⟩, |11⟩</code>. A general
            state is a unit vector in 4-dimensional complex space:
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            |ψ⟩ = a|00⟩ + b|01⟩ + c|10⟩ + d|11⟩,  |a|² + |b|² + |c|² + |d|² = 1.
          </pre>
          <p>
            Some states factor as a tensor product of two independent qubits:{' '}
            <code>|ψ⟩ = |q₀⟩ ⊗ |q₁⟩</code>. These are called <strong>separable</strong>. The
            remaining ones are <strong>entangled</strong>. Entanglement is the resource that
            gives quantum computing its character — without it, quantum circuits are just
            single-qubit parallelism with extra steps.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'The canonical Bell state',
      body: (
        <>
          <p>
            The four <strong>Bell states</strong> are the orthonormal basis of maximally
            entangled two-qubit states. The first one,
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            |Φ⁺⟩ = (|00⟩ + |11⟩)/√2,
          </pre>
          <p>
            is built by two gates: Hadamard on qubit 0, then CNOT with qubit 0 as control and
            qubit 1 as target. Walk through it:
          </p>
          <ol className="list-decimal pl-5 space-y-1 mt-2">
            <li>Start in |00⟩.</li>
            <li>Apply H to qubit 0: <code>(|00⟩ + |10⟩)/√2</code>.</li>
            <li>Apply CNOT (0 → 1): <code>(|00⟩ + |11⟩)/√2</code> = |Φ⁺⟩.</li>
          </ol>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'What "instant" correlation is not',
      body: (
        <>
          <p>
            If two qubits in |Φ⁺⟩ are taken to opposite ends of the galaxy and someone measures
            the first qubit, the other becomes definite immediately. That sounds like
            faster-than-light signalling — it isn't. Both observers see uniformly random
            outcomes on their own. The correlation only becomes visible when they compare
            notes, and that comparison travels at most at the speed of light. Quantum mechanics
            preserves locality where it matters: in what you can <em>do</em>, not in the
            mathematical correlations.
          </p>
          <p>
            Practically, entanglement is what lets quantum algorithms encode complex global
            structure: parity checks, interference patterns across many qubits, fast classical
            communication via teleportation.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Build the Bell state, step by step',
      body: (
        <>
          <p>
            The widget below walks you through H, then CNOT, then measurement. After all three
            you should see a 50/50 distribution between |00⟩ and |11⟩, with zero probability
            on |01⟩ and |10⟩. That zero is the entanglement.
          </p>
        </>
      ),
      widget: { kind: 'BellPairBuilder' },
    },
  ],
};

export default lesson;
