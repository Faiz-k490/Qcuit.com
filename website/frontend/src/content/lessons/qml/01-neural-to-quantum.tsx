import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'qml-01-neural-to-quantum',
  title: 'From neural networks to quantum networks',
  subtitle: 'What carries over and what does not.',
  track: 'qml',
  order: 1,
  duration_min: 12,
  objectives: [
    'Map the four parts of a classical neural net (encoding, parameters, nonlinearity, loss) to their QML counterparts.',
    'Identify the genuine source of nonlinearity in a parametrised quantum circuit.',
    'Decide when QML is worth trying (small structured data) and when it is not (raw MNIST).',
  ],
  prerequisites: ['core-12-noise'],
  sections: [
    {
      kind: 'read',
      title: 'A classical neural network, in four parts',
      body: (
        <>
          <p>The standard ingredients of an MLP:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li><strong>Encoding</strong> — raw input <code>x</code> into a feature vector.</li>
            <li><strong>Parameters</strong> — weight matrices and biases.</li>
            <li><strong>Nonlinearity</strong> — ReLU, tanh, sigmoid; without it, the whole network collapses to a linear map.</li>
            <li><strong>Loss</strong> — a scalar function of the prediction and the label, gradient-descended.</li>
          </ol>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'The quantum analogues',
      body: (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Encoding</strong> → a <em>feature map</em> <code>U_enc(x)</code> that embeds
              <code> x</code> into the angle of rotation gates, the amplitudes of the state vector,
              or higher-order combinations.
            </li>
            <li>
              <strong>Parameters</strong> → angles <code>θ</code> in a parametrised
              circuit <code>U_ansatz(θ)</code>.
            </li>
            <li>
              <strong>Nonlinearity</strong> → comes from <em>measurement</em>, not from any
              activation function inside the circuit. The circuit itself is linear (unitary);
              the squared modulus that produces probabilities is the only source of
              nonlinearity, and it is enough.
            </li>
            <li>
              <strong>Loss</strong> → typically an expectation value of a Hermitian observable
              <code> H</code>: <code>L(θ) = ⟨ψ(θ)|H|ψ(θ)⟩</code>. Gradient by parameter shift.
            </li>
          </ul>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'Where the speedup story is honest',
      body: (
        <>
          <p>
            Most QML papers do not, and cannot, claim a quantum speedup over classical ML on
            classical data. Encoding a 256-feature vector into a quantum state takes
            non-trivial gates; the data was classical to begin with; classical ML has had
            decades of engineering. What QML <em>can</em> offer:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Natural fit for <em>quantum data</em> — outputs of physical experiments, simulated molecules, etc.</li>
            <li>Genuinely expressive feature maps that classical kernels cannot match cheaply.</li>
            <li>A new design language for small, structured tasks where parameter count matters.</li>
          </ul>
          <p className="italic text-isabelline/60 mt-2">
            What it does not offer (yet): general-purpose advantage on MNIST, CIFAR, or
            language. Treat QML as research, not as a drop-in replacement.
          </p>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Trace one rotation',
      body: (
        <>
          <p>
            The rotation slider below is the simplest possible "QML model": one input feature
            <code> x</code> drives the angle <code>θ = x</code> of an RY gate on |0⟩. Sliding
            <code> θ</code> is exactly evaluating the model on different inputs. The
            probability of measuring 1 is <code>sin²(x/2)</code> — already a perfectly
            respectable nonlinear function.
          </p>
        </>
      ),
      widget: { kind: 'RotationSlider', config: { axis: 'Y' } },
    },
  ],
};

export default lesson;
