import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-01-why-quantum',
  title: 'Why quantum?',
  subtitle: 'A bit, a qubit, and a deep reason for the difference.',
  track: 'core',
  order: 1,
  duration_min: 10,
  objectives: [
    'State the difference between a classical bit and a qubit in one sentence each.',
    'Explain why "trying every option in parallel" is the wrong intuition for quantum speedup.',
    'Name three problems where quantum computers are believed to help, and one where they are not.',
  ],
  prerequisites: [],
  sections: [
    {
      kind: 'read',
      title: 'The bit, sharpened',
      body: (
        <>
          <p>
            A <strong>classical bit</strong> is the simplest possible piece of information: it is
            either <code>0</code> or <code>1</code>. Every digital device you have ever used —
            phones, satellites, the screen in front of you — is, at the lowest level, a vast
            choreography of bits being copied, compared, and flipped according to fixed rules.
          </p>
          <p>
            A <strong>qubit</strong> is the simplest possible piece of <em>quantum</em>{' '}
            information. When we measure it, we always read out either <code>0</code> or{' '}
            <code>1</code> — just like a bit. The difference is that <em>between</em>{' '}
            measurements, the qubit is described by a pair of complex numbers,{' '}
            <code>(α, β)</code>, with <code>|α|² + |β|² = 1</code>. We call this a{' '}
            <em>state vector</em>. The numbers themselves never appear in any measurement
            outcome; only their <em>squared magnitudes</em> do, as the probabilities of seeing{' '}
            <code>0</code> or <code>1</code>.
          </p>
          <p>
            That sounds like a glorified coin flip, and so far it is. The interesting part is
            that quantum operations act on <code>(α, β)</code> directly, and they can move
            those numbers around in ways that classical probabilities simply cannot — most
            importantly, they can <em>cancel</em>, the way two waves on water can cancel where a
            peak meets a trough. This phenomenon is called <strong>interference</strong>, and
            it is the only honest reason anyone expects quantum computers to outperform classical
            ones.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'The "parallel universe" myth',
      body: (
        <>
          <p>
            Pop-science articles often describe quantum computers as "trying every possible
            answer at once." This is wrong in a way that will mislead you for years if you
            accept it. A quantum algorithm does not check every option in some hidden parallel
            world; it builds a superposition in which the <em>wrong</em> answers' amplitudes
            cancel out, leaving the right answer with high probability of being measured.
          </p>
          <p>
            If quantum computers really were "search 2ⁿ branches in parallel," they would solve
            NP-complete problems in polynomial time. The strong evidence is that they cannot.
            Quantum speedups, where they exist, come from very specific structures — periodicity
            (Shor), amplitude amplification (Grover), simulating Hamiltonians (chemistry, materials).
            Most problems get no quantum speedup at all.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'Where quantum is believed to help',
      body: (
        <>
          <p>A short, honest tour:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Factoring large integers</strong> — Shor's algorithm, exponential speedup
              over the best known classical methods. This is why post-quantum cryptography is
              real funding, not a curiosity.
            </li>
            <li>
              <strong>Quantum chemistry &amp; materials</strong> — simulating molecules and
              lattices whose state space grows as 2ⁿ. Cheaper-than-classical answers for
              ground-state energies are the leading candidate for the first practically useful
              quantum advantage.
            </li>
            <li>
              <strong>Unstructured search</strong> — Grover's algorithm gives a quadratic
              speedup. Useful, but not the "exponential" story most people imagine.
            </li>
            <li>
              <strong>Specific linear-algebra subroutines</strong> — when the matrix has the
              right structure and the answer is a property of the whole state, not a specific
              entry.
            </li>
          </ul>
          <p className="italic text-isabelline/60">
            Where it doesn't: most general-purpose computing, most "AI" workloads, anything
            limited by I/O rather than computation. The wins are real but narrow.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Look at one qubit, right now',
      body: (
        <>
          <p>
            Here is a single qubit in the state <code>|0⟩</code> (the north pole of the Bloch
            sphere). Drag the slider to rotate it. The bottom panel shows the amplitudes{' '}
            <code>α</code>, <code>β</code> and the measurement probabilities. Notice that the
            probabilities never go negative, and they always sum to 1 — but they do change
            continuously as you rotate.
          </p>
          <p>
            You are looking at the single physical phenomenon that makes the rest of this
            curriculum interesting. Nothing else.
          </p>
        </>
      ),
      widget: { kind: 'RotationSlider', config: { axis: 'Y', theta: 0 } },
    },
  ],
};

export default lesson;
