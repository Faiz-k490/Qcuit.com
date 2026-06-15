import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-04-superposition-measurement',
  title: 'Superposition and measurement',
  subtitle: 'What H|0⟩ really means, and what 8192 shots show you.',
  track: 'core',
  order: 4,
  duration_min: 12,
  objectives: [
    'Distinguish a superposition from a classical probability distribution.',
    'Explain why measurement "collapses" the state and why this is not a paradox.',
    'Recognise sampling noise versus genuine quantum uncertainty in a histogram.',
  ],
  prerequisites: ['core-03-single-qubit-gates'],
  sections: [
    {
      kind: 'read',
      title: 'A superposition is not a hidden coin',
      body: (
        <>
          <p>
            <code>H|0⟩ = (|0⟩ + |1⟩)/√2</code>. The probability of seeing 0 is{' '}
            <code>|1/√2|² = 1/2</code>, and the probability of 1 is also 1/2.
          </p>
          <p>
            A naive reading: "the qubit is secretly 0 or 1 with 50/50 odds, we just don't
            know which." That reading <em>is wrong</em> and the difference matters as soon as
            you apply <em>another</em> H gate before measuring:
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            H(H|0⟩) = H((|0⟩ + |1⟩)/√2) = |0⟩.
          </pre>
          <p>
            Two H gates in a row return you to <em>certain</em> |0⟩, with probability 1. If
            the state between them were a classical 50/50 mixture, no operation could
            re-collapse it to a definite outcome. The interference between the |0⟩ and |1⟩
            branches — including their signs — is doing real work.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Measurement, demystified',
      body: (
        <>
          <p>
            Measurement in the computational basis is one operation: project the state onto{' '}
            <code>|0⟩</code> or <code>|1⟩</code>, return the corresponding bit, and replace
            the state with the chosen basis vector. The "collapse" is just the bookkeeping for
            "now we know the answer."
          </p>
          <p>
            There is no philosophical mystery you need to solve to use quantum gates. You only
            need two rules: <strong>(1)</strong> while the qubit is closed off from the world,
            it evolves by unitary matrices; <strong>(2)</strong> when you read it out, you get
            outcome <code>k</code> with probability <code>|⟨k|ψ⟩|²</code>.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'Sampling vs. the wavefunction',
      body: (
        <>
          <p>
            The histogram of shot outcomes is <em>not</em> the wavefunction. The wavefunction
            is exact and fixed; the histogram is a noisy estimate of <code>|⟨k|ψ⟩|²</code> that
            shrinks like 1/√N as you increase the shot count. Always separate "I see 504 ones
            out of 1000" from "the probability of 1 is 0.5."
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Slide N up and watch the noise shrink',
      body: (
        <>
          <p>
            Below is the canonical experiment: sample H|0⟩ N times. Move from 1 shot to 8192.
            With one shot you see either 0 or 1, nothing more. With 8192 you see ratios within a
            half-percent of 0.5. The quantum mechanics is the same; the statistics improve.
          </p>
        </>
      ),
      widget: { kind: 'MeasurementHistogram' },
    },
  ],
};

export default lesson;
