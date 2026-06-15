import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-03-single-qubit-gates',
  title: 'Single-qubit gates',
  subtitle: 'Pauli, Hadamard, S, T — the alphabet of one qubit.',
  track: 'core',
  order: 3,
  duration_min: 15,
  objectives: [
    'Recognise the Pauli matrices X, Y, Z and the Hadamard H by sight.',
    'State what each gate does to the basis states |0⟩, |1⟩, |+⟩, |−⟩.',
    'Explain why T is the gate that makes the Clifford set universal.',
  ],
  prerequisites: ['core-02-qubit-bloch'],
  sections: [
    {
      kind: 'read',
      title: 'Gates are unitary matrices',
      body: (
        <>
          <p>
            A single-qubit gate is a <strong>2 × 2 unitary matrix</strong> — that is, a matrix{' '}
            <code>U</code> with <code>U†U = I</code>. Unitary means the gate preserves
            <em> total probability</em>: if you go in with <code>|α|² + |β|² = 1</code>, you
            come out with the same. Quantum computing is exactly linear algebra under that one
            constraint.
          </p>
          <p>
            Apply a gate by matrix multiplication: <code>|ψ'⟩ = U|ψ⟩</code>. That is the
            whole rulebook for one qubit.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'The standard alphabet',
      body: (
        <>
          <table className="font-mono text-[12px] mt-1 leading-relaxed">
            <thead>
              <tr className="text-vegas-gold/70 text-left">
                <th className="pr-5">Gate</th>
                <th className="pr-5">Matrix</th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody className="text-isabelline/85">
              <tr><td>I</td><td className="pr-5">[[1,0],[0,1]]</td><td>do nothing</td></tr>
              <tr><td>X</td><td className="pr-5">[[0,1],[1,0]]</td><td>bit flip · 180° around x</td></tr>
              <tr><td>Y</td><td className="pr-5">[[0,−i],[i,0]]</td><td>bit + phase flip · 180° around y</td></tr>
              <tr><td>Z</td><td className="pr-5">[[1,0],[0,−1]]</td><td>phase flip · 180° around z</td></tr>
              <tr><td>H</td><td className="pr-5">[[1,1],[1,−1]]/√2</td><td>swap z &lt;-&gt; x axis</td></tr>
              <tr><td>S</td><td className="pr-5">[[1,0],[0,i]]</td><td>90° around z</td></tr>
              <tr><td>T</td><td className="pr-5">[[1,0],[0,e^(iπ/4)]]</td><td>45° around z</td></tr>
            </tbody>
          </table>
          <p className="mt-3">
            Pauli-X is the quantum NOT gate: <code>X|0⟩ = |1⟩</code>, <code>X|1⟩ = |0⟩</code>.
            Hadamard turns basis states into equal superpositions: <code>H|0⟩ = |+⟩</code>,{' '}
            <code>H|1⟩ = |−⟩</code>. Z flips the sign of |1⟩ but leaves |0⟩ alone — a
            phase that is invisible in the computational basis but flips |+⟩ ↔ |−⟩.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Why T is special',
      body: (
        <>
          <p>
            The set <code>{'{H, S, CNOT}'}</code> generates the <em>Clifford group</em>, which is
            efficiently simulable on classical hardware (the Gottesman–Knill theorem). Add the
            T gate and you can approximate any single-qubit unitary to arbitrary precision; add
            CNOT and you have a universal gate set for quantum computation.
          </p>
          <p>
            Practically, T gates are the <em>expensive</em> ones on every fault-tolerant
            architecture — they require magic-state distillation. Counting T-gates in a circuit
            is the closest quantum equivalent to counting FLOPs in classical computing.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Build intuition with rotations',
      body: (
        <>
          <p>
            X, Y, Z are 180° rotations around their respective axes. S is a 90° rotation
            around z; T is a 45° rotation around z. Sliding the rotation widget below tells
            you everything about how these gates compose.
          </p>
          <p className="italic text-isabelline/60">
            Try the sequence: pick axis Y, set θ = π/2 (that is exactly H, up to a global phase).
            Then switch to axis Z and add π/2 — that is HS. Notice how the Bloch arrow lands on
            the y-axis: that is the state |+i⟩.
          </p>
        </>
      ),
      widget: { kind: 'RotationSlider', config: { axis: 'X', theta: 0 } },
    },
  ],
};

export default lesson;
