/**
 * Qcuit Exploratorium — Educational Interface
 * 
 * "Read-Watch-Do" pedagogical pattern wrapped in the Progressive Old Money aesthetic.
 * Narrative-driven concept exploration with interactive widgets.
 */

import React, { useState, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────
interface Lesson {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  readContent: React.ReactNode;
  watchDescription: string;
  doDescription: string;
  widget: React.ReactNode;
}

// ─── Bloch Sphere Interactive Widget ──────────────────────────────
const BlochSphereWidget = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theta, setTheta] = useState(0);
  const [phi, setPhi] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.35;

    ctx.clearRect(0, 0, w, h);

    // Draw sphere outline
    ctx.strokeStyle = 'rgba(197, 160, 89, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Draw equator (ellipse)
    ctx.strokeStyle = 'rgba(197, 160, 89, 0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw meridian
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.3, r, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw axes labels
    ctx.fillStyle = 'rgba(245, 242, 234, 0.4)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('|0⟩', cx, cy - r - 10);
    ctx.fillText('|1⟩', cx, cy + r + 18);
    ctx.fillText('|+⟩', cx + r + 15, cy + 4);
    ctx.fillText('|−⟩', cx - r - 15, cy + 4);

    // Draw Z axis
    ctx.strokeStyle = 'rgba(197, 160, 89, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 5);
    ctx.lineTo(cx, cy + r + 5);
    ctx.stroke();

    // Draw X axis
    ctx.beginPath();
    ctx.moveTo(cx - r - 5, cy);
    ctx.lineTo(cx + r + 5, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate state vector position
    const thetaRad = (theta / 180) * Math.PI;
    const phiRad = (phi / 180) * Math.PI;
    const stateX = cx + r * Math.sin(thetaRad) * Math.cos(phiRad);
    const stateY = cy - r * Math.cos(thetaRad);

    // Draw state vector line
    ctx.strokeStyle = '#C5A059';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(stateX, stateY);
    ctx.stroke();

    // Draw state point
    ctx.fillStyle = '#C5A059';
    ctx.beginPath();
    ctx.arc(stateX, stateY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw glow
    const gradient = ctx.createRadialGradient(stateX, stateY, 0, stateX, stateY, 16);
    gradient.addColorStop(0, 'rgba(197, 160, 89, 0.4)');
    gradient.addColorStop(1, 'rgba(197, 160, 89, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(stateX, stateY, 16, 0, Math.PI * 2);
    ctx.fill();

    // State label
    const alpha = Math.cos(thetaRad / 2).toFixed(2);
    const beta = Math.sin(thetaRad / 2).toFixed(2);
    ctx.fillStyle = 'rgba(245, 242, 234, 0.7)';
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`|ψ⟩ = ${alpha}|0⟩ + ${beta}|1⟩`, 12, h - 12);

  }, [theta, phi]);

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width={320}
        height={320}
        className="mx-auto block"
        style={{ background: 'transparent' }}
      />

      {/* Controls */}
      <div className="space-y-3 px-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-xs text-isabelline/50 uppercase tracking-wider">
              θ (Polar Angle)
            </label>
            <span className="font-mono text-xs text-vegas-gold">{theta}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="180"
            value={theta}
            onChange={(e) => setTheta(Number(e.target.value))}
            className="w-full accent-vegas-gold"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-body text-xs text-isabelline/50 uppercase tracking-wider">
              φ (Azimuthal Angle)
            </label>
            <span className="font-mono text-xs text-vegas-gold">{phi}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={phi}
            onChange={(e) => setPhi(Number(e.target.value))}
            className="w-full accent-vegas-gold"
          />
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex items-center gap-2 px-4 flex-wrap">
        <span className="font-body text-[10px] text-isabelline/30 uppercase tracking-wider">Presets:</span>
        {[
          { label: '|0⟩', t: 0, p: 0 },
          { label: '|1⟩', t: 180, p: 0 },
          { label: '|+⟩', t: 90, p: 0 },
          { label: '|−⟩', t: 90, p: 180 },
          { label: '|i⟩', t: 90, p: 90 },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => { setTheta(preset.t); setPhi(preset.p); }}
            className="
              px-3 py-1 text-xs font-mono
              border border-vegas-gold/20 text-vegas-gold/60
              hover:border-vegas-gold hover:text-vegas-gold
              transition-all duration-200
            "
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Superposition Widget ─────────────────────────────────────────
const SuperpositionWidget = () => {
  const [measured, setMeasured] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const measure = () => {
    const result = Math.random() < 0.5 ? '0' : '1';
    setMeasured(result);
    setHistory(prev => [...prev.slice(-19), result]);
  };

  const zeros = history.filter(h => h === '0').length;
  const ones = history.filter(h => h === '1').length;

  return (
    <div className="space-y-6 px-4">
      {/* Visual state */}
      <div className="text-center py-8">
        <div className="font-mono text-3xl text-vegas-gold mb-2">
          {measured === null ? (
            <span className="animate-pulse">|ψ⟩ = α|0⟩ + β|1⟩</span>
          ) : (
            <span>|{measured}⟩</span>
          )}
        </div>
        <p className="font-body text-xs text-isabelline/40">
          {measured === null
            ? 'The qubit exists in superposition — both 0 and 1 simultaneously.'
            : `Collapsed to |${measured}⟩. The superposition is gone.`
          }
        </p>
      </div>

      {/* Measure button */}
      <div className="text-center">
        <button
          onClick={measure}
          className="
            px-8 py-3 text-sm font-body tracking-[0.15em] uppercase
            border border-vegas-gold text-vegas-gold
            hover:bg-vegas-gold hover:text-deep-jungle
            transition-all duration-300
          "
        >
          Measure
        </button>
        <button
          onClick={() => { setMeasured(null); }}
          className="
            ml-3 px-6 py-3 text-sm font-body tracking-[0.15em] uppercase
            border border-isabelline/10 text-isabelline/40
            hover:border-isabelline/30 hover:text-isabelline/60
            transition-all duration-300
          "
        >
          Reset
        </button>
      </div>

      {/* Statistics */}
      {history.length > 0 && (
        <div className="border border-vegas-gold/10 p-4">
          <div className="font-body text-[10px] text-isabelline/30 uppercase tracking-wider mb-3">
            Measurement History ({history.length} shots)
          </div>
          <div className="flex items-end gap-1 h-12 mb-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex-1 ${h === '0' ? 'bg-vegas-gold/60' : 'bg-isabelline/20'}`}
                style={{ height: '100%' }}
              />
            ))}
          </div>
          <div className="flex justify-between font-mono text-xs">
            <span className="text-vegas-gold">|0⟩: {zeros} ({history.length > 0 ? ((zeros / history.length) * 100).toFixed(0) : 0}%)</span>
            <span className="text-isabelline/50">|1⟩: {ones} ({history.length > 0 ? ((ones / history.length) * 100).toFixed(0) : 0}%)</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Lesson Container ─────────────────────────────────────────────
const LessonSection = ({ lesson }: { lesson: Lesson }) => {
  const [activeTab, setActiveTab] = useState<'read' | 'watch' | 'do'>('read');

  return (
    <section className="py-20 border-b border-vegas-gold/5">
      <div className="max-w-6xl mx-auto px-8">
        {/* Lesson header */}
        <div className="mb-12">
          <span className="font-display text-5xl text-vegas-gold/20">{lesson.number}</span>
          <h2 className="font-display text-3xl text-isabelline mt-2">{lesson.title}</h2>
          <p className="font-body text-isabelline/50 mt-2">{lesson.subtitle}</p>
        </div>

        {/* Read-Watch-Do layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Narrative */}
          <div>
            {/* Tab switcher */}
            <div className="flex items-center gap-6 mb-8 border-b border-vegas-gold/10 pb-4">
              {[
                { key: 'read' as const, label: 'Read' },
                { key: 'watch' as const, label: 'Watch' },
                { key: 'do' as const, label: 'Do' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    font-body text-sm tracking-[0.15em] uppercase
                    transition-colors duration-300
                    ${activeTab === tab.key
                      ? 'text-vegas-gold border-b-2 border-vegas-gold pb-4 -mb-[17px]'
                      : 'text-isabelline/30 hover:text-isabelline/50'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="prose-heritage">
              {activeTab === 'read' && (
                <div className="font-body text-isabelline/70 leading-editorial space-y-4 animate-fade-in">
                  {lesson.readContent}
                </div>
              )}
              {activeTab === 'watch' && (
                <div className="animate-fade-in">
                  <div className="aspect-video bg-forest-light border border-vegas-gold/10 flex items-center justify-center">
                    <div className="text-center">
                      <span className="font-display text-2xl text-vegas-gold/20">▶</span>
                      <p className="font-body text-xs text-isabelline/30 mt-2">{lesson.watchDescription}</p>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'do' && (
                <div className="animate-fade-in">
                  <p className="font-body text-isabelline/50 text-sm mb-4">{lesson.doDescription}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Interactive Widget */}
          <div className="bg-forest-light/50 border border-vegas-gold/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-vegas-gold/40 rotate-45" />
              <span className="font-body text-[10px] text-isabelline/30 uppercase tracking-[0.3em]">
                Interactive Widget
              </span>
            </div>
            {lesson.widget}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Lessons Data ─────────────────────────────────────────────────
const lessons: Lesson[] = [
  {
    id: 'superposition',
    number: 'I',
    title: 'Superposition',
    subtitle: 'The quantum coin that is both heads and tails — until you look.',
    readContent: (
      <>
        <p>
          In classical computing, a bit is either 0 or 1. It's a light switch — on or off.
          A qubit, however, can exist in a <em className="text-vegas-gold not-italic">superposition</em> of
          both states simultaneously.
        </p>
        <p>
          Mathematically, we write this as <span className="font-mono text-vegas-gold/80">|ψ⟩ = α|0⟩ + β|1⟩</span>,
          where α and β are complex probability amplitudes. The constraint is that
          <span className="font-mono text-vegas-gold/80"> |α|² + |β|² = 1</span>.
        </p>
        <p>
          The Hadamard gate (H) is the key to creating superposition. When applied to |0⟩,
          it produces an equal superposition: <span className="font-mono text-vegas-gold/80">(|0⟩ + |1⟩)/√2</span>.
        </p>
        <p>
          The crucial insight: measurement destroys superposition. When you observe the qubit,
          it "collapses" to either |0⟩ or |1⟩ with probabilities |α|² and |β|² respectively.
          This is not a limitation — it is the fundamental nature of quantum reality.
        </p>
      </>
    ),
    watchDescription: 'Animation: Hadamard gate transforming |0⟩ into superposition on the Bloch sphere.',
    doDescription: 'Click "Measure" to collapse the superposition. Observe how the statistics converge to 50/50 over many measurements.',
    widget: <SuperpositionWidget />,
  },
  {
    id: 'bloch-sphere',
    number: 'II',
    title: 'The Bloch Sphere',
    subtitle: 'A compass for the quantum world — showing where your qubit is pointing.',
    readContent: (
      <>
        <p>
          The Bloch sphere is a geometric representation of a single qubit's state.
          Every point on the surface of this unit sphere corresponds to a valid quantum state.
        </p>
        <p>
          The north pole represents <span className="font-mono text-vegas-gold/80">|0⟩</span>,
          the south pole represents <span className="font-mono text-vegas-gold/80">|1⟩</span>,
          and points on the equator represent equal superpositions with different phases.
        </p>
        <p>
          Any single-qubit state can be parameterized as:
        </p>
        <div className="font-mono text-vegas-gold/80 bg-deep-jungle/50 p-3 border border-vegas-gold/10 my-4">
          |ψ⟩ = cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
        </div>
        <p>
          where θ is the polar angle (latitude) and φ is the azimuthal angle (longitude).
          Quantum gates are rotations on this sphere: X rotates around the x-axis,
          Z around the z-axis, and H rotates to the equator.
        </p>
      </>
    ),
    watchDescription: 'Animation: Various quantum gates rotating the state vector on the Bloch sphere.',
    doDescription: 'Drag the θ and φ sliders to explore different quantum states. Try the presets to see standard states.',
    widget: <BlochSphereWidget />,
  },
];

// ═══════════════════════════════════════════════════════════════════
// EXPLORATORIUM PAGE
// ═══════════════════════════════════════════════════════════════════
export function Exploratorium() {
  return (
    <div className="noise-texture min-h-screen bg-deep-jungle text-isabelline">
      {/* Header */}
      <header className="py-24 px-8 text-center border-b border-vegas-gold/5">
        <nav className="max-w-6xl mx-auto flex items-center justify-between mb-20">
          <a href="/" className="font-display text-2xl text-isabelline hover:text-vegas-gold transition-colors">
            Qcuit
          </a>
          <a
            href="/simulator"
            className="px-6 py-2 text-sm font-body tracking-wide uppercase border border-vegas-gold/30 text-vegas-gold/70 hover:border-vegas-gold hover:text-vegas-gold transition-all"
          >
            Open Studio →
          </a>
        </nav>

        <div className="inline-flex items-center gap-3 mb-6 opacity-60">
          <div className="w-8 h-px bg-vegas-gold" />
          <span className="font-body text-xs tracking-[0.3em] uppercase text-vegas-gold">
            The Exploratorium
          </span>
          <div className="w-8 h-px bg-vegas-gold" />
        </div>

        <h1 className="font-display text-hero text-isabelline mb-6">
          Concepts in<br />
          <span className="text-vegas-gold italic">Quantum Mechanics</span>
        </h1>

        <p className="font-body text-lg text-isabelline/50 max-w-xl mx-auto leading-relaxed">
          An interactive journey through the fundamental ideas
          that make quantum computing possible. Read. Watch. Do.
        </p>
      </header>

      {/* Lessons */}
      {lessons.map(lesson => (
        <LessonSection key={lesson.id} lesson={lesson} />
      ))}

      {/* More coming */}
      <section className="py-24 px-8 text-center">
        <span className="font-body text-xs tracking-[0.3em] uppercase text-vegas-gold/30 block mb-4">
          Coming Soon
        </span>
        <h2 className="font-display text-2xl text-isabelline/40 mb-6">
          Entanglement · Phase Kickback · Grover's Algorithm
        </h2>
        <p className="font-body text-isabelline/30 max-w-md mx-auto text-sm">
          New lessons are added regularly. Each builds upon the last,
          constructing a complete understanding of quantum computation.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-vegas-gold/5 px-8 py-10 text-center">
        <span className="font-body text-xs text-isabelline/20">
          © 2026 Qcuit.com · The Heritage of Future Logic
        </span>
      </footer>
    </div>
  );
}

export default Exploratorium;
