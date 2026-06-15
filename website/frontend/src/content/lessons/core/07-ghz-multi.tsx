import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-07-ghz-multi',
  title: 'GHZ states and multi-qubit entanglement',
  subtitle: 'When more than two qubits agree at once.',
  track: 'core',
  order: 7,
  duration_min: 12,
  objectives: [
    'Build the 3-qubit GHZ state with H + two CNOTs.',
    'Compare GHZ and W states; explain why one is more "fragile" than the other.',
    'Recognise the GHZ pattern as a verifier for genuine multipartite entanglement.',
  ],
  prerequisites: ['core-06-cnot-entangling'],
  sections: [
    {
      kind: 'read',
      title: 'GHZ-3',
      body: (
        <>
          <p>
            The <strong>Greenberger–Horne–Zeilinger (GHZ)</strong> state on three qubits is
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            |GHZ₃⟩ = (|000⟩ + |111⟩)/√2.
          </pre>
          <p>
            It is the natural three-qubit generalisation of the Bell state. Recipe: H on qubit
            0, CNOT(0→1), CNOT(1→2). Three operations; one of the cleanest demonstrations of
            genuine multi-partite entanglement.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'GHZ vs W: two flavours of three-qubit entanglement',
      body: (
        <>
          <p>
            The W state is the other inequivalent class of three-qubit entanglement:
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            |W⟩ = (|001⟩ + |010⟩ + |100⟩)/√3.
          </pre>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>GHZ is fragile:</strong> trace out one qubit and the remaining two are
              in a classical mixture — all entanglement is gone.
            </li>
            <li>
              <strong>W is robust:</strong> trace out one qubit and the other two are still
              entangled, just less so.
            </li>
          </ul>
          <p className="mt-2">
            No local operations and classical communication can turn one into the other; they
            sit in distinct equivalence classes. Both are useful in different protocols.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Why GHZ matters in practice',
      body: (
        <>
          <p>
            The Mermin inequality is a multi-qubit Bell test: a measured violation on a GHZ
            state can rule out hidden-variable theories with a single shot, in principle.
            GHZ-style stabiliser measurements also sit at the heart of error-correcting codes
            (Steane, surface) and are the workhorse of "is this device actually entangling?"
            verification.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Load the GHZ preset',
      body: (
        <>
          <p>
            Open <a href="/visualizer" className="text-vegas-gold underline">Visualizer</a>, click
            the GHZ-3 preset, and run. You should see exactly two non-zero outcomes — |000⟩
            and |111⟩ — each at 50%. Save the result as a Notebook from the top bar to record
            a citable run.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
