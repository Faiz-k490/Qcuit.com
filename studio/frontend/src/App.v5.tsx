/**
 * Qcuit Studio v5.0 — IBM Composer-inspired, Progressive Old Money aesthetic
 *
 * 4-zone layout:
 *   Top    — Menu bar (File, Edit, View, Circuit, Help)
 *   Left   — Operations catalog with ⓘ info per gate
 *   Center — Circuit canvas + bottom visualization dock
 *   Right  — Code / Inspector / Problems
 */

import React, { useState, useRef, useEffect } from 'react';
import { SmartPopover, HoverPopover } from './components/SmartPopover';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { CircuitProvider, useCircuit } from './store/CircuitContext';
import { CircuitCanvas } from './components/CircuitCanvas';
import { OutputDisplay } from './components/OutputDisplay';
import { QSphere } from './components/QSphere';
import { ResourcePanel } from './components/ResourcePanel';
import { EntanglementGraph } from './components/EntanglementGraph';
import { DebugTimeline } from './components/DebugTimeline';
import { BlochSphere } from './components/BlochSphere';
import { TutorChat } from './components/TutorChat';

/* ═══════════════════════════════════════════════════════
   Gate metadata — descriptions, matrices, categories
   ═══════════════════════════════════════════════════════ */
interface GateMeta {
  symbol: string;
  label: string;
  category: 'pauli' | 'phase' | 'parametric' | 'multi' | 'classical';
  color: string;
  borderColor: string;
  info: string;
  matrix?: string;
}

const GATE_META: Record<string, GateMeta> = {
  H:    { symbol: 'H',  label: 'Hadamard',     category: 'pauli',      color: '#1565c0', borderColor: '#42a5f5', info: 'Creates equal superposition. Maps |0⟩→|+⟩ and |1⟩→|−⟩.', matrix: '1/√2 [[1,1],[1,-1]]' },
  X:    { symbol: 'X',  label: 'Pauli-X (NOT)', category: 'pauli',     color: '#42a5f5', borderColor: '#90caf9', info: 'Bit-flip gate. Rotates 180° around the X-axis of the Bloch sphere.', matrix: '[[0,1],[1,0]]' },
  Y:    { symbol: 'Y',  label: 'Pauli-Y',       category: 'pauli',     color: '#26a69a', borderColor: '#80cbc4', info: 'Combines bit-flip and phase-flip. Rotates 180° around Y-axis.', matrix: '[[0,-i],[i,0]]' },
  Z:    { symbol: 'Z',  label: 'Pauli-Z',       category: 'pauli',     color: '#26a69a', borderColor: '#80cbc4', info: 'Phase-flip gate. Maps |1⟩→−|1⟩. Rotates 180° around Z-axis.', matrix: '[[1,0],[0,-1]]' },
  I:    { symbol: 'I',  label: 'Identity',       category: 'pauli',     color: '#546e7a', borderColor: '#90a4ae', info: 'Does nothing. Used as a placeholder or for timing alignment.' },
  S:    { symbol: 'S',  label: 'S (√Z)',         category: 'phase',     color: '#7e57c2', borderColor: '#b39ddb', info: 'Quarter-turn phase gate. Adds π/2 phase to |1⟩.', matrix: '[[1,0],[0,i]]' },
  'S†': { symbol: 'S†', label: 'S-dagger',      category: 'phase',     color: '#7e57c2', borderColor: '#b39ddb', info: 'Inverse of S gate. Adds −π/2 phase to |1⟩.', matrix: '[[1,0],[0,-i]]' },
  T:    { symbol: 'T',  label: 'T (π/8)',        category: 'phase',     color: '#7e57c2', borderColor: '#b39ddb', info: 'Eighth-turn phase gate. Adds π/4 phase to |1⟩. Key for universality.', matrix: '[[1,0],[0,e^(iπ/4)]]' },
  'T†': { symbol: 'T†', label: 'T-dagger',      category: 'phase',     color: '#7e57c2', borderColor: '#b39ddb', info: 'Inverse of T gate. Adds −π/4 phase to |1⟩.' },
  RX:   { symbol: 'Rx', label: 'Rotation-X',    category: 'parametric', color: '#ef6c00', borderColor: '#ffb74d', info: 'Parameterized rotation around X-axis by angle θ.', matrix: 'cos(θ/2)I − i·sin(θ/2)X' },
  RY:   { symbol: 'Ry', label: 'Rotation-Y',    category: 'parametric', color: '#ef6c00', borderColor: '#ffb74d', info: 'Parameterized rotation around Y-axis by angle θ.', matrix: 'cos(θ/2)I − i·sin(θ/2)Y' },
  RZ:   { symbol: 'Rz', label: 'Rotation-Z',    category: 'parametric', color: '#ef6c00', borderColor: '#ffb74d', info: 'Parameterized rotation around Z-axis by angle θ.', matrix: 'e^(-iθ/2)|0⟩⟨0| + e^(iθ/2)|1⟩⟨1|' },
  CNOT: { symbol: '⊕',  label: 'CNOT (CX)',     category: 'multi',     color: '#42a5f5', borderColor: '#90caf9', info: 'Controlled-NOT. Flips target qubit if control qubit is |1⟩. Creates entanglement.' },
  CZ:   { symbol: 'CZ', label: 'Controlled-Z',  category: 'multi',     color: '#26a69a', borderColor: '#80cbc4', info: 'Adds −1 phase when both qubits are |1⟩. Symmetric between qubits.' },
  SWAP: { symbol: '⨯',  label: 'SWAP',          category: 'multi',     color: '#42a5f5', borderColor: '#90caf9', info: 'Exchanges the states of two qubits.' },
  CCX:  { symbol: '⊕⊕', label: 'Toffoli (CCX)', category: 'multi',     color: '#42a5f5', borderColor: '#90caf9', info: 'Double-controlled NOT. Flips target when both controls are |1⟩. Universal for classical logic.' },
  M:    { symbol: '📏', label: 'Measure',        category: 'classical', color: '#37474f', borderColor: '#78909c', info: 'Measures a qubit in the computational basis, collapsing it to |0⟩ or |1⟩.' },
};

