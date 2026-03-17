import React, { useRef } from 'react';
import { TerminalWindow } from './TerminalWindow';

interface HeroSectionProps {
  onQuickStartClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onQuickStartClick }) => {
  const quickStartRef = useRef<HTMLDivElement>(null);

  const handleQuickStartClick = () => {
    if (onQuickStartClick) {
      onQuickStartClick();
    } else if (quickStartRef.current) {
      quickStartRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-8 py-20">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(197,160,89,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Epoch badge */}
        <div className="inline-flex items-center gap-3 mb-10 opacity-60">
          <div className="w-8 h-px bg-vegas-gold" />
          <span className="font-body text-xs tracking-[0.3em] uppercase text-vegas-gold">
            Open Source Library · Est. 2026
          </span>
          <div className="w-8 h-px bg-vegas-gold" />
        </div>

        {/* Main Headline */}
        <h1 className="font-display text-hero text-isabelline mb-6">
          Write Quantum Code in
          <br />
          <span className="text-vegas-gold italic">Plain English</span>
        </h1>

        {/* Subheadline */}
        <p className="font-body text-lg md:text-xl text-isabelline/60 max-w-2xl mx-auto leading-relaxed mb-12">
          The most beginner-friendly quantum computing library. No matrix math, 
          no complex Qiskit syntax — just intuitive Python objects that 
          translate to industry-standard simulation.
        </p>

        {/* Terminal Window */}
        <div className="mb-10">
          <TerminalWindow command="pip install qcuit" animated={true} />
        </div>

        {/* Python Version Badge */}
        <p className="font-mono text-xs text-isabelline/40 mb-8">
          Requires Python 3.10+ • Built on Qiskit • 100% Open Source
        </p>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/simulator"
            className="
              inline-flex items-center gap-2 px-8 py-3
              text-sm font-body tracking-[0.15em] uppercase
              bg-vegas-gold text-deep-jungle font-medium
              hover:bg-brass-light
              transition-all duration-300
            "
          >
            <span>Open Studio</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7m7-7H3" />
            </svg>
          </a>
          <button
            onClick={handleQuickStartClick}
            className="
              inline-flex items-center gap-2 px-8 py-3
              text-sm font-body tracking-[0.15em] uppercase
              border border-vegas-gold/50 text-vegas-gold
              hover:bg-vegas-gold hover:text-deep-jungle
              transition-all duration-300
              group
            "
          >
            <span>View Quick Start</span>
            <svg 
              className="w-4 h-4 group-hover:translate-y-1 transition-transform duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
        <span className="font-body text-[10px] tracking-[0.3em] uppercase text-isabelline/30">
          Scroll
        </span>
        <div className="w-px h-12 bg-gradient-to-b from-vegas-gold/40 to-transparent" />
      </div>

      {/* Anchor for scroll */}
      <div ref={quickStartRef} className="absolute bottom-0" />
    </section>
  );
};
