/**
 * Qcuit Documentation Page
 * 
 * Developer-focused documentation hub organized into three sections:
 * Python Library, Studio, and Journal.
 */

import React, { useState } from 'react';

type DocSection = 'library' | 'studio' | 'journal';

const SECTIONS: { id: DocSection; label: string; icon: string; description: string }[] = [
  {
    id: 'library',
    label: 'Python Library',
    icon: '📦',
    description: 'The qcuit Python package — beginner-friendly quantum computing built on Qiskit.',
  },
  {
    id: 'studio',
    label: 'Studio',
    icon: '🔬',
    description: 'Visual circuit builder with drag-and-drop gates, real-time simulation, and code export.',
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: '📰',
    description: 'Peer-reviewed quantum computing articles and educational content.',
  },
];

const LIBRARY_DOCS = [
  {
    title: 'Quick Start',
    content: `Install the library and run your first quantum circuit in under 60 seconds.

\`\`\`bash
pip install qcuit
\`\`\`

\`\`\`python
from qcuit import Qubit, Apply, Circuit
from qcuit.gates import Hadamard, CNOT

a = Qubit("a")
b = Qubit("b")

circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))
circ.add(Apply(CNOT, control=a, target=b))

result = circ.run()
print(result)
\`\`\``,
  },
  {
    title: 'Core Concepts',
    content: `**Qubit** — Represents a single quantum bit. Create with \`Qubit("name")\`.

**Apply** — Applies a gate to one or more qubits. Supports \`target\`, \`control\`, and \`params\`.

**Circuit** — Container for qubits and operations. Call \`.run()\` to simulate.

**Gates** — Built-in gates: \`Hadamard\`, \`PauliX\`, \`PauliY\`, \`PauliZ\`, \`CNOT\`, \`Toffoli\`, \`SWAP\`, \`RX\`, \`RY\`, \`RZ\`, \`S\`, \`T\`, and more.`,
  },
  {
    title: 'API Reference',
    content: `**qcuit.Qubit(name: str)**
Creates a named qubit register.

**qcuit.Apply(gate, target, control=None, params=None)**
Creates a gate operation.

**qcuit.Circuit(*qubits)**
Creates a circuit from qubit registers.
- \`.add(operation)\` — Add a gate operation
- \`.run(shots=1024)\` — Simulate and return measurement counts
- \`.draw()\` — ASCII visualization of the circuit

**qcuit.gates**
All standard quantum gates available as importable objects.`,
  },
];

const STUDIO_DOCS = [
  {
    title: 'Getting Started',
    content: `Navigate to **/simulator** to open the Studio.

**Layout:**
- **Left Panel** — Operations catalog with categorized gates
- **Center** — Circuit canvas (drag & drop)
- **Right Panel** — Generated code (Qiskit, Braket, OpenQASM)
- **Bottom Dock** — Visualization (probabilities, Q-Sphere, Bloch sphere)

**Basic Workflow:**
1. Select a gate from the left panel
2. Click a slot on the circuit canvas to place it
3. Click **Simulate** to run
4. View results in the bottom visualization dock`,
  },
  {
    title: 'Gate Operations',
    content: `**Single-Qubit Gates:** H, X, Y, Z, S, S†, T, T†, RX, RY, RZ

**Multi-Qubit Gates:** CNOT, CZ, SWAP, Toffoli (CCX)

**Classical:** Measurement (M)

**Keyboard Shortcuts:** Press 1-9 to quick-select gates from the active category.

**Editing:** Double-click any placed gate to delete it. Click a parametric gate to edit θ.`,
  },
  {
    title: 'Simulation & Export',
    content: `**Simulate** — Runs the circuit through the statevector simulator with optional noise.

**Noise Model** — Adjust the noise slider (0-10%) to simulate decoherence.

**Code Export** — Generated code tabs:
- **Qiskit** — IBM's quantum SDK
- **Braket** — AWS Braket SDK  
- **OpenQASM** — Hardware-agnostic assembly

**Visualization Tabs:**
- Probability histogram
- Q-Sphere (3D state visualization)
- Bloch Sphere
- Entanglement Graph
- Resource Estimation
- Debug Timeline`,
  },
];

const JOURNAL_DOCS = [
  {
    title: 'About the Journal',
    content: `The Qcuit Journal publishes educational quantum computing articles, tutorials, and research notes.

**Volume/Issue System:**
- Volume = Year (2026 = Vol. I, 2027 = Vol. II)
- Issue = Month (January = Issue I, etc.)

**Categories:** Tutorials, Research Notes, Pedagogy, Circuit Design`,
  },
  {
    title: 'Contributing Articles',
    content: `Articles are managed through the backend API.

**Submission Flow:**
1. Create an account via \`/api/auth/register\`
2. Submit a post via \`POST /api/posts\` with status "pending"
3. An admin reviews and approves via \`POST /api/posts/<slug>/approve\`

**Content Format:** Markdown with LaTeX support for equations.

**Required Fields:** title, content, abstract, category, topics`,
  },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-deep-jungle/90 rounded-lg p-4 overflow-x-auto border border-vegas-gold/10">
      <code className="font-mono text-xs text-isabelline/80 leading-relaxed whitespace-pre">
        {children}
      </code>
    </pre>
  );
}

