/**
 * MeasurementHistogram — Sample H|0⟩ N times and watch the histogram converge.
 *
 * Slider goes from 1 shot to 8192. We use a deterministic seedable PRNG so
 * lesson screenshots are stable (and so two learners on the same slider
 * position see the same numbers).
 */

import React, { useState, useMemo } from 'react';

// Mulberry32 — small, deterministic, good enough for visualisations.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleH(shots: number, seed: number): { zero: number; one: number } {
  const rng = mulberry32(seed);
  let zero = 0;
  for (let i = 0; i < shots; i++) {
    if (rng() < 0.5) zero += 1;
  }
  return { zero, one: shots - zero };
}

const PRESETS = [1, 4, 16, 64, 256, 1024, 4096, 8192];

export function MeasurementHistogram() {
  const [shots, setShots] = useState<number>(64);
  const [seed, setSeed] = useState<number>(42);

  const counts = useMemo(() => sampleH(shots, seed), [shots, seed]);
  const pZero = counts.zero / shots;
  const pOne = counts.one / shots;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 w-12">Shots</div>
        <input
          type="range"
          min={0}
          max={PRESETS.length - 1}
          step={1}
          value={PRESETS.indexOf(shots)}
          onChange={(e) => setShots(PRESETS[parseInt(e.target.value, 10)])}
          className="flex-1 accent-vegas-gold"
        />
        <span className="font-mono text-xs text-isabelline w-14 text-right">{shots}</span>
        <button
          onClick={() => setSeed((s) => (s + 1) & 0xffffffff)}
          title="Reroll the deterministic seed"
          className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-vegas-gold/30 text-vegas-gold/80 hover:bg-vegas-gold/10 transition-all"
        >
          Reseed
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 rounded border border-vegas-gold/20 bg-forest-light/20">
          <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">|0⟩</div>
          <div className="font-mono text-xs text-isabelline/85">{counts.zero} / {shots}</div>
          <div className="h-2 mt-1.5 rounded bg-deep-jungle overflow-hidden">
            <div className="h-full bg-vegas-gold/70" style={{ width: `${pZero * 100}%` }} />
          </div>
          <div className="font-mono text-[10px] text-isabelline/55 mt-1">{(pZero * 100).toFixed(2)}%</div>
        </div>
        <div className="px-3 py-2 rounded border border-vegas-gold/20 bg-forest-light/20">
          <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">|1⟩</div>
          <div className="font-mono text-xs text-isabelline/85">{counts.one} / {shots}</div>
          <div className="h-2 mt-1.5 rounded bg-deep-jungle overflow-hidden">
            <div className="h-full bg-vegas-gold/70" style={{ width: `${pOne * 100}%` }} />
          </div>
          <div className="font-mono text-[10px] text-isabelline/55 mt-1">{(pOne * 100).toFixed(2)}%</div>
        </div>
      </div>

      <p className="font-body text-[11px] text-isabelline/50 italic leading-relaxed">
        H|0⟩ is the equal superposition (|0⟩ + |1⟩)/√2. With few shots you see noisy
        ratios; as shots grow, both bars converge to 50%. That's the law of large
        numbers, not anything mysterious about quantum mechanics — the wavefunction
        is exactly 50/50 from the start.
      </p>
    </div>
  );
}

export default MeasurementHistogram;