const GATE_CATEGORIES = [
  { id: 'pauli', label: 'Standard', gates: ['H', 'X', 'Y', 'Z', 'I'] },
  { id: 'phase', label: 'Phase', gates: ['S', 'S†', 'T', 'T†'] },
  { id: 'parametric', label: 'Parametric', gates: ['RX', 'RY', 'RZ'] },
  { id: 'multi', label: 'Multi-Qubit', gates: ['CNOT', 'CZ', 'SWAP', 'CCX'] },
  { id: 'classical', label: 'Measurement', gates: ['M'] },
];

/* ═══════════════════════════════════════════════════════
   Presets
   ═══════════════════════════════════════════════════════ */
const PRESETS = [
  { id: 'bell', label: 'Bell State (2q)', category: 'Entanglement' },
  { id: 'ghz3', label: 'GHZ State (3q)', category: 'Entanglement' },
  { id: 'superposition', label: 'Uniform (3q)', category: 'Superposition' },
  { id: 'qft2', label: 'QFT (2q)', category: 'Superposition' },
  { id: 'swap', label: 'SWAP Test (2q)', category: 'Multi-Qubit' },
  { id: 'toffoli', label: 'Toffoli (3q)', category: 'Multi-Qubit' },
];

/* ═══════════════════════════════════════════════════════
   InfoButton — reusable ⓘ tooltip / popover
   ═══════════════════════════════════════════════════════ */
