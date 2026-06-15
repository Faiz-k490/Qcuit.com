import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'qml-04-training-loops',
  title: 'Training loops and the parameter-shift rule',
  subtitle: 'How a quantum circuit learns without autograd.',
  track: 'qml',
  order: 4,
  duration_min: 16,
  objectives: [
    'State the parameter-shift rule for Pauli rotations.',
    'Compare param-shift vs. finite differences in cost and accuracy.',
    'Pick an optimiser (SGD, Adam, COBYLA) for a QML task.',
  ],
  prerequisites: ['qml-03-ansatze'],
  sections: [
    {
      kind: 'read',
      title: 'The parameter-shift rule',
      body: (
        <>
          <p>
            For a gate of the form <code>R(θ) = e^(−i θ G / 2)</code> with <code>G² = I</code>{' '}
            (i.e. RX, RY, RZ — the Pauli rotations), the gradient of any expectation value of
            the output state with respect to <code>θ</code> is
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            ∂ ⟨H⟩(θ) / ∂θ = (⟨H⟩(θ + π/2) − ⟨H⟩(θ − π/2)) / 2.
          </pre>
          <p>
            That is <em>exact</em>, not a finite-difference approximation. Two circuit
            evaluations per parameter, identical to the noisy reality of running on hardware.
            It is the single most important formula in QML.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'Versus finite differences',
      body: (
        <>
          <p>
            A standard finite-difference gradient <code>(L(θ+h) − L(θ−h)) / (2h)</code> works
            with any θ-shift <code>h</code>, but for small <code>h</code> the numerical noise
            dominates, and for large <code>h</code> the truncation error grows. Parameter-shift
            picks the optimal <code>h = π/2</code> from the structure of the gate. No
            hyperparameter to tune.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Optimisers in practice',
      body: (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>SGD</strong> — simple, robust, slow. Fine for warm-up.</li>
            <li><strong>Adam</strong> — adaptive momentum. The default for noisy gradients.</li>
            <li><strong>SPSA</strong> — simultaneous perturbation, hardware-friendly because
              it samples the gradient with one shifted evaluation regardless of parameter count.</li>
            <li><strong>COBYLA / Nelder–Mead</strong> — derivative-free, useful when shot
              noise drowns out parameter-shift accuracy.</li>
          </ul>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Open the Trainer panel',
      body: (
        <>
          <p>
            When Phase 5 ships, Lab → Trainer will let you watch VQE-H2 converge with Adam in
            the browser. Until then: pick a 1-qubit RY(θ), set θ to a non-zero value, and
            compute the parameter-shift gradient by hand for the observable <code>Z</code>.
            You should find <code>−sin(θ)</code>. The Visualizer canvas + the right-pane Qiskit
            export are enough to verify the formula end-to-end.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
