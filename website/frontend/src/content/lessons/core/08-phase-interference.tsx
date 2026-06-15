import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-08-phase-interference',
  title: 'Phase, interference, and the Hadamard test',
  subtitle: 'The one trick that quantum algorithms are built from.',
  track: 'core',
  order: 8,
  duration_min: 15,
  objectives: [
    'Define relative vs. global phase and explain why only relative phase is observable.',
    'Trace through the Hadamard test and read off its measurement probability.',
    'Recognise constructive and destructive interference in a 1-qubit circuit.',
  ],
  prerequisites: ['core-07-ghz-multi'],
  sections: [
    {
      kind: 'read',
      title: 'Phases — global vs. relative',
      body: (
        <>
          <p>
            A <strong>global phase</strong> is a complex unit number{' '}
            <code>e^(iγ)</code> multiplying the whole state vector. It cancels in every
            measurement probability (because <code>|e^(iγ) α|² = |α|²</code>) and is therefore
            <em>physically unobservable</em>.
          </p>
          <p>
            A <strong>relative phase</strong> is a phase factor on <em>part</em> of the
            superposition — e.g. <code>(|0⟩ + e^(iφ)|1⟩)/√2</code>. This is exactly what Z, S,
            and T gates produce, and it is exactly what shows up when you apply an H gate
            after them: the |0⟩ and |1⟩ branches recombine, and their relative phase
            determines whether they constructively or destructively interfere.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'The simplest interference',
      body: (
        <>
          <p>Compare these two circuits:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <code>H · I · H |0⟩</code> = <code>H · |+⟩</code> = <code>|0⟩</code>. Both
              branches add up; the |1⟩ amplitudes cancel.
            </li>
            <li>
              <code>H · Z · H |0⟩</code> = <code>H · |−⟩</code> = <code>|1⟩</code>. The Z
              flipped the relative phase to −1, the H swept it back to the computational
              basis, and the |0⟩ branch cancelled instead.
            </li>
          </ul>
          <p className="mt-2">
            That is destructive interference. It is the only mechanism by which quantum
            speedups happen — wrong-answer amplitudes cancel.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'The Hadamard test',
      body: (
        <>
          <p>
            Given a unitary <code>U</code> and a state <code>|ψ⟩</code>, the{' '}
            <strong>Hadamard test</strong> estimates <code>Re ⟨ψ|U|ψ⟩</code> with one
            ancilla qubit. The recipe:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Prepare ancilla in <code>|0⟩</code>, system in <code>|ψ⟩</code>.</li>
            <li>Hadamard the ancilla.</li>
            <li>Apply controlled-<code>U</code> (ancilla controls U on the system).</li>
            <li>Hadamard the ancilla again.</li>
            <li>Measure the ancilla. P(0) − P(1) = Re ⟨ψ|U|ψ⟩.</li>
          </ol>
          <p>
            This pattern — superpose, controlled-evolve, un-superpose, measure — recurs in
            phase estimation, amplitude estimation, and every modern quantum algorithm for
            chemistry. Master it once; recognise it everywhere.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Try it on the canvas',
      body: (
        <>
          <p>
            Open the Visualizer, drop H on qubit 0, then Z on qubit 0, then H again, then measure.
            You should see |1⟩ with probability 1. Now swap the middle Z for I or remove
            it entirely — you'll see |0⟩ with probability 1. That difference, with no other
            change, is interference.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
