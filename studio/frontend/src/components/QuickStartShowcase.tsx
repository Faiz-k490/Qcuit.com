import React from 'react';
import { CodeWindow } from './CodeWindow';
import { ASCIIDisplay } from './ASCIIDisplay';
import { ResultsDisplay } from './ResultsDisplay';

// Bell State example code for the showcase
const BELL_STATE_CODE = `from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

# Create two qubits
a = Qubit("a")
b = Qubit("b")

# Build the circuit
circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))              # Superposition
circ.add(Apply(CNOT, target=b, control=a))     # Entanglement
circ.measure_all()

# Visualize and run
circ.draw()
results = run_simulation(circ)`;

// ASCII output from circuit.draw()
const ASCII_OUTPUT = `Qubit(a): ---[H]---[*]---[M]
Qubit(b): ---------[+]---[M]`;

// Simulated measurement results
const MEASUREMENT_RESULTS = [
  { state: '00', count: 512 },
  { state: '11', count: 512 },
];

export const QuickStartShowcase: React.FC = () => {
  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="font-body text-xs tracking-[0.3em] uppercase text-vegas-gold/60 block mb-4">
            Quick Start
          </span>
          <h2 className="font-display text-title text-isabelline mb-6">
            Your First Quantum Program
          </h2>
          <p className="font-body text-isabelline/60 max-w-2xl mx-auto leading-relaxed">
            Create a Bell State — the simplest example of quantum entanglement — 
            in just a few lines of intuitive Python code.
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Column: Code */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-vegas-gold/20 flex items-center justify-center">
                <span className="font-mono text-sm text-vegas-gold">01</span>
              </div>
              <span className="font-body text-sm text-isabelline/80">Write the code</span>
            </div>
            <CodeWindow 
              code={BELL_STATE_CODE}
              showLineNumbers={true}
              highlightedLines={[8, 9, 10]}
              title="bell_state.py"
            />
          </div>

          {/* Right Column: Outputs */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-vegas-gold/20 flex items-center justify-center">
                <span className="font-mono text-sm text-vegas-gold">02</span>
              </div>
              <span className="font-body text-sm text-isabelline/80">See the results</span>
            </div>
            
            {/* ASCII Circuit Diagram */}
            <ASCIIDisplay 
              asciiOutput={ASCII_OUTPUT}
              animated={true}
              delay={500}
            />

            {/* Measurement Results */}
            <ResultsDisplay 
              results={MEASUREMENT_RESULTS}
              animated={true}
              delay={1500}
            />
          </div>
        </div>

        {/* Explanation Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border border-vegas-gold/10 bg-forest-light/30">
            <div className="w-10 h-10 rounded-lg bg-vegas-gold/10 flex items-center justify-center mb-4">
              <span className="font-mono text-lg text-vegas-gold">H</span>
            </div>
            <h3 className="font-display text-lg text-isabelline mb-2">Hadamard Gate</h3>
            <p className="font-body text-sm text-isabelline/60 leading-relaxed">
              Puts qubit "a" into superposition — equal probability of being |0⟩ or |1⟩.
            </p>
          </div>

          <div className="p-6 border border-vegas-gold/10 bg-forest-light/30">
            <div className="w-10 h-10 rounded-lg bg-vegas-gold/10 flex items-center justify-center mb-4">
              <span className="font-mono text-lg text-vegas-gold">⊕</span>
            </div>
            <h3 className="font-display text-lg text-isabelline mb-2">CNOT Gate</h3>
            <p className="font-body text-sm text-isabelline/60 leading-relaxed">
              Entangles qubits "a" and "b" — they always collapse to the same value.
            </p>
          </div>

          <div className="p-6 border border-vegas-gold/10 bg-forest-light/30">
            <div className="w-10 h-10 rounded-lg bg-vegas-gold/10 flex items-center justify-center mb-4">
              <span className="font-mono text-lg text-vegas-gold">📊</span>
            </div>
            <h3 className="font-display text-lg text-isabelline mb-2">Measurement</h3>
            <p className="font-body text-sm text-isabelline/60 leading-relaxed">
              Running 1024 shots shows entanglement — only |00⟩ and |11⟩ appear.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