function DocCard({ title, content }: { title: string; content: string }) {
  const [expanded, setExpanded] = useState(false);

  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```\w*\n?/g, '').replace(/```$/g, '');
        return <CodeBlock key={i}>{code.trim()}</CodeBlock>;
      }
      return (
        <div key={i} className="prose-sm">
          {part.split('\n').map((line, j) => {
            if (!line.trim()) return <div key={j} className="h-3" />;
            // Bold text
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-isabelline">$1</strong>');
            // Inline code
            const withCode = formatted.replace(/`(.*?)`/g, '<code class="font-mono text-xs bg-deep-jungle/50 px-1.5 py-0.5 rounded text-vegas-gold/80">$1</code>');
            return (
              <p
                key={j}
                className="font-body text-sm text-isabelline/70 leading-relaxed mb-1"
                dangerouslySetInnerHTML={{ __html: withCode }}
              />
            );
          })}
        </div>
      );
    });
  };

  return (
    <div className="border border-vegas-gold/10 rounded-lg overflow-hidden transition-all duration-300 hover:border-vegas-gold/25">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 flex items-center justify-between text-left bg-forest-light/30 hover:bg-forest-light/50 transition-colors"
      >
        <h3 className="font-display text-lg text-isabelline">{title}</h3>
        <svg
          className={`w-5 h-5 text-vegas-gold/60 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-6 py-5 space-y-3 border-t border-vegas-gold/10">
          {renderContent(content)}
        </div>
      )}
    </div>
  );
}

export function Documentation() {
  const [activeSection, setActiveSection] = useState<DocSection>('library');

  const docs =
    activeSection === 'library' ? LIBRARY_DOCS :
    activeSection === 'studio' ? STUDIO_DOCS :
    JOURNAL_DOCS;

  return (
    <div className="noise-texture min-h-screen bg-deep-jungle text-isabelline">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-5 bg-deep-jungle/95 backdrop-blur-md border-b border-vegas-gold/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/" className="font-display text-2xl text-isabelline tracking-tight hover:text-vegas-gold transition-colors duration-300">
            Qcuit
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
                className={`text-sm font-body tracking-wide uppercase transition-colors duration-300 ${
                  link.label === 'Documentation' ? 'text-vegas-gold' : 'text-isabelline/60 hover:text-vegas-gold'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-8">
        <div className="max-w-6xl mx-auto">
          <span className="font-body text-xs tracking-[0.3em] uppercase text-vegas-gold/60 block mb-4">
            Developer Guide
          </span>
          <h1 className="font-display text-5xl text-isabelline mb-4">
            Documentation
          </h1>
          <p className="font-body text-lg text-isabelline/50 max-w-2xl">
            Everything you need to build quantum circuits with Qcuit — from the Python library 
            to the visual Studio and the research Journal.
          </p>
        </div>
      </section>

      {/* Section Tabs */}
      <section className="px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`p-6 rounded-lg text-left transition-all duration-300 border ${
                  activeSection === section.id
                    ? 'bg-vegas-gold/10 border-vegas-gold/40 shadow-lg shadow-vegas-gold/5'
                    : 'bg-forest-light/20 border-vegas-gold/10 hover:border-vegas-gold/25 hover:bg-forest-light/40'
                }`}
              >
                <span className="text-2xl mb-3 block">{section.icon}</span>
                <h3 className={`font-display text-xl mb-2 ${
                  activeSection === section.id ? 'text-vegas-gold' : 'text-isabelline'
                }`}>
                  {section.label}
                </h3>
                <p className="font-body text-sm text-isabelline/50">{section.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Doc Content */}
      <section className="px-8 pb-24">
        <div className="max-w-6xl mx-auto space-y-3">
          {docs.map((doc, i) => (
            <DocCard key={`${activeSection}-${i}`} title={doc.title} content={doc.content} />
          ))}
        </div>
      </section>

      {/* Contributing CTA */}
      <section className="px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="border border-vegas-gold/20 rounded-lg p-10 text-center bg-forest-light/20">
            <h2 className="font-display text-2xl text-isabelline mb-4">
              Want to Contribute?
            </h2>
            <p className="font-body text-isabelline/50 max-w-lg mx-auto mb-6">
              Qcuit is open source. Check out the repository, read the contributing guide, 
              and submit your first pull request.
            </p>
            <a
              href="https://github.com/Faiz-k490/Qcuit.com"
              className="inline-flex items-center gap-3 px-8 py-3 text-sm font-body tracking-[0.15em] uppercase bg-vegas-gold text-deep-jungle font-medium hover:bg-brass-light transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-vegas-gold/10 px-8 py-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-body text-xs text-isabelline/20">© 2026 Qcuit.com</span>
          <div className="flex items-center gap-6">
            <a href="/" className="font-body text-xs text-isabelline/30 hover:text-vegas-gold transition-colors">Home</a>
            <a href="/simulator" className="font-body text-xs text-isabelline/30 hover:text-vegas-gold transition-colors">Studio</a>
            <a href="/hub" className="font-body text-xs text-isabelline/30 hover:text-vegas-gold transition-colors">Journal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Documentation;
