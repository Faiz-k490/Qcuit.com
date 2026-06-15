import React from 'react';
import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'core-06-cnot-entangling',
  title: 'The CNOT and other entangling gates',
  subtitle: 'Two-qubit gates are where entanglement comes from.',
  track: 'core',
  order: 6,
  duration_min: 12,
  objectives: [
    'Write the truth table and matrix for CNOT.',
    'Explain why no single-qubit gate can create entanglement.',
    'Recognise CZ and SWAP, and know which combinations are universal.',
  ],
  prerequisites: ['core-05-two-qubits-entanglement'],
  sections: [
    {
      kind: 'read',
      title: 'CNOT: classical NOT, controlled',
      body: (
        <>
          <p>
            The CNOT gate (also called CX) flips its target qubit if and only if its control
            qubit is <code>|1⟩</code>. On computational basis states it is just classical XOR:
          </p>
          <table className="font-mono text-[12px] mt-2">
            <thead>
              <tr className="text-vegas-gold/70 text-left">
                <th className="pr-6">input</th><th>output</th>
              </tr>
            </thead>
            <tbody className="text-isabelline/85">
              <tr><td className="pr-6">|00⟩</td><td>|00⟩</td></tr>
              <tr><td className="pr-6">|01⟩</td><td>|01⟩</td></tr>
              <tr><td className="pr-6">|10⟩</td><td>|11⟩</td></tr>
              <tr><td className="pr-6">|11⟩</td><td>|10⟩</td></tr>
            </tbody>
          </table>
          <p className="mt-3">
            On <em>superpositions</em>, CNOT is the gate that promotes one-qubit superposition
            into two-qubit entanglement. Apply it to <code>(|0⟩+|1⟩)/√2 ⊗ |0⟩</code> and you
            get the Bell state.
          </p>
        </>
      ),
    },
    {
      kind: 'watch',
      title: 'Why single-qubit gates cannot entangle',
      body: (
        <>
          <p>
            A single-qubit gate acts as <code>U ⊗ I</code> on the two-qubit register. If you
            start with a product state <code>|a⟩|b⟩</code> and apply <code>U ⊗ I</code>, you
            get <code>(U|a⟩)|b⟩</code> — still a product. The tensor structure is preserved.
            Entanglement requires a gate that couples the two qubits' Hilbert spaces, and CNOT
            (or CZ, or any of their cousins) is the minimal example.
          </p>
          <p>
            <strong>Universal set:</strong> any single-qubit gate plus CNOT generates all
            unitaries on n qubits, to arbitrary precision. In practice we use{' '}
            <code>{'{H, S, T, CNOT}'}</code>.
          </p>
        </>
      ),
    },
    {
      kind: 'read',
      title: 'CZ, SWAP, and friends',
      body: (
        <>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>CZ</strong> — controlled-Z. Same control structure as CNOT but applies a
              phase flip on |11⟩ instead of a bit flip. Symmetric in its two qubits (unlike
              CNOT). Common as a hardware-native gate on superconducting devices.
            </li>
            <li>
              <strong>SWAP</strong> — exchanges the two qubits' states. Decomposes into three
              CNOTs. Expensive on hardware; transpilers work hard to avoid them by re-routing
              qubits through the device's coupling graph.
            </li>
            <li>
              <strong>iSWAP</strong>, <strong>fSim</strong> — hardware-native entanglers on
              specific platforms. You generally don't write these by hand; the transpiler
              emits them for you.
            </li>
          </ul>
        </>
      ),
    },
    {
      kind: 'do',
      title: 'Inspect the CNOT in the Visualizer',
      body: (
        <>
          <p>
            Open <a href="/visualizer" className="text-vegas-gold underline">Visualizer</a> and load
            the Bell preset (top bar → menu → Circuit → presets, or the bell tile on the canvas
            toolbar). Try replacing the CNOT with a CZ — you'll see the probabilities don't
            change, because the resulting Bell-equivalent state still has |00⟩/|11⟩ support;
            but the relative phase between them flips, which a downstream Hadamard would
            reveal.
          </p>
        </>
      ),
    },
  ],
};

export default lesson;
