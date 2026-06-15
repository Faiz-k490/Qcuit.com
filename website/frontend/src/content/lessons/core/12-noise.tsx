import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-12-noise',
  title: 'Noise and error budgets',
  subtitle: 'What goes wrong, how much, and why fault tolerance matters.',
  track: 'core',
  order: 12,
  duration_min: 15,
  objectives: [
    'Name T1, T2, gate error, and readout error and what each measures.',
    'Estimate the fidelity of a circuit given per-gate error rates.',
    'Explain why error correction is required for any useful long quantum computation.',
  ],
  prerequisites: ['core-11-qft'],
  sections: [
    {
      kind: 'read',
      title: 'The four numbers your hardware sheet shows',
      body: (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>T1 (relaxation time)</strong> — average time for a qubit in |1⟩ to decay
              to |0⟩. Modern superconducting qubits: ~100 µs.
            </li>
            <li>
              <strong>T2 (coherence time)</strong> — how long a superposition keeps its phase
              before being scrambled. Typically T2 ≤ 2 T1; in practice T2 ≈ T1 on good devices.
            </li>
            <li>
              <strong>Single-qubit gate error</strong> — probability the gate did the wrong
              thing. Best superconducting: ~10⁻⁴. Trapped ions: ~10⁻⁵.
            </li>
            <li>
              <strong>Two-qubit gate error</strong> — the limiting factor. Best
              superconducting: ~5×10⁻³. Trapped ions: ~10⁻³.
            </li>
            <li>
              <strong>Readout error</strong> — measurement misclassification. 1–3% on most
              platforms; mitigated with confusion-matrix calibration.
            </li>
          </ul>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'A back-of-envelope error budget',
      body: (
        <>
          <p>
            For a circuit with <code>g</code> gates and per-gate error <code>p</code>, the
            probability of <em>no</em> error is roughly <code>(1−p)^g ≈ e^(−p·g)</code>. With
            <code> p = 5×10⁻³</code> (CNOT error), this drops to 1/e at <code>g ≈ 200</code>
            two-qubit gates. Above that, the signal is gone.
          </p>
          <p>
            Real circuits have hundreds to thousands of gates. <em>Without</em> error
            correction, anything interesting is unreachable.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'How error correction saves us',
      body: (
        <>
          <p>
            Quantum error-correcting codes encode 1 logical qubit into many physical qubits.
            Below the <em>threshold</em> (per-qubit error around 10⁻³ for the surface code),
            adding more physical qubits exponentially suppresses the logical error rate.
            Recent superconducting devices have crossed this threshold for distance-3 and
            distance-5 surface codes — the first real evidence that the architecture scales.
          </p>
          <p>
            We will return to all of this in detail in the QEC sandbox lessons. For now, the
            point is: noise is a quantitative engineering problem with a known mathematical
            solution.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Move the noise slider',
      body: (
        <>
          <p>
            Open the Visualizer, load the Bell preset, set the noise slider to 1%, 5%, 10%, and run.
            Watch the off-diagonal probabilities (|01⟩, |10⟩) rise from zero as noise
            scrambles the Bell state. Save runs as notebooks — having a hash for each noise
            level is the easiest way to plot fidelity vs noise later.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