function InfoButton({ text, matrix, className = '' }: { text: string; matrix?: string; className?: string }) {
  return (
    <SmartPopover
      trigger={
        <button
          className="w-4 h-4 rounded-full border border-vegas-gold/30 bg-transparent text-vegas-gold/60 hover:text-vegas-gold hover:border-vegas-gold/60 transition-all flex items-center justify-center text-[9px] font-mono leading-none"
          title="More info"
        >
          i
        </button>
      }
      content={
        <>
          <p className="font-body text-xs text-isabelline/80 leading-relaxed">{text}</p>
          {matrix && (
            <p className="font-mono text-[10px] text-vegas-gold/70 mt-2 bg-deep-jungle/50 rounded px-2 py-1">{matrix}</p>
          )}
        </>
      }
      preferredPosition="bottom"
      width={256}
      className={className}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   MenuBar dropdown
   ═══════════════════════════════════════════════════════ */
interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

function MenuDropdown({ label, items, isOpen, onToggle }: {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`px-3 py-1 font-body text-xs transition-colors rounded ${
          isOpen ? 'bg-vegas-gold/10 text-vegas-gold' : 'text-isabelline/60 hover:text-isabelline hover:bg-forest-light/50'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 heritage-card rounded-lg border border-vegas-gold/20 py-1 shadow-xl z-50">
          {items.map((item, i) =>
            item.divider ? (
              <div key={i} className="my-1 border-t border-vegas-gold/10" />
            ) : (
              <button
                key={i}
                onClick={() => { item.action?.(); onToggle(); }}
                disabled={item.disabled}
                className="w-full px-3 py-1.5 flex items-center justify-between font-body text-xs text-isabelline/70 hover:bg-vegas-gold/10 hover:text-isabelline disabled:opacity-30 transition-colors"
              >
                <span>{item.label}</span>
                {item.shortcut && <span className="font-mono text-[10px] text-isabelline/40">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   OperationsCatalog — redesigned left sidebar
   ═══════════════════════════════════════════════════════ */
function OperationsCatalog({ selectedGate, onGateSelect }: {
  selectedGate: string | null;
  onGateSelect: (gate: string) => void;
}) {
  const { state, setNoiseLevel, clearCircuit, undo, redo, canUndo, canRedo } = useCircuit();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = GATE_CATEGORIES.map(cat => ({
    ...cat,
    gates: cat.gates.filter(g => {
      if (!searchQuery) return true;
      const meta = GATE_META[g];
      const q = searchQuery.toLowerCase();
      return g.toLowerCase().includes(q) || meta.label.toLowerCase().includes(q);
    }),
  })).filter(cat => cat.gates.length > 0);

  return (
    <div className="h-full flex flex-col bg-forest-light/40 border-r border-vegas-gold/10">
      {/* Header */}
      <div className="px-3 py-3 border-b border-vegas-gold/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-body text-xs font-semibold text-isabelline/90 uppercase tracking-wider">Operations</span>
          <InfoButton text="Drag-and-drop quantum gates onto the circuit canvas. Click a gate to select it, then click a slot on the canvas to place it." />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={canUndo ? undo : undefined}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              canUndo ? 'text-isabelline/60 hover:text-isabelline hover:bg-vegas-gold/10 cursor-pointer' : 'text-isabelline/20 cursor-default'
            }`}
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            onClick={canRedo ? redo : undefined}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
              canRedo ? 'text-isabelline/60 hover:text-isabelline hover:bg-vegas-gold/10 cursor-pointer' : 'text-isabelline/20 cursor-default'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search gates..."
          className="w-full px-2.5 py-1.5 rounded bg-deep-jungle/50 border border-vegas-gold/15 text-isabelline/80 placeholder-isabelline/30 font-body text-xs focus:outline-none focus:border-vegas-gold/40 transition-colors"
        />
      </div>

      {/* Gate categories */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filteredCategories.map(cat => (
          <div key={cat.id} className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-body text-[10px] uppercase tracking-widest text-vegas-gold/50">{cat.label}</span>
              <InfoButton text={
                cat.id === 'pauli' ? 'Fundamental single-qubit gates. H creates superposition; X, Y, Z are Pauli operators.' :
                cat.id === 'phase' ? 'Phase gates add relative phase to |1⟩ without changing probabilities.' :
                cat.id === 'parametric' ? 'Rotation gates with a continuous angle parameter θ.' :
                cat.id === 'multi' ? 'Multi-qubit gates that create entanglement and correlations between qubits.' :
                'Measurement collapses a qubit to a classical bit.'
              } />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {cat.gates.map(g => {
                const meta = GATE_META[g];
                const isSelected = selectedGate === g;
                return (
                  <HoverPopover
                    key={g}
                    trigger={
                      <button
                        onClick={() => onGateSelect(g)}
                        className="relative flex items-center justify-center rounded-md transition-all duration-150"
                        style={{
                          width: 38,
                          height: 38,
                          backgroundColor: meta.color,
                          border: isSelected ? '2px solid #F5F2EA' : `1px solid ${meta.borderColor}`,
                          boxShadow: isSelected ? '0 0 0 2px rgba(197,160,89,0.5)' : 'none',
                          fontSize: g.length > 3 ? 9 : g.length > 2 ? 10 : 13,
                          fontWeight: 700,
                          color: '#fff',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {meta.symbol}
                      </button>
                    }
                    content={
                      <>
                        <div className="font-body text-xs font-semibold text-isabelline mb-1">{meta.label}</div>
                        <div className="font-body text-[11px] text-isabelline/70 leading-relaxed">{meta.info}</div>
                        {meta.matrix && (
                          <div className="font-mono text-[10px] text-vegas-gold/60 mt-1.5 bg-deep-jungle/50 rounded px-2 py-1">{meta.matrix}</div>
                        )}
                      </>
                    }
                    preferredPosition="bottom"
                    width={208}
                    delay={300}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Noise slider */}
      <div className="px-3 py-3 border-t border-vegas-gold/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-body text-[10px] uppercase tracking-widest text-vegas-gold/50">Noise</span>
            <InfoButton text="Simulates decoherence. Higher noise reduces fidelity, modelling real hardware errors like T1/T2 decay." />
          </div>
          <span className="font-mono text-[10px] text-isabelline/50">{(state.noiseLevel * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={0.1}
          step={0.005}
          value={state.noiseLevel}
          onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
          className="w-full h-1 rounded-full appearance-none bg-deep-jungle/50 accent-vegas-gold cursor-pointer"
        />
      </div>

      {/* Instructions + clear */}
      <div className="px-3 py-3 border-t border-vegas-gold/10">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="font-body text-[10px] uppercase tracking-widest text-vegas-gold/50">How to use</span>
          <InfoButton text="1) Select a gate from above. 2) Click a slot on the circuit canvas. 3) For multi-qubit gates, click the control qubit first, then the target. 4) Double-click any gate to delete it." />
        </div>
        <div className="font-body text-[11px] text-isabelline/50 space-y-0.5">
          <div>Click gate → click slot</div>
          <div>Double-click to delete</div>
          <div className="font-mono text-[10px] text-isabelline/30 mt-1">Keys: 1-9 for quick select</div>
        </div>
        <button
          onClick={clearCircuit}
          className="mt-3 w-full py-1.5 rounded border border-muted-brick/30 text-muted-brick/70 hover:bg-muted-brick/10 hover:text-muted-brick transition-colors font-body text-xs"
        >
          Clear Circuit
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Visualization Dock tabs (bottom)
   ═══════════════════════════════════════════════════════ */
const VIZ_TABS = [
  { id: 'probabilities', label: 'Probabilities', icon: '📊', info: 'Bar chart showing the likelihood of each computational basis state after simulation.' },
  { id: 'qsphere', label: 'Q-cuit Sphere', icon: '⚛', info: 'Global 3D visualization of a multi-qubit state. Node size = probability, color = phase.' },
  { id: 'bloch', label: 'Bloch Sphere', icon: '🌐', info: 'Single-qubit state visualization on the unit sphere. Shows the geometric meaning of quantum operations.' },
  { id: 'entanglement', label: 'Entanglement', icon: '🔗', info: 'Graph showing Von Neumann entropy between qubit pairs. Thicker edges = stronger entanglement.' },
  { id: 'resources', label: 'Resources', icon: '⚙', info: 'Estimates gate counts, fidelity, and runtime for real quantum hardware backends.' },
  { id: 'debug', label: 'Debug', icon: '🔍', info: 'Step through the circuit timestep-by-timestep, watching the state evolve.' },
];

/* ═══════════════════════════════════════════════════════
   Code panel tabs (right sidebar)
   ═══════════════════════════════════════════════════════ */
const CODE_TABS = [
  { id: 'qiskit', label: 'Qiskit', info: 'Python code using IBM\'s Qiskit framework.' },
  { id: 'braket', label: 'Braket', info: 'Python code using Amazon Braket SDK.' },
  { id: 'openqasm', label: 'OpenQASM', info: 'Open Quantum Assembly Language — the standard circuit interchange format.' },
  { id: 'problems', label: 'Problems', info: 'Circuit validation warnings and errors.' },
];

/* ═══════════════════════════════════════════════════════
   Main CircuitEditor
   ═══════════════════════════════════════════════════════ */
function CircuitEditor() {
  const {
    state,
    results,
    isSimulating,
    addQubit,
    removeQubit,
    runCircuit,
    loadCircuit,
    clearCircuit,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCircuit();

  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [activeVizTab, setActiveVizTab] = useState('probabilities');
  const [activeCodeTab, setActiveCodeTab] = useState('qiskit');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ title: string; message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [inspectTimestep, setInspectTimestep] = useState<number | null>(null);

  // Panel visibility
  const [panels, setPanels] = useState({
    operations: true,
    code: true,
    visualizations: true,
    tutor: false,
  });

  const togglePanel = (panel: keyof typeof panels) =>
    setPanels(prev => ({ ...prev, [panel]: !prev[panel] }));

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Presets
  const loadPreset = (preset: string) => {
    const presets: Record<string, any> = {
      bell: {
        numQubits: 2, numClassical: 2, numTimesteps: 10,
        gates: { 'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 } },
        multiQubitGates: [{ id: 'preset-cnot-0', gateType: 'CNOT', controls: [0], targets: [1], timestep: 1 }],
        measurements: [], noiseLevel: 0,
      },
      ghz3: {
        numQubits: 3, numClassical: 3, numTimesteps: 10,
        gates: { 'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 } },
        multiQubitGates: [
          { id: 'preset-cnot-0', gateType: 'CNOT', controls: [0], targets: [1], timestep: 1 },
          { id: 'preset-cnot-1', gateType: 'CNOT', controls: [1], targets: [2], timestep: 2 },
        ],
        measurements: [], noiseLevel: 0,
      },
      superposition: {
        numQubits: 3, numClassical: 3, numTimesteps: 10,
        gates: {
          'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 },
          'q_1-0': { id: 'preset-h-1', gateType: 'H', qubit: 1, timestep: 0 },
          'q_2-0': { id: 'preset-h-2', gateType: 'H', qubit: 2, timestep: 0 },
        },
        multiQubitGates: [], measurements: [], noiseLevel: 0,
      },
      qft2: {
        numQubits: 2, numClassical: 2, numTimesteps: 10,
        gates: {
          'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 },
          'q_1-2': { id: 'preset-h-1', gateType: 'H', qubit: 1, timestep: 2 },
        },
        multiQubitGates: [{ id: 'preset-cz-0', gateType: 'CZ', controls: [0], targets: [1], timestep: 1 }],
        measurements: [], noiseLevel: 0,
      },
      swap: {
        numQubits: 2, numClassical: 2, numTimesteps: 10,
        gates: { 'q_0-0': { id: 'preset-x-0', gateType: 'X', qubit: 0, timestep: 0 } },
        multiQubitGates: [{ id: 'preset-swap-0', gateType: 'SWAP', controls: [0], targets: [1], timestep: 1 }],
        measurements: [], noiseLevel: 0,
      },
      toffoli: {
        numQubits: 3, numClassical: 3, numTimesteps: 10,
        gates: {
          'q_0-0': { id: 'preset-x-0', gateType: 'X', qubit: 0, timestep: 0 },
          'q_1-0': { id: 'preset-x-1', gateType: 'X', qubit: 1, timestep: 0 },
        },
        multiQubitGates: [{ id: 'preset-ccx-0', gateType: 'CCX', controls: [0, 1], targets: [2], timestep: 1 }],
        measurements: [], noiseLevel: 0,
      },
    };
    if (presets[preset]) {
      loadCircuit(presets[preset]);
      showNotification('Preset Loaded', `Loaded ${preset.toUpperCase()} circuit.`, 'success');
    }
  };

  // Load circuit from URL on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('circuit');
      if (sharedState) {
        const loadedState = JSON.parse(atob(sharedState));
        if (loadedState.numQubits && loadedState.gates) {
          loadCircuit(loadedState);
          showNotification('Circuit Loaded', 'Successfully loaded shared circuit.', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to load shared circuit:', error);
    }
  }, [loadCircuit]);

  // Share
  const getShareableLink = () => {
    try {
      const base64State = btoa(JSON.stringify(state));
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('circuit', base64State);
      window.history.pushState({}, '', url.toString());
      navigator.clipboard.writeText(url.toString())
        .then(() => showNotification('Link Copied', 'Circuit URL copied to clipboard.', 'success'))
        .catch(() => showNotification('URL Ready', 'Link updated in your address bar.', 'info'));
    } catch (error) {
      showNotification('Error', 'Could not create shareable link.', 'error');
    }
  };

  // Optimize
  const handleOptimize = async () => {
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gates: state.gates, multiQubitGates: state.multiQubitGates, level: 2 }),
      });
      if (response.ok) {
        const data = await response.json();
        showNotification('Optimized', `Removed ${data.gates_removed} gates (${data.original_count} → ${data.optimized_count})`, 'success');
      }
    } catch (error: any) {
      showNotification('Failed', error.message || 'Optimization error.', 'error');
    }
  };

  // Simulate
  const handleSimulate = async () => {
    try {
      await runCircuit();
      showNotification('Simulation Complete', 'Results updated.', 'success');
    } catch (error: any) {
      showNotification('Simulation Failed', error.message || 'Check console.', 'error');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCircuit(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === 'Escape') setSelectedGate(null);
      const gateMap: Record<string, string> = { '1': 'H', '2': 'X', '3': 'Y', '4': 'Z', '5': 'S', '6': 'T', '7': 'RX', '8': 'RY', '9': 'RZ' };
      if (gateMap[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const t = e.target as HTMLElement;
        if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') setSelectedGate(gateMap[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runCircuit, undo, redo]);

  /* ─── Menu definitions ─── */
  const fileMenu: MenuItem[] = [
    { label: 'New Circuit', shortcut: '⌘N', action: clearCircuit },
    { label: 'Share / Export Link', shortcut: '⌘S', action: getShareableLink },
    { divider: true, label: '' },
    ...PRESETS.map(p => ({ label: `Load: ${p.label}`, action: () => loadPreset(p.id) })),
  ];

  const editMenu: MenuItem[] = [
    { label: 'Undo', shortcut: '⌘Z', action: undo, disabled: !canUndo },
    { label: 'Redo', shortcut: '⇧⌘Z', action: redo, disabled: !canRedo },
    { divider: true, label: '' },
    { label: 'Clear Circuit', action: clearCircuit },
    { label: 'Optimize Circuit', action: handleOptimize },
  ];

  const viewMenu: MenuItem[] = [
    { label: `${panels.operations ? '✓' : '  '} Operations Panel`, action: () => togglePanel('operations') },
    { label: `${panels.code ? '✓' : '  '} Code Panel`, action: () => togglePanel('code') },
    { label: `${panels.visualizations ? '✓' : '  '} Visualizations`, action: () => togglePanel('visualizations') },
    { label: `${panels.tutor ? '✓' : '  '} Quantum Tutor`, action: () => togglePanel('tutor') },
    { divider: true, label: '' },
    { label: `${inspectTimestep !== null ? '✓' : '  '} Inspect Mode`, action: () => setInspectTimestep(inspectTimestep !== null ? null : 0) },
    { divider: true, label: '' },
    { label: 'Reset Layout', action: () => setPanels({ operations: true, code: true, visualizations: true, tutor: false }) },
  ];

  const circuitMenu: MenuItem[] = [
    { label: 'Add Qubit', shortcut: '', action: addQubit, disabled: state.numQubits >= 20 },
    { label: 'Remove Qubit', action: removeQubit, disabled: state.numQubits <= 1 },
    { divider: true, label: '' },
    { label: 'Simulate', shortcut: '⌘↵', action: handleSimulate },
  ];

  const helpMenu: MenuItem[] = [
    { label: 'Keyboard Shortcuts', action: () => showNotification('Shortcuts', '1-9: gates · ⌘↵: simulate · ⌘Z: undo · Esc: deselect', 'info') },
    { label: 'About Qcuit Studio', action: () => showNotification('Qcuit Studio', 'A quantum circuit composer with heritage aesthetics.', 'info') },
  ];

  return (
    <div className="h-screen w-screen bg-deep-jungle flex flex-col overflow-hidden">
      {/* ── Notification Toast ── */}
      {notification && (
        <div className="fixed top-12 right-4 z-[200] animate-slide-in">
          <div className={`heritage-card border-l-4 ${
            notification.type === 'success' ? 'border-vegas-gold' :
            notification.type === 'error' ? 'border-muted-brick' :
            'border-brass-light'
          } p-3 min-w-[280px] max-w-sm rounded-r-lg`}>
            <div className="font-body text-xs font-semibold text-isabelline mb-0.5">{notification.title}</div>
            <div className="font-body text-[11px] text-isabelline/60">{notification.message}</div>
          </div>
        </div>
      )}

      {/* ═══════ TOP MENU BAR ═══════ */}
      <div className="h-10 min-h-[40px] bg-forest-light/60 border-b border-vegas-gold/15 flex items-center justify-between px-2 z-30">
        {/* Left: logo + menus */}
        <div className="flex items-center gap-1">
          <a href="/" className="flex items-center gap-2 px-2 py-1 mr-2 rounded hover:bg-vegas-gold/10 transition-colors">
            <span className="font-display text-sm font-bold text-vegas-gold">Q</span>
            <span className="font-body text-xs text-isabelline/60">Studio</span>
          </a>
          <MenuDropdown label="File" items={fileMenu} isOpen={openMenu === 'file'} onToggle={() => setOpenMenu(openMenu === 'file' ? null : 'file')} />
          <MenuDropdown label="Edit" items={editMenu} isOpen={openMenu === 'edit'} onToggle={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')} />
          <MenuDropdown label="View" items={viewMenu} isOpen={openMenu === 'view'} onToggle={() => setOpenMenu(openMenu === 'view' ? null : 'view')} />
          <MenuDropdown label="Circuit" items={circuitMenu} isOpen={openMenu === 'circuit'} onToggle={() => setOpenMenu(openMenu === 'circuit' ? null : 'circuit')} />
          <MenuDropdown label="Help" items={helpMenu} isOpen={openMenu === 'help'} onToggle={() => setOpenMenu(openMenu === 'help' ? null : 'help')} />
        </div>

        {/* Center: circuit controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-body text-[10px] text-isabelline/40 uppercase tracking-wider">Qubits</span>
            <button onClick={removeQubit} disabled={state.numQubits <= 1}
              className="w-5 h-5 rounded border border-vegas-gold/25 bg-deep-jungle/40 text-vegas-gold hover:bg-vegas-gold/10 disabled:opacity-25 transition-all flex items-center justify-center text-[11px]">−</button>
            <span className="font-mono text-xs text-isabelline font-semibold w-4 text-center">{state.numQubits}</span>
            <button onClick={addQubit} disabled={state.numQubits >= 20}
              className="w-5 h-5 rounded border border-vegas-gold/25 bg-deep-jungle/40 text-vegas-gold hover:bg-vegas-gold/10 disabled:opacity-25 transition-all flex items-center justify-center text-[11px]">+</button>
          </div>

          <div className="w-px h-4 bg-vegas-gold/15" />

          <button onClick={handleSimulate} disabled={isSimulating}
            className="px-4 py-1 rounded bg-vegas-gold text-deep-jungle hover:bg-brass-light disabled:opacity-50 transition-all font-body text-xs font-semibold">
            {isSimulating ? 'Running…' : 'Simulate'}
          </button>
        </div>

        {/* Right: tutor toggle + share + info */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => togglePanel('tutor')}
            className={`px-2.5 py-1 rounded font-body text-xs transition-all ${
              panels.tutor
                ? 'bg-vegas-gold/20 text-vegas-gold border border-vegas-gold/40'
                : 'text-isabelline/50 hover:text-vegas-gold hover:bg-vegas-gold/10 border border-transparent'
            }`}
          >
            ✦ Tutor
          </button>
          <button onClick={getShareableLink}
            className="px-2 py-1 rounded text-isabelline/50 hover:text-isabelline hover:bg-vegas-gold/10 transition-colors font-body text-xs">
            Share
          </button>
          <InfoButton text="Qcuit Studio — Build, simulate, and analyze quantum circuits. Use the menu bar for file operations, circuit management, and panel toggles." />
        </div>
      </div>

      {/* ═══════ MAIN 3-COLUMN LAYOUT ═══════ */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal">
          {/* LEFT: Operations Catalog */}
          {panels.operations && (
            <>
              <Panel defaultSize={14} minSize={10} maxSize={22}>
                <OperationsCatalog selectedGate={selectedGate} onGateSelect={setSelectedGate} />
              </Panel>
              <PanelResizeHandle className="w-px bg-vegas-gold/15 hover:bg-vegas-gold/30 transition-colors" />
            </>
          )}

          {/* CENTER: Canvas + Bottom Viz */}
          <Panel defaultSize={panels.code ? 58 : 86} minSize={40}>
            <PanelGroup direction="vertical">
              {/* Circuit Canvas */}
              <Panel defaultSize={panels.visualizations ? 60 : 100} minSize={30}>
                <div className="h-full relative overflow-hidden bg-forest-light/20">
                  {/* Selected gate indicator */}
                  {selectedGate && (
                    <div className="absolute top-2 left-2 z-10 heritage-card rounded px-2.5 py-1.5 flex items-center gap-2">
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: GATE_META[selectedGate]?.color || '#444' }}>
                        {GATE_META[selectedGate]?.symbol || selectedGate}
                      </div>
                      <span className="font-body text-[11px] text-isabelline/70">
                        {GATE_META[selectedGate]?.label || selectedGate} — click slot to place
                      </span>
                      <button onClick={() => setSelectedGate(null)}
                        className="text-isabelline/40 hover:text-isabelline text-xs ml-1 transition-colors">✕</button>
                    </div>
                  )}
                  {/* Inspect mode step controls */}
                  {inspectTimestep !== null && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-lg border border-vegas-gold/30 shadow-lg"
                      style={{ backgroundColor: 'rgba(10,31,28,0.92)', backdropFilter: 'blur(8px)' }}>
                      <span className="font-mono text-[10px] text-vegas-gold/60 mr-1">INSPECT</span>
                      <button onClick={() => setInspectTimestep(Math.max(0, inspectTimestep - 1))}
                        disabled={inspectTimestep <= 0}
                        className="w-6 h-6 rounded flex items-center justify-center text-isabelline/50 hover:text-vegas-gold hover:bg-vegas-gold/10 disabled:opacity-30 transition-colors text-xs">◀</button>
                      <span className="font-mono text-xs text-vegas-gold px-1.5">t{inspectTimestep}</span>
                      <button onClick={() => setInspectTimestep(Math.min(state.numTimesteps - 1, inspectTimestep + 1))}
                        disabled={inspectTimestep >= state.numTimesteps - 1}
                        className="w-6 h-6 rounded flex items-center justify-center text-isabelline/50 hover:text-vegas-gold hover:bg-vegas-gold/10 disabled:opacity-30 transition-colors text-xs">▶</button>
                      <button onClick={() => setInspectTimestep(null)} title="Exit inspect"
                        className="w-6 h-6 rounded flex items-center justify-center text-isabelline/30 hover:text-isabelline/60 transition-colors text-[10px] ml-0.5">✕</button>
                    </div>
                  )}
                  <CircuitCanvas selectedGate={selectedGate} onGateSelect={setSelectedGate}
                    inspectTimestep={inspectTimestep} onInspectTimestep={setInspectTimestep} />
                </div>
              </Panel>

              {/* Bottom: Visualization Dock */}
              {panels.visualizations && (
                <>
                  <PanelResizeHandle className="h-px bg-vegas-gold/15 hover:bg-vegas-gold/30 transition-colors" />
                  <Panel defaultSize={40} minSize={20}>
                    <div className="h-full flex flex-col bg-deep-jungle">
                      {/* Viz tab bar */}
                      <div className="flex items-center border-b border-vegas-gold/15 bg-forest-light/20">
                        {VIZ_TABS.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveVizTab(tab.id)}
                            className={`group flex items-center gap-1.5 px-3 py-2 font-body text-[11px] transition-all border-b-2 ${
                              activeVizTab === tab.id
                                ? 'border-vegas-gold text-vegas-gold'
                                : 'border-transparent text-isabelline/40 hover:text-isabelline/70'
                            }`}
                          >
                            <span className="text-xs">{tab.icon}</span>
                            <span>{tab.label}</span>
                          </button>
                        ))}
                        <div className="ml-auto pr-2">
                          <InfoButton text={VIZ_TABS.find(t => t.id === activeVizTab)?.info || ''} />
                        </div>
                      </div>
                      {/* Viz content */}
                      <div className="flex-1 overflow-hidden">
                        {activeVizTab === 'probabilities' && <OutputDisplay results={results} view="histogram" />}
                        {activeVizTab === 'qsphere' && <QSphere numQubits={state.numQubits} gates={state.gates} multiQubitGates={state.multiQubitGates} />}
                        {activeVizTab === 'bloch' && <BlochSphere numQubits={state.numQubits} gates={state.gates} multiQubitGates={state.multiQubitGates} />}
                        {activeVizTab === 'entanglement' && <EntanglementGraph numQubits={state.numQubits} gates={state.gates} multiQubitGates={state.multiQubitGates} />}
                        {activeVizTab === 'resources' && <ResourcePanel numQubits={state.numQubits} gates={state.gates} multiQubitGates={state.multiQubitGates} />}
                        {activeVizTab === 'debug' && <DebugTimeline numQubits={state.numQubits} gates={state.gates} multiQubitGates={state.multiQubitGates} maxTimestep={state.numTimesteps} />}
                      </div>
                    </div>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* RIGHT: Code Panel */}
          {panels.code && (
            <>
              <PanelResizeHandle className="w-px bg-vegas-gold/15 hover:bg-vegas-gold/30 transition-colors" />
              <Panel defaultSize={panels.tutor ? 18 : 28} minSize={14} maxSize={40}>
                <div className="h-full flex flex-col bg-deep-jungle">
                  {/* Code tab bar */}
                  <div className="flex items-center border-b border-vegas-gold/15 bg-forest-light/20">
                    {CODE_TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveCodeTab(tab.id)}
                        className={`px-3 py-2 font-body text-[11px] transition-all border-b-2 ${
                          activeCodeTab === tab.id
                            ? 'border-vegas-gold text-vegas-gold'
                            : 'border-transparent text-isabelline/40 hover:text-isabelline/70'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                    <div className="ml-auto pr-2">
                      <InfoButton text={CODE_TABS.find(t => t.id === activeCodeTab)?.info || ''} />
                    </div>
                  </div>
                  {/* Code content */}
                  <div className="flex-1 overflow-auto p-3">
                    {activeCodeTab === 'problems' ? (
                      <div className="font-body text-xs text-isabelline/60">
                        {results ? 'No problems detected.' : 'Run a simulation to check for issues.'}
                      </div>
                    ) : (
                      <pre className="font-mono text-xs text-isabelline/80 whitespace-pre-wrap leading-relaxed">
                        {activeCodeTab === 'qiskit' && (results?.code.qiskit || '# Click "Simulate" to generate Qiskit code.')}
                        {activeCodeTab === 'braket' && (results?.code.braket || '# Click "Simulate" to generate Braket code.')}
                        {activeCodeTab === 'openqasm' && (results?.code.openqasm || '// Click "Simulate" to generate OpenQASM code.')}
                      </pre>
                    )}
                  </div>
                </div>
              </Panel>
            </>
          )}

          {/* RIGHT-MOST: Quantum Tutor Panel */}
          {panels.tutor && (
            <>
              <PanelResizeHandle className="w-px bg-vegas-gold/15 hover:bg-vegas-gold/30 transition-colors" />
              <Panel defaultSize={22} minSize={16} maxSize={35}>
                <TutorChat />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   App wrapper
   ═══════════════════════════════════════════════════════ */
export default function App() {
  return (
    <CircuitProvider>
      <CircuitEditor />
    </CircuitProvider>
  );
}
