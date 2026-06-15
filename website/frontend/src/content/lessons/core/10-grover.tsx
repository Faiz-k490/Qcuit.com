import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-10-grover',
  title: 'Grover search',
  subtitle: 'Quadratic speedup for unstructured search.',
  track: 'core',
  order: 10,
  duration_min: 18,
  objectives: [
    'State the unstructured-search problem and the Grover speedup precisely.',
    'Decompose one Grover iteration into oracle + diffuser.',
    'Estimate the optimal number of iterations as π/4 · √N.',
  ],
  prerequisites: ['core-09-deutsch-jozsa'],
  sections: [
    {
      kind: 'read',
      title: 'The problem',
      body: (
        <>
          <p>
            Given a black-box function <code>f : {'{0,1}ⁿ → {0,1}'}</code> with the promise that
            exactly one input <code>x*</code> satisfies <code>f(x*) = 1</code>, find it.
            Classically: worst case <code>2ⁿ</code> queries, average <code>2ⁿ⁻¹</code>.
            Grover does it in <code>~ π/4 · √2ⁿ</code> oracle queries.
          </p>
          <p>
            Quadratic, not exponential. Modest. But for moderate <code>n</code> and an oracle
            that genuinely has no exploitable structure, it is the best you can hope for —
            and it is provably optimal (Bennett–Bernstein–Brassard–Vazirani, 1997).
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'One Grover iteration',
      body: (
        <>
          <p>The algorithm starts with the uniform superposition <code>H⊗ⁿ |0⟩ⁿ</code>. Each iteration applies:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>
              <strong>Oracle</strong> <code>O</code>: flip the sign of the marked state.
              <code>|x⟩ ↦ (−1)^f(x) |x⟩</code>.
            </li>
            <li>
              <strong>Diffuser</strong> <code>D = 2|s⟩⟨s| − I</code>: reflect about the uniform
              superposition <code>|s⟩</code>. In gates: <code>H⊗ⁿ · (2|0⟩⟨0| − I) · H⊗ⁿ</code>.
            </li>
          </ol>
          <p className="mt-2">
            Geometrically, each iteration is a rotation by angle <code>2θ</code> (where{' '}
            <code>sin θ = 1/√N</code>) in the 2D plane spanned by <code>|x*⟩</code> and the
            uniform superposition over wrong answers. After <code>k ≈ π/(4θ)</code> rotations
            you land near <code>|x*⟩</code> and measurement returns the answer with high
            probability.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'When to stop',
      body: (
        <>
          <p>
            Iterate too few times and the amplitude on <code>|x*⟩</code> is still small.
            Iterate too many and you <em>overshoot</em> — the amplitude swings back down. The
            sweet spot is <code>k* = round(π/4 · √N)</code>. For N = 4 that is 1 iteration; for
            N = 16, 3 iterations; for N = 1024, about 25.
          </p>
          <p>
            Fixed-point amplitude amplification variants remove the overshoot worry at the
            cost of slightly worse constants — a useful trick when N is unknown.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Grover for n = 2',
      body: (
        <>
          <p>
            Load the Grover-3 gallery notebook (Lab → Notebook → Gallery → Grover). The
            included circuit is a sketch — one H layer, one oracle, one diffuser. Run it; you
            should see the marked outcome dominate.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
