import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'qml-02-encoding-data',
  title: 'Encoding classical data',
  subtitle: 'Angle, amplitude, and IQP feature maps.',
  track: 'qml',
  order: 2,
  duration_min: 14,
  objectives: [
    'Compare angle, amplitude, and IQP encodings on cost, expressivity, and depth.',
    'Justify why a deeper feature map produces a richer kernel — and where the tradeoff hurts.',
    'Pick a sensible encoding for a given dataset (small vs. high-dimensional, classical vs. quantum).',
  ],
  prerequisites: ['qml-01-neural-to-quantum'],
  sections: [
    {
      kind: 'read',
      title: 'Angle encoding',
      body: (
        <>
          <p>
            The simplest: for each feature <code>xᵢ</code>, apply an <code>RY(xᵢ)</code> (or
            RX, or RZ) to qubit <code>i</code>. Cost: <code>n</code> qubits and <code>n</code>
            gates. Limit: each qubit only knows about one feature, so single-qubit observables
            see a sum-of-features structure, not interactions.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'Amplitude encoding',
      body: (
        <>
          <p>
            Embed a 2ⁿ-dimensional input vector into the amplitudes of an n-qubit state:
            <code> |ψ_x⟩ = Σᵢ xᵢ |i⟩</code>. Wildly more compact (n qubits for 2ⁿ features) but
            preparing the state requires an <em>O(2ⁿ)</em>-gate circuit in the worst case —
            you pay back the compactness in depth. Useful when the input vector has special
            structure (sparse, low-rank, or coming from a quantum process to begin with).
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'IQP and ZZ feature maps',
      body: (
        <>
          <p>
            IQP feature maps interleave Hadamards with diagonal phase gates:
          </p>
          <pre className="font-mono text-[12px] bg-deep-jungle/60 rounded px-3 py-2 text-isabelline/85">
            U_Φ(x) = H⊗ⁿ · D₂(x) · H⊗ⁿ · D₁(x) · H⊗ⁿ,
          </pre>
          <p>
            where each <code>Dₖ(x)</code> is a product of <code>RZ(xᵢ)</code> on single qubits
            and <code>RZ(xᵢ xⱼ)</code> on pairs (ZZ feature map). The resulting kernel is
            believed to be classically hard to estimate — a candidate "honest" quantum
            advantage for kernel-based learning.
          </p>
          <p>
            Reps: a single IQP layer is usually too shallow; 2–3 layers give expressive
            kernels but eat gate budget. Past 4 you usually overfit on small data.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'See the difference',
      body: (
        <>
          <p>
            In the QNN Workbench, the encoder block is a first-class
            choice. For now, the simplest experiment is: open <a href="/visualizer" className="text-vegas-gold underline">Visualizer</a>,
            place RY(θ) on each of three qubits with different θ, and watch the Q-Sphere. That
            is an angle encoding of a 3-feature vector. Try swapping in a CZ between qubits 0
            and 1 — you have just added a single "interaction" feature.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
