/**
 * Qcuit.com v5.0 Landing Page — Library Focus
 * 
 * "Progressive Old Money" Aesthetic + Developer-First Design
 * Quick Start showcase for the qcuit Python library
 * Typography: Playfair Display (display) + Inter (body) + JetBrains Mono (code)
 * Palette: Deep Jungle, Isabelline, Burnished Gold
 */

import React, { useState, useEffect, useRef } from 'react';
import { HeroSection } from '../components/HeroSection';
import { QuickStartShowcase } from '../components/QuickStartShowcase';
import { JournalPreviewSection } from '../components/JournalPreviewSection';

// ─── Navigation ───────────────────────────────────────────────────
const Nav = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50 px-8 py-5
        transition-all duration-500
        ${scrolled
          ? 'bg-deep-jungle/95 backdrop-blur-md border-b border-vegas-gold/10 py-4'
          : ''
        }
      `}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <span className="font-display text-2xl text-isabelline tracking-tight group-hover:text-vegas-gold transition-colors duration-300">
            Qcuit
          </span>
        </a>

        <div className="hidden md:flex items-center gap-10">
          {[
            { label: 'Studio', href: '/simulator' },
            { label: 'Journal', href: '/hub' },
            { label: 'Documentation', href: '/docs' },
            { label: 'GitHub', href: 'https://github.com/Faiz-k490/Qcuit.com' },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-isabelline/60 hover:text-vegas-gold text-sm font-body tracking-wide uppercase transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="https://pypi.org/project/qcuit"
          className="
            px-6 py-2.5 text-sm font-body tracking-wide uppercase
            border border-vegas-gold text-vegas-gold
            hover:bg-vegas-gold hover:text-deep-jungle
            transition-all duration-300
          "
        >
          pip install qcuit
        </a>
      </div>
    </nav>
  );
};

// ─── Divider ──────────────────────────────────────────────────────
const GoldDivider = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-16 h-px bg-vegas-gold/30" />
    <div className="w-2 h-2 rotate-45 border border-vegas-gold/40 mx-4" />
    <div className="w-16 h-px bg-vegas-gold/30" />
  </div>
);

// ─── Feature Card ─────────────────────────────────────────────────
const FeatureCard = ({
  icon,
  title,
  description,
  codeExample,
}: {
  icon: string;
  title: string;
  description: string;
  codeExample: string;
}) => (
  <div className="p-8 border border-vegas-gold/10 hover:border-vegas-gold/30 bg-forest-light/50 transition-all duration-500 group">
    <div className="w-12 h-12 rounded-lg bg-vegas-gold/10 flex items-center justify-center mb-6 group-hover:bg-vegas-gold/20 transition-colors duration-300">
      <span className="font-mono text-2xl text-vegas-gold">{icon}</span>
    </div>
    <h3 className="font-display text-2xl text-isabelline mb-3">{title}</h3>
    <p className="font-body text-isabelline/70 leading-relaxed mb-4">{description}</p>
    <div className="bg-code-bg rounded p-3 font-mono text-xs text-code-keyword overflow-x-auto">
      <code>{codeExample}</code>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// LANDING PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
export function LandingPage() {
  const quickStartRef = useRef<HTMLDivElement>(null);

  const scrollToQuickStart = () => {
    quickStartRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="noise-texture min-h-screen bg-deep-jungle text-isabelline overflow-x-hidden">
      <Nav />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <HeroSection onQuickStartClick={scrollToQuickStart} />

      {/* ── QUICK START SHOWCASE ─────────────────────────────── */}
      <div ref={quickStartRef} id="quickstart">
        <QuickStartShowcase />
      </div>

      {/* ── JOURNAL PREVIEW (DARK-TO-LIGHT BRIDGE) ─────────── */}
      <JournalPreviewSection />

      {/* ── VALUE PILLARS ────────────────────────────────────── */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="font-body text-xs tracking-[0.3em] uppercase text-vegas-gold/60 block mb-4">
              Why Qcuit?
            </span>
            <h2 className="font-display text-title text-isabelline">
              Quantum Computing, Simplified
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-vegas-gold/10">
            <FeatureCard
              icon="🎯"
              title="Intuitive API"
              description="No matrix math required. Create circuits with plain English: Qubit(), Apply(), and Circuit()."
              codeExample="circ.add(Apply(Hadamard, target=a))"
            />
            <FeatureCard
              icon="⚡"
              title="Qiskit Backend"
              description="Industry-standard simulation under the hood. Your code runs on Qiskit's AerSimulator."
              codeExample="run_simulation(circ)  # 1024 shots"
            />
            <FeatureCard
              icon="📚"
              title="Built for Beginners"
              description="Friendly error messages, ASCII visualization, and comprehensive documentation."
              codeExample="QcuitError: Try Apply(CNOT, target=b, control=a)"
            />
          </div>
        </div>
      </section>

      {/* ── GITHUB CTA ─────────────────────────────────────────── */}
      <section className="py-24 px-8 bg-forest-light/30">
        <div className="max-w-3xl mx-auto text-center">
          <GoldDivider />

          <h2 className="font-display text-title text-isabelline mb-6">
            Open Source & Community-Driven
          </h2>

          <p className="font-body text-isabelline/50 max-w-lg mx-auto leading-relaxed mb-10">
            Qcuit is 100% open source. Contribute, report issues, or explore the codebase 
            on GitHub. Built by students, for students.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/Faiz-k490/Qcuit.com"
              className="
                inline-flex items-center gap-3 px-10 py-4
                text-sm font-body tracking-[0.15em] uppercase
                bg-vegas-gold text-deep-jungle font-medium
                hover:bg-brass-light
                transition-all duration-300
              "
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>View on GitHub</span>
            </a>

            <a
              href="/docs"
              className="
                inline-flex items-center gap-3 px-10 py-4
                text-sm font-body tracking-[0.15em] uppercase
                border border-vegas-gold/50 text-vegas-gold
                hover:bg-vegas-gold hover:text-deep-jungle
                transition-all duration-300
              "
            >
              <span>Read Documentation</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-vegas-gold/10 px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <span className="font-display text-2xl text-isabelline">Qcuit</span>
              <p className="font-body text-sm text-isabelline/40 mt-3 leading-relaxed max-w-md">
                The most beginner-friendly quantum computing library.
                Write quantum code in plain English. Built on Qiskit. 
                100% open source.
              </p>
            </div>

            {/* Links */}
            <div>
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-vegas-gold/40 block mb-4">
                Resources
              </span>
              <div className="space-y-2">
                {[
                  { label: 'Quick Start', href: '#quickstart' },
                  { label: 'Documentation', href: '/docs' },
                  { label: 'API Reference', href: '/docs/api' },
                  { label: 'Examples', href: '/docs/examples' },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block font-body text-sm text-isabelline/50 hover:text-vegas-gold transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Connect */}
            <div>
              <span className="font-body text-[10px] tracking-[0.3em] uppercase text-vegas-gold/40 block mb-4">
                Connect
              </span>
              <div className="space-y-2">
                <a href="https://github.com/Faiz-k490/Qcuit.com" className="block font-body text-sm text-isabelline/50 hover:text-vegas-gold transition-colors duration-300">
                  GitHub
                </a>
                <a href="https://pypi.org/project/qcuit" className="block font-body text-sm text-isabelline/50 hover:text-vegas-gold transition-colors duration-300">
                  PyPI
                </a>
                <a href="mailto:hello@qcuit.com" className="block font-body text-sm text-isabelline/50 hover:text-vegas-gold transition-colors duration-300">
                  hello@qcuit.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-vegas-gold/5 flex items-center justify-between">
            <span className="font-body text-xs text-isabelline/20">
              © 2026 Qcuit.com. MIT License.
            </span>
            <span className="font-body text-[10px] tracking-[0.2em] uppercase text-isabelline/15">
              pip install qcuit
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
