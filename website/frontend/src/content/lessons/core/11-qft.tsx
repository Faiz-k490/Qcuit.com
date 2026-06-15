import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-11-qft',
  title: 'The quantum Fourier transform',
  subtitle: 'The engine behind Shor and phase estimation.',
  track: 'core',
  order: 11,
  duration_min: 18,
  objectives: [
    'Write the QFT acting on n qubits as a tensor product of single-qubit rotations.',
    'Count the gates: O(n²) for QFT vs. O(n · 2ⁿ) for the classical FFT on a 2ⁿ-vector.',
    'Recognise where QFT shows up in Shor, phase estimation, and HHL.',
  ],
  prerequisites: ['core-10-grover'],
  sections: [
    {
      kind: 'read',
      title: 'Definition',
      body: (
        <>
          <p>
            The <strong>discrete Fourier transform</strong> on a vector of length <code>N = 2ⁿ</code>{' '}
            takes <code>x → ŷ</code> with <code>ŷₖ = (1/√N) Σⱼ x_j · e^(2πi jk / N)</code>. The
            <strong> quantum</strong> Fourier transform applies exactly that linear map to a
            quantum state amplitude vector:
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            QFT|j⟩ = (1/√N) Σₖ e^(2πi jk / N) |k⟩.
          </pre>
          <p>
            The catch: the QFT acts on <em>amplitudes</em>, which we cannot read out directly.
            On its own the QFT is not faster than the classical FFT — and is in fact{' '}
            <em>worse</em> for general signal-processing tasks. It is useful only when it is a
            <em> subroutine</em> in an algorithm whose output is a small, low-entropy
            measurement (Shor: a period; phase estimation: an eigenphase).
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'The decomposition',
      body: (
        <>
          <p>
            The QFT on <code>n</code> qubits decomposes into <code>n</code> Hadamards and{' '}
            <code>n(n−1)/2</code> controlled phase gates, plus bit-reversal SWAPs at the end.
            On 3 qubits, the network looks like:
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85 leading-relaxed">
            q0 ─ H ─ Rₖ(π/2) ─ Rₖ(π/4) ─────── × ─
            q1 ─────── ─●─── ─ H ── Rₖ(π/2) ─ │ ─
            q2 ─────────── ─────● ─── ─● ── H ─ × ─
          </pre>
          <p>
            The phase rotations <code>Rₖ(θ) = diag(1, e^(iθ))</code> get progressively smaller
            and are usually <em>truncated</em> in practice — the AQFT (approximate QFT) drops
            rotations smaller than <code>~1/n</code> with negligible error and saves gate
            count.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Where it shows up',
      body: (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Shor's algorithm</strong> — factoring integers reduces to finding the
              period of a modular function. QFT reads off that period in one inverse-QFT pass.
            </li>
            <li>
              <strong>Phase estimation</strong> — given <code>U|ψ⟩ = e^(2πi φ) |ψ⟩</code>,
              estimate φ. QFT decodes the phase from the ancilla register.
            </li>
            <li>
              <strong>HHL</strong> (linear systems) — uses phase estimation internally.
            </li>
            <li>
              <strong>Quantum signal processing &amp; QSVT</strong> — modern phase-encoding
              algorithms generalise the QFT trick.
            </li>
          </ul>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Open the QFT-3 preset',
      body: (
        <>
          <p>
            In the Visualizer, load the QFT-3 preset. Note the H-then-controlled-phase ladder pattern
            on each qubit. Run it on the computational basis state |001⟩ and observe a uniform
            superposition with a specific phase pattern — that is the QFT of a delta function,
            i.e. a pure frequency.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
