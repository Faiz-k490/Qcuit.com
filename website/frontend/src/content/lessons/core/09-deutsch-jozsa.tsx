import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-09-deutsch-jozsa',
  title: 'Deutsch–Jozsa: the first quantum algorithm',
  subtitle: 'One oracle query versus exponentially many.',
  track: 'core',
  order: 9,
  duration_min: 18,
  objectives: [
    'State the Deutsch–Jozsa problem precisely.',
    'Trace through the 2-input circuit and see why one query suffices.',
    'Explain what an "oracle" is and why oracle separations are weaker than absolute ones.',
  ],
  prerequisites: ['core-08-phase-interference'],
  sections: [
    {
      kind: 'read',
      title: 'The problem',
      body: (
        <>
          <p>
            You are given a black-box function <code>f : {'{0,1}ⁿ → {0,1}'}</code> with a
            promise: <em>either f is constant</em> (same output on every input) <em>or f is
            balanced</em> (outputs 0 on exactly half its inputs and 1 on the other half).
            Decide which.
          </p>
          <p>
            Classically, in the worst case you need to query f on{' '}
            <code>2ⁿ⁻¹ + 1</code> inputs to be sure. Quantumly, Deutsch–Jozsa decides it with
            a <em>single</em> oracle query. That gap was the first concrete demonstration of
            quantum speedup, in 1992.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'The recipe',
      body: (
        <>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Prepare <code>n</code> input qubits in <code>|0⟩ⁿ</code> and one ancilla in <code>|1⟩</code>.</li>
            <li>Apply H to all <code>n + 1</code> qubits.</li>
            <li>Apply the oracle <code>U_f</code>: maps <code>|x⟩|y⟩</code> to <code>|x⟩|y ⊕ f(x)⟩</code>.</li>
            <li>Apply H to the <code>n</code> input qubits.</li>
            <li>Measure them. If you see all zeros, f is constant; otherwise f is balanced.</li>
          </ol>
          <p className="mt-2">
            The "phase-kickback" trick is the heart of it. With the ancilla in <code>|−⟩</code>,
            applying U_f puts the value of <code>f(x)</code> into the phase of the input
            register: the inputs branch becomes{' '}
            <code>Σ (−1)^f(x) |x⟩</code>, normalised. A final H on the inputs then makes the
            "constant" and "balanced" cases interfere into orthogonal outcomes.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'What "oracle separation" means',
      body: (
        <>
          <p>
            Deutsch–Jozsa is dramatic, but its speedup is <em>relative to a black-box</em>{' '}
            model — you only beat classical when you can't peek inside f. In the real world we
            usually <em>can</em> peek inside f, in which case classical algorithms exploit
            structure and the gap shrinks. Bernstein–Vazirani and Simon's algorithm (and
            ultimately Shor) build on the same phase-kickback machinery and produce
            speedups that survive scrutiny.
          </p>
          <p>
            Treat oracle results as evidence of an interesting <em>technique</em>, not a
            promise of practical advantage. The technique is what we are here for.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Run Deutsch–Jozsa for n = 2',
      body: (
        <>
          <p>
            In the Visualizer, load the Deutsch-Jozsa gallery notebook (Lab → Notebook → Gallery →
            Deutsch–Jozsa). The preset uses an oracle that XORs both input bits into the
            ancilla — that is, <code>f(x) = x₀ ⊕ x₁</code>, balanced. Run; measure the input
            qubits; observe that you never see |00⟩. That single result confirms the function
            is balanced.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
