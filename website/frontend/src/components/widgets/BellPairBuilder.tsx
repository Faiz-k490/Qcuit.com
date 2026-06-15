/**
 * BellPairBuilder — Guided 2-qubit Bell-state construction.
 *
 * Three steps:
 *   1. Place an H on qubit 0
 *   2. Place a CNOT (0→1)
 *   3. Measure both qubits
 *
 * Each step shows a checkmark when completed. After all three are done,
 * the widget reports the canonical Bell state probabilities (0.5 / 0.5
 * on |00⟩ and |11⟩) so learners see the punchline immediately.
 *
 * No backend round-trip — math is computed locally for a 2-qubit system.
 */

import React, { useState, useMemo } from 'react';

type Step = 'h' | 'cnot' | 'measure';

const STEPS: { id: Step; label: string; hint: string }[] = [
  { id: 'h', label: 'Hadamard on q0', hint: 'Creates superposition on the first qubit.' },
  { id: 'cnot', label: 'CNOT (q0 → q1)', hint: 'Entangles the two qubits.' },
  { id: 'measure', label: 'Measure both', hint: 'Collapses the state into a definite outcome.' },
];

function compute(done: Set<Step>): Record<string, number> {
  // Start in |00⟩
  let a = [1, 0, 0, 0];
  if (done.has('h')) {
    // H ⊗ I on |00⟩  =>  (|00⟩ + |10⟩)/√2
    const r = 1 / Math.sqrt(2);
    a = [r, 0, r, 0];
  }
  if (done.has('cnot')) {
    // CNOT (control q0, target q1) flips |10⟩ ↔ |11⟩.
    const t = a[2];
    a[2] = a[3];
    a[3] = t;
  }
  const probs: Record<string, number> = {};
  ['00', '01', '10', '11'].forEach((b, i) => {
    const p = a[i] * a[i];
    if (p > 1e-9) probs[b] = p;
  });
  return probs;
}

export function BellPairBuilder() {
  const [done, setDone] = useState<Set<Step>>(new Set());

  const toggle = (id: Step) => {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDone(next);
  };

  const probs = useMemo(() => compute(done), [done]);
  const allDone = done.size === STEPS.length;

  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        {STEPS.map((s, i) => {
          const ready = i === 0 || done.has(STEPS[i - 1].id);
          const checked = done.has(s.id);
          return (
            <li key={s.id}>
              <button
                onClick={() => ready && toggle(s.id)}
                disabled={!ready}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded border transition-all text-left ${
                  checked
                    ? 'border-vegas-gold/45 bg-vegas-gold/10'
                    : ready
                    ? 'border-vegas-gold/20 bg-forest-light/20 hover:border-vegas-gold/40'
                    : 'border-vegas-gold/10 bg-deep-jungle/40 opacity-40 cursor-not-allowed'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${
                    checked
                      ? 'bg-vegas-gold text-deep-jungle border-vegas-gold'
                      : 'border-vegas-gold/40 text-vegas-gold/60'
                  }`}
                >
                  {checked ? '✓' : i + 1}
                </span>
                <span className="font-body text-xs text-isabelline/85 flex-1">{s.label}</span>
                <span className="font-body text-[10px] text-isabelline/45">{s.hint}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="px-3 py-2 rounded border border-vegas-gold/15 bg-deep-jungle/60">
        <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">
          State (measurement probabilities)
        </div>
        {Object.keys(probs).length === 0 ? (
          <p className="font-mono text-[11px] text-isabelline/40">Start in |00⟩</p>
        ) : (
          <ul className="space-y-1">
            {Object.entries(probs).map(([b, p]) => (
              <li key={b} className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-isabelline/70 w-12">|{b}⟩</span>
                <div className="flex-1 h-2 rounded bg-deep-jungle overflow-hidden">
                  <div className="h-full bg-vegas-gold/70" style={{ width: `${Math.max(2, p * 100)}%` }} />
                </div>
                <span className="text-isabelline/55 w-12 text-right">{(p * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        )}
        {allDone && (
          <p className="font-display text-xs italic text-vegas-gold/80 mt-2">
            That's the Bell state |Φ⁺⟩ — measure |00⟩ or |11⟩ with equal probability,
            never |01⟩ or |10⟩.
          </p>
        )}
      </div>
    </div>
  );
}

export default BellPairBuilder;
