import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-02-qubit-bloch',
  title: 'The qubit and the Bloch sphere',
  subtitle: 'A geometric picture of one quantum bit.',
  track: 'core',
  order: 2,
  duration_min: 15,
  objectives: [
    'Write a single-qubit state as α|0⟩ + β|1⟩ with the normalisation constraint.',
    'Map any single-qubit state to a point on the Bloch sphere, given (θ, φ).',
    'Identify the six "named" points: |0⟩, |1⟩, |+⟩, |−⟩, |+i⟩, |−i⟩.',
  ],
  prerequisites: ['core-01-why-quantum'],
  sections: [
    {
      kind: 'read',
      title: 'Notation, briefly',
      body: (
        <>
          <p>
            The two basis states of a qubit are written <code>|0⟩</code> and <code>|1⟩</code>{' '}
            — read aloud as "ket zero" and "ket one." The angled-bracket notation is due to
            Dirac and saves us from carrying around column-vector brackets every time.
          </p>
          <p>
            A general pure state is
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            |ψ⟩ = α|0⟩ + β|1⟩,   α, β ∈ ℂ,   |α|² + |β|² = 1
          </pre>
          <p>
            The constraint <code>|α|² + |β|² = 1</code> is just the statement that the
            measurement probabilities sum to 1. <em>It is not a deep physical law</em>; it is
            the cost of writing probability with complex amplitudes.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Two angles instead of two complex numbers',
      body: (
        <>
          <p>
            Two complex numbers is four real numbers. The normalisation removes one and
            the global phase (an overall multiplier <code>e^(iγ)</code> that no measurement
            can detect) removes another. We are left with two real parameters: a polar angle{' '}
            <code>θ ∈ [0, π]</code> and an azimuthal angle <code>φ ∈ [0, 2π)</code>, with
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ) sin(θ/2)|1⟩.
          </pre>
          <p>
            Two real angles &rArr; a point on the surface of a unit sphere. That sphere is the{' '}
            <strong>Bloch sphere</strong>. <code>|0⟩</code> sits at the north pole,{' '}
            <code>|1⟩</code> at the south, <code>|+⟩</code> on the equator at <code>φ = 0</code>,
            and so on. Single-qubit gates are rotations of this sphere — nothing more exotic.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'Six named points',
      body: (
        <>
          <p>Keep these in your head; they recur everywhere:</p>
          <table className="font-mono text-[12px] mt-2">
            <thead>
              <tr className="text-vegas-gold/70 text-left">
                <th className="pr-6">State</th>
                <th className="pr-6">Vector</th>
                <th>Bloch direction</th>
              </tr>
            </thead>
            <tbody className="text-isabelline/85">
              <tr><td>|0⟩</td><td className="pr-6">(1, 0)</td><td>+z</td></tr>
              <tr><td>|1⟩</td><td className="pr-6">(0, 1)</td><td>−z</td></tr>
              <tr><td>|+⟩</td><td className="pr-6">(1, 1)/√2</td><td>+x</td></tr>
              <tr><td>|−⟩</td><td className="pr-6">(1, −1)/√2</td><td>−x</td></tr>
              <tr><td>|+i⟩</td><td className="pr-6">(1, i)/√2</td><td>+y</td></tr>
              <tr><td>|−i⟩</td><td className="pr-6">(1, −i)/√2</td><td>−y</td></tr>
            </tbody>
          </table>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Drive the Bloch arrow',
      body: (
        <>
          <p>
            Pick an axis (X, Y, or Z) and slide θ. The Bloch arrow traces out a great circle
            on the sphere. Watch the amplitudes update; watch what happens to the
            probabilities at θ = π/2 versus θ = π.
          </p>
          <p>
            One thing to notice: <strong>Z rotations</strong> do not change the measurement
            probabilities at all (the arrow stays at the pole). That is because Z only changes
            the <em>relative phase</em> between |0⟩ and |1⟩, and a phase on |0⟩ alone is
            invisible to a measurement of |1⟩'s probability. Phases only become observable
            once you mix the basis — which is exactly what H does.
          </p>
        </>
      ),
      widget: { kind: 'RotationSlider', config: { axis: 'Y', theta: 0 } },
    },
  ],
};

export default lesson;
