/**
 * RotationSlider — Bloch arrow driven by an RX/RY/RZ rotation slider.
 *
 * Pure client-side rendering (no /api round-trip). Computes |ψ⟩ = R(θ)|0⟩
 * for the chosen axis, then renders the Bloch sphere with the tip
 * coloured by phase and labelled with the |0⟩ / |1⟩ amplitudes.
 */

import React, { useState, useMemo } from 'react';

type Axis = 'X' | 'Y' | 'Z';

interface Props {
  defaultAxis?: Axis;
  defaultTheta?: number;
}

interface Complex {
  re: number;
  im: number;
}

function rotState(axis: Axis, theta: number): [Complex, Complex] {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  // Starting from |0⟩.
  if (axis === 'X') {
    return [{ re: c, im: 0 }, { re: 0, im: -s }];
  }
  if (axis === 'Y') {
    return [{ re: c, im: 0 }, { re: s, im: 0 }];
  }
  // Z rotation leaves |0⟩ a global phase only.
  return [{ re: c, im: -s }, { re: 0, im: 0 }];
}

/** Bloch coordinates (x,y,z) from a single-qubit state vector. */
function blochCoords(a: Complex, b: Complex): [number, number, number] {
  // Convert to amplitudes
  // x = 2 Re(a* b)
  // y = 2 Im(a* b)
  // z = |a|^2 - |b|^2
  const aRe = a.re;
  const aIm = a.im;
  const bRe = b.re;
  const bIm = b.im;
  const x = 2 * (aRe * bRe + aIm * bIm);
  const y = 2 * (aRe * bIm - aIm * bRe);
  const z = aRe * aRe + aIm * aIm - (bRe * bRe + bIm * bIm);
  return [x, y, z];
}

export function RotationSlider({ defaultAxis = 'Y', defaultTheta = 0 }: Props) {
  const [axis, setAxis] = useState<Axis>(defaultAxis);
  const [theta, setTheta] = useState<number>(defaultTheta);

  const [a, b] = useMemo(() => rotState(axis, theta), [axis, theta]);
  const [bx, by, bz] = useMemo(() => blochCoords(a, b), [a, b]);

  // ── 2D projection of the Bloch sphere onto the canvas ──
  // We use a simple isometric-ish projection: x → screen x, z → screen y (up),
  // and y contributes a small lateral offset so phase rotations are visible.
  const W = 320;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2;
  const R = 120;
  const sx = cx + bx * R + by * R * 0.15;
  const sy = cy - bz * R + by * R * 0.05;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4 items-start">
      {/* Bloch projection */}
      <div className="rounded border border-vegas-gold/20 bg-deep-jungle/60 p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* sphere outline */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(197,160,89,0.3)" />
          {/* equator */}
          <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.28} fill="none" stroke="rgba(197,160,89,0.15)" />
          {/* meridian */}
          <ellipse cx={cx} cy={cy} rx={R * 0.28} ry={R} fill="none" stroke="rgba(197,160,89,0.15)" />
          {/* axes */}
          <line x1={cx} y1={cy - R - 8} x2={cx} y2={cy + R + 8} stroke="rgba(197,160,89,0.25)" strokeDasharray="3 3" />
          <line x1={cx - R - 8} y1={cy} x2={cx + R + 8} y2={cy} stroke="rgba(197,160,89,0.25)" strokeDasharray="3 3" />

          {/* labels */}
          <text x={cx} y={cy - R - 14} textAnchor="middle" fill="rgba(245,242,234,0.6)" fontFamily="Inter" fontSize="12">|0⟩</text>
          <text x={cx} y={cy + R + 22} textAnchor="middle" fill="rgba(245,242,234,0.6)" fontFamily="Inter" fontSize="12">|1⟩</text>
          <text x={cx + R + 16} y={cy + 4} fill="rgba(245,242,234,0.5)" fontFamily="Inter" fontSize="11">+x</text>
          <text x={cx - R - 26} y={cy + 4} fill="rgba(245,242,234,0.5)" fontFamily="Inter" fontSize="11">−x</text>

          {/* state vector */}
          <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="#C5A059" strokeWidth={2} />
          <circle cx={sx} cy={sy} r={5} fill="#C5A059" />
        </svg>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">Axis</div>
          <div className="flex items-center gap-1">
            {(['X', 'Y', 'Z'] as Axis[]).map((a) => (
              <button
                key={a}
                onClick={() => setAxis(a)}
                className={`px-2.5 py-1 rounded font-mono text-xs transition-all ${
                  axis === a
                    ? 'bg-vegas-gold/20 text-vegas-gold border border-vegas-gold/50'
                    : 'border border-vegas-gold/15 text-isabelline/60 hover:border-vegas-gold/35'
                }`}
              >
                R{a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60">θ</span>
            <span className="font-mono text-[11px] text-isabelline/80">{theta.toFixed(2)} rad ({((theta * 180) / Math.PI).toFixed(0)}°)</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.PI * 2}
            step={Math.PI / 64}
            value={theta}
            onChange={(e) => setTheta(parseFloat(e.target.value))}
            className="w-full accent-vegas-gold"
          />
        </div>

        <div className="px-2.5 py-2 rounded border border-vegas-gold/15 bg-forest-light/20">
          <div className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/60 mb-1">Amplitudes</div>
          <div className="font-mono text-[11px] text-isabelline/85 leading-relaxed">
            α<span className="text-isabelline/40">(|0⟩)</span> = {a.re.toFixed(3)}{a.im >= 0 ? '+' : '−'}{Math.abs(a.im).toFixed(3)}i
          </div>
          <div className="font-mono text-[11px] text-isabelline/85">
            β<span className="text-isabelline/40">(|1⟩)</span> = {b.re.toFixed(3)}{b.im >= 0 ? '+' : '−'}{Math.abs(b.im).toFixed(3)}i
          </div>
          <div className="font-mono text-[10px] text-isabelline/45 mt-1.5">
            P(0) = {(a.re * a.re + a.im * a.im).toFixed(3)} · P(1) = {(b.re * b.re + b.im * b.im).toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RotationSlider;
