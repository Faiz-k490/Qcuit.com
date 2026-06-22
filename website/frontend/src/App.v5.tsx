/**
 * Qcuit Visualize — circuit inspection companion for the pip library
 *
 * 4-zone layout:
 *   Top    — Menu bar (File, Edit, View, Circuit, Help)
 *   Left   — Operations catalog with ⓘ info per gate
 *   Center — Circuit canvas + bottom visualization dock
 *   Right  — Code / Inspector / Problems
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconAtom,
  IconBrain,
  IconChartBar,
  IconCode,
  IconCpu,
  IconDeviceFloppy,
  IconFileCode,
  IconFlask2,
  IconInfoCircle,
  IconMinus,
  IconNetwork,
  IconPlayerPlay,
  IconPlus,
  IconRoute,
  IconSearch,
  IconShare3,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { SmartPopover, HoverPopover } from './components/SmartPopover';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { CircuitProvider, useCircuit } from './store/CircuitContext';
import { useMediaQuery } from './hooks/useMediaQuery';
import { CircuitCanvas } from './components/CircuitCanvas';
import { OutputDisplay } from './components/OutputDisplay';
import { QSphere } from './components/QSphere';
import { ResourcePanel } from './components/ResourcePanel';
import { EntanglementGraph } from './components/EntanglementGraph';
import { DebugTimeline } from './components/DebugTimeline';
import { BlochSphere } from './components/BlochSphere';
import { CircuitExplainer } from './components/CircuitExplainer';
import { SiteNav } from './components/SiteNav';
import { useMode, MODE_META, AppMode } from './hooks/useMode';

type IconType = React.ComponentType<{ size?: number; stroke?: number; className?: string }>;

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
  M:    { symbol: 'M',  label: 'Measure',        category: 'classical', color: '#37474f', borderColor: '#78909c', info: 'Measures a qubit in the computational basis, collapsing it to |0⟩ or |1⟩.' },
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
          className="flex h-5 w-5 items-center justify-center rounded border border-vegas-gold/25 bg-deep-jungle/40 text-vegas-gold/60 transition-all hover:border-vegas-gold/60 hover:text-vegas-gold"
          title="More info"
        >
          <IconInfoCircle size={13} stroke={1.8} />
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
   ModeSwitch — Explore / Build / Lab tab strip
   ═══════════════════════════════════════════════════════ */
function ModeSwitch() {
  const [mode, setMode] = useMode();
  const modes: AppMode[] = ['explore', 'build', 'lab'];

  const handleClick = (m: AppMode) => {
    setMode(m);
    const href = MODE_META[m].href;
    if (window.location.pathname !== href) {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="hidden shrink-0 items-center gap-0.5 px-1 py-0.5 rounded border border-vegas-gold/15 bg-deep-jungle/40 ml-1 md:flex">
      {modes.map((m) => {
        const active = m === mode;
        return (
          <button
            key={m}
            onClick={() => handleClick(m)}
            title={MODE_META[m].description}
            className={`px-2 py-0.5 rounded font-body text-[10px] uppercase tracking-wider transition-all ${
              active
                ? 'bg-vegas-gold/20 text-vegas-gold'
                : 'text-isabelline/45 hover:text-isabelline/80'
            }`}
          >
            {MODE_META[m].label}
          </button>
        );
      })}
    </div>
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
    <div className="flex h-full flex-col border-r border-vegas-gold/10 bg-[#081a18]">
      {/* Header */}
      <div className="border-b border-vegas-gold/10 px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-vegas-gold/55">Gate Library</span>
            <h2 className="font-display text-xl leading-tight text-isabelline">Operations</h2>
          </div>
          <InfoButton text="Drag-and-drop quantum gates onto the circuit canvas. Click a gate to select it, then click a slot on the canvas to place it." />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={canUndo ? undo : undefined}
            className={`flex h-8 flex-1 items-center justify-center gap-1 border font-body text-xs transition-all ${
              canUndo ? 'border-vegas-gold/20 text-isabelline/65 hover:border-vegas-gold/45 hover:text-vegas-gold' : 'border-isabelline/10 text-isabelline/20'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <IconArrowBackUp size={15} stroke={1.8} />
            Undo
          </button>
          <button
            onClick={canRedo ? redo : undefined}
            className={`flex h-8 flex-1 items-center justify-center gap-1 border font-body text-xs transition-all ${
              canRedo ? 'border-vegas-gold/20 text-isabelline/65 hover:border-vegas-gold/45 hover:text-vegas-gold' : 'border-isabelline/10 text-isabelline/20'
            }`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <IconArrowForwardUp size={15} stroke={1.8} />
            Redo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <label className="flex items-center gap-2 border border-vegas-gold/15 bg-deep-jungle/55 px-3 py-2">
          <IconSearch size={15} stroke={1.8} className="text-isabelline/35" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gates..."
            className="min-w-0 flex-1 bg-transparent font-body text-xs text-isabelline/85 outline-none placeholder:text-isabelline/30"
          />
        </label>
      </div>

      {/* Gate categories */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredCategories.map(cat => (
          <div key={cat.id} className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-vegas-gold/55">{cat.label}</span>
                <span className="border border-isabelline/10 px-1.5 py-0.5 font-mono text-[9px] text-isabelline/35">{cat.gates.length}</span>
              </div>
              <InfoButton text={
                cat.id === 'pauli' ? 'Fundamental single-qubit gates. H creates superposition; X, Y, Z are Pauli operators.' :
                cat.id === 'phase' ? 'Phase gates add relative phase to |1⟩ without changing probabilities.' :
                cat.id === 'parametric' ? 'Rotation gates with a continuous angle parameter θ.' :
                cat.id === 'multi' ? 'Multi-qubit gates that create entanglement and correlations between qubits.' :
                'Measurement collapses a qubit to a classical bit.'
              } />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {cat.gates.map(g => {
                const meta = GATE_META[g];
                const isSelected = selectedGate === g;
                return (
                  <HoverPopover
                    key={g}
                    trigger={
                      <button
                        onClick={() => onGateSelect(g)}
                        className={`group relative flex aspect-square min-h-[42px] items-center justify-center border transition-all duration-150 ${
                          isSelected ? 'scale-[1.03] border-isabelline shadow-lg shadow-vegas-gold/20' : 'border-white/10 hover:scale-[1.03] hover:border-isabelline/50'
                        }`}
                        style={{
                          backgroundColor: meta.color,
                          boxShadow: isSelected ? '0 0 0 2px rgba(197,160,89,0.35)' : 'none',
                          fontSize: g.length > 3 ? 9 : g.length > 2 ? 10 : 13,
                          fontWeight: 700,
                          color: '#fff',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {meta.symbol}
                        <span className="absolute bottom-0 left-0 right-0 h-px opacity-60" style={{ backgroundColor: meta.borderColor }} />
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
      <div className="border-t border-vegas-gold/10 px-4 py-4">
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
      <div className="border-t border-vegas-gold/10 px-4 py-4">
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
          className="mt-3 flex w-full items-center justify-center gap-2 border border-muted-brick/30 py-2 font-body text-xs text-muted-brick/70 transition-colors hover:bg-muted-brick/10 hover:text-muted-brick"
        >
          <IconTrash size={15} stroke={1.8} />
          Clear Circuit
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Visualization Dock tabs (bottom)
   ═══════════════════════════════════════════════════════ */
const VIZ_TABS: { id: string; label: string; icon: IconType; info: string }[] = [
  { id: 'probabilities', label: 'Probabilities', icon: IconChartBar, info: 'Bar chart showing the likelihood of each computational basis state after simulation.' },
  { id: 'qsphere', label: 'Q-cuit Sphere', icon: IconAtom, info: 'Global 3D visualization of a multi-qubit state. Node size = probability, color = phase.' },
  { id: 'bloch', label: 'Bloch Sphere', icon: IconActivity, info: 'Single-qubit state visualization on the unit sphere. Shows the geometric meaning of quantum operations.' },
  { id: 'entanglement', label: 'Entanglement', icon: IconNetwork, info: 'Graph showing Von Neumann entropy between qubit pairs. Thicker edges = stronger entanglement.' },
  { id: 'resources', label: 'Resources', icon: IconCpu, info: 'Estimates gate counts, fidelity, and runtime for real quantum hardware backends.' },
  { id: 'debug', label: 'Debug', icon: IconRoute, info: 'Step through the circuit timestep-by-timestep, watching the state evolve.' },
];

/* ═══════════════════════════════════════════════════════
   Code panel tabs (right sidebar)
   ═══════════════════════════════════════════════════════ */
const CODE_TABS: { id: string; label: string; icon: IconType; info: string }[] = [
  { id: 'qiskit', label: 'Qiskit', icon: IconCode, info: 'Python code using IBM\'s Qiskit framework.' },
  { id: 'braket', label: 'Braket', icon: IconFlask2, info: 'Python code using Amazon Braket SDK.' },
  { id: 'openqasm', label: 'OpenQASM', icon: IconFileCode, info: 'Open Quantum Assembly Language — the standard circuit interchange format.' },
  { id: 'problems', label: 'Problems', icon: IconAlertTriangle, info: 'Circuit validation warnings and errors.' },
];

/* ═══════════════════════════════════════════════════════
   Main CircuitEditor
   ═══════════════════════════════════════════════════════ */
export function CircuitEditor() {
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

  // Below `lg`, the horizontal IDE columns can't fit side by side, so stack
  // them as resizable rows instead of squashing 3-5 panels into a phone width.
  const isNarrow = useMediaQuery('(max-width: 1023px)');
  const groupDirection = isNarrow ? 'vertical' : 'horizontal';
  const outerHandleClass = isNarrow
    ? 'h-px w-full bg-vegas-gold/15 hover:bg-vegas-gold/30 transition-colors'
    : 'w-px bg-vegas-gold/15 hover:bg-vegas-gold/30 transition-colors';

  // Panel visibility
  const [panels, setPanels] = useState({
    operations: true,
    code: true,
    visualizations: true,
    explainer: false,
  });
  const pendingAutoRunRef = useRef(false);

  const togglePanel = (panel: keyof typeof panels) =>
    setPanels(prev => ({ ...prev, [panel]: !prev[panel] }));

  const showNotification = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Presets
  const loadPreset = useCallback((preset: string) => {
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
    const presetKey = preset.toLowerCase();
    if (presets[presetKey]) {
      loadCircuit(presets[presetKey]);
      setActiveVizTab('probabilities');
      showNotification('Preset Loaded', `Loaded ${presetKey.toUpperCase()} circuit.`, 'success');
      return true;
    }
    return false;
  }, [loadCircuit, showNotification]);

  // Load circuit or readable preset from URL on mount.
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('circuit');
      const preset = urlParams.get('preset');
      const shouldRun = urlParams.get('run') === '1';
      let loaded = false;

      if (sharedState) {
        const loadedState = JSON.parse(atob(sharedState));
        if (loadedState.numQubits && loadedState.gates) {
          loadCircuit(loadedState);
          showNotification('Circuit Loaded', 'Successfully loaded shared circuit.', 'success');
          loaded = true;
        }
      } else if (preset) {
        loaded = loadPreset(preset);
      }

      if (loaded && shouldRun) {
        pendingAutoRunRef.current = true;
      }
    } catch (error) {
      console.error('Failed to load shared circuit:', error);
    }
  }, [loadCircuit, loadPreset, showNotification]);

  useEffect(() => {
    if (!pendingAutoRunRef.current) return;
    const runId = window.setTimeout(() => {
      if (!pendingAutoRunRef.current) return;
      pendingAutoRunRef.current = false;
      runCircuit()
        .then(() => showNotification('Simulation Complete', 'Preloaded example ran successfully.', 'success'))
        .catch((error: any) => showNotification('Simulation Failed', error.message || 'Check the backend connection.', 'error'));
    }, 100);
    return () => window.clearTimeout(runId);
  }, [state, runCircuit, showNotification]);

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

  // Save as Notebook (Phase 3 — Reproducibility Index)
  const [isSavingNotebook, setIsSavingNotebook] = useState(false);
  const handleSaveNotebook = async () => {
    if (isSavingNotebook) return;
    setIsSavingNotebook(true);
    try {
      const body = {
        circuit: state,
        noise_config: { depolarizing: state.noiseLevel, T1: 0, T2: 0 },
        shots: 1024,
        seed: 0,
      };
      const resp = await fetch('/api/notebook/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const permalink = `${window.location.origin}/n/${data.run_hash}`;

      // Push to Recent list so it shows up in the Lab → Notebook tab.
      try {
        const RECENT_KEY = 'qcuit:notebook:recent';
        const raw = window.localStorage.getItem(RECENT_KEY);
        const existing = raw ? (JSON.parse(raw) as any[]).filter((e) => e.run_hash !== data.run_hash) : [];
        const next = [
          {
            run_hash: data.run_hash,
            url: permalink,
            savedAt: new Date().toISOString(),
            label: `${state.numQubits}-qubit circuit`,
          },
          ...existing,
        ].slice(0, 25);
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('qcuit:notebook:recent-changed'));
      } catch {
        /* ignore quota errors */
      }

      navigator.clipboard
        .writeText(permalink)
        .then(() => showNotification('Notebook Saved', `Permalink copied · ${data.run_hash.slice(0, 12)}…`, 'success'))
        .catch(() => showNotification('Notebook Saved', `SHA-256: ${data.run_hash.slice(0, 12)}…`, 'success'));
    } catch (error: any) {
      showNotification('Save Failed', error.message || 'Could not save notebook.', 'error');
    } finally {
      setIsSavingNotebook(false);
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
    { label: `${panels.explainer ? '✓' : '  '} Circuit Explainer`, action: () => togglePanel('explainer') },
    { divider: true, label: '' },
    { label: `${inspectTimestep !== null ? '✓' : '  '} Inspect Mode`, action: () => setInspectTimestep(inspectTimestep !== null ? null : 0) },
    { divider: true, label: '' },
    { label: 'Reset Layout', action: () => setPanels({ operations: true, code: true, visualizations: true, explainer: false }) },
  ];

  const circuitMenu: MenuItem[] = [
    { label: 'Add Qubit', shortcut: '', action: addQubit, disabled: state.numQubits >= 20 },
    { label: 'Remove Qubit', action: removeQubit, disabled: state.numQubits <= 1 },
    { divider: true, label: '' },
    { label: 'Simulate', shortcut: '⌘↵', action: handleSimulate },
  ];

  const helpMenu: MenuItem[] = [
    { label: 'Keyboard Shortcuts', action: () => showNotification('Shortcuts', '1-9: gates · ⌘↵: simulate · ⌘Z: undo · Esc: deselect', 'info') },
    { label: 'About Qcuit Visualize', action: () => showNotification('Qcuit Visualize', 'Optional circuit inspection for the Qcuit Python library.', 'info') },
  ];

  const gateCount = Object.keys(state.gates).length + state.multiQubitGates.length + state.measurements.length;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#061412]">
      <SiteNav active="visualizer" />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#061412]">
      {/* ── Notification Toast ── */}
      {notification && (
        <div className="fixed top-24 right-4 z-[200] animate-slide-in">
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
      <div className="z-30 border-b border-vegas-gold/15 bg-[#0a1f1c]/95 px-3 py-2 shadow-2xl shadow-black/20">
        <div className="flex min-h-[54px] items-center justify-between gap-4">
          {/* Left: logo + menus */}
          <div className="flex min-w-0 items-center gap-3">
            <a href="/" className="flex shrink-0 items-center gap-3 border border-vegas-gold/15 bg-forest-light/35 px-3 py-2 transition-colors hover:border-vegas-gold/40">
              <span className="flex h-8 w-8 items-center justify-center border border-vegas-gold/45 font-display text-lg font-bold text-vegas-gold">Q</span>
              <span className="hidden whitespace-nowrap lg:block">
                <span className="block font-body text-sm font-semibold leading-4 text-isabelline">Qcuit Visualize</span>
                <span className="block font-mono text-[10px] text-isabelline/40">Optional package companion</span>
              </span>
            </a>
            <ModeSwitch />
            <div className="hidden h-8 w-px bg-vegas-gold/15 lg:block" />
            <div className="hidden items-center gap-1 lg:flex">
              <MenuDropdown label="File" items={fileMenu} isOpen={openMenu === 'file'} onToggle={() => setOpenMenu(openMenu === 'file' ? null : 'file')} />
              <MenuDropdown label="Edit" items={editMenu} isOpen={openMenu === 'edit'} onToggle={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')} />
              <MenuDropdown label="View" items={viewMenu} isOpen={openMenu === 'view'} onToggle={() => setOpenMenu(openMenu === 'view' ? null : 'view')} />
              <MenuDropdown label="Circuit" items={circuitMenu} isOpen={openMenu === 'circuit'} onToggle={() => setOpenMenu(openMenu === 'circuit' ? null : 'circuit')} />
              <MenuDropdown label="Help" items={helpMenu} isOpen={openMenu === 'help'} onToggle={() => setOpenMenu(openMenu === 'help' ? null : 'help')} />
            </div>
          </div>

          {/* Center: circuit status */}
          <div className="hidden min-w-0 items-center gap-2 2xl:flex">
            {[
              ['Qubits', state.numQubits],
              ['Gates', gateCount],
              ['Steps', state.numTimesteps],
              ['Noise', `${(state.noiseLevel * 100).toFixed(0)}%`],
            ].map(([label, value]) => (
              <div key={label} className="min-w-[72px] border border-isabelline/10 bg-deep-jungle/50 px-3 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-isabelline/35">{label}</div>
                <div className="mt-0.5 font-mono text-sm text-isabelline">{value}</div>
              </div>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center border border-vegas-gold/15 bg-deep-jungle/45 md:flex">
              <button onClick={removeQubit} disabled={state.numQubits <= 1}
                className="flex h-9 w-9 items-center justify-center text-vegas-gold transition-all hover:bg-vegas-gold/10 disabled:opacity-25"
                title="Remove qubit">
                <IconMinus size={16} stroke={1.9} />
              </button>
              <span className="border-x border-vegas-gold/10 px-3 font-mono text-xs text-isabelline">{state.numQubits}q</span>
              <button onClick={addQubit} disabled={state.numQubits >= 20}
                className="flex h-9 w-9 items-center justify-center text-vegas-gold transition-all hover:bg-vegas-gold/10 disabled:opacity-25"
                title="Add qubit">
                <IconPlus size={16} stroke={1.9} />
              </button>
            </div>
            <button onClick={handleSimulate} disabled={isSimulating}
              className="inline-flex h-10 items-center gap-2 bg-vegas-gold px-4 font-body text-sm font-semibold text-deep-jungle transition-all hover:bg-brass-light disabled:opacity-50">
              <IconPlayerPlay size={17} stroke={2} />
              {isSimulating ? 'Running' : 'Simulate'}
            </button>
            <button
              onClick={() => togglePanel('explainer')}
              className={`hidden h-10 items-center gap-2 border px-3 font-body text-xs transition-all md:inline-flex ${
                panels.explainer
                  ? 'border-vegas-gold/50 bg-vegas-gold/15 text-vegas-gold'
                  : 'border-isabelline/10 text-isabelline/55 hover:border-vegas-gold/35 hover:text-vegas-gold'
              }`}
              title="Toggle deterministic Circuit Explainer"
            >
              <IconBrain size={16} stroke={1.8} />
              Explain
            </button>
            <button onClick={handleSaveNotebook} disabled={isSavingNotebook}
              title="Save this circuit as a citable, hashed Qcuit Notebook"
              className="hidden h-10 items-center gap-2 border border-isabelline/10 px-3 font-body text-xs text-isabelline/55 transition-colors hover:border-vegas-gold/35 hover:text-vegas-gold disabled:opacity-40 md:inline-flex">
              <IconDeviceFloppy size={16} stroke={1.8} />
              {isSavingNotebook ? 'Saving' : 'Notebook'}
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.setItem('qcuit:trainer:pending_circuit', JSON.stringify(state));
                } catch { /* localStorage may be full or blocked */ }
                window.history.pushState({}, '', '/lab?tab=trainer');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              title="Open the QML trainer with this circuit"
              className="hidden h-10 items-center gap-2 border border-isabelline/10 px-3 font-body text-xs text-isabelline/55 transition-colors hover:border-vegas-gold/35 hover:text-vegas-gold 2xl:inline-flex">
              <IconFlask2 size={16} stroke={1.8} />
              Train
            </button>
            <button onClick={getShareableLink}
              className="flex h-10 w-10 items-center justify-center border border-isabelline/10 text-isabelline/55 transition-colors hover:border-vegas-gold/35 hover:text-vegas-gold"
              title="Share circuit">
              <IconShare3 size={17} stroke={1.8} />
            </button>
            <InfoButton text="Qcuit Visualize — Inspect circuits before moving them into the Python library. Use the menu bar for file operations, circuit management, and panel toggles." />
          </div>
        </div>
      </div>

      {/* ═══════ MAIN 3-COLUMN LAYOUT ═══════ */}
      <div className="flex-1 min-h-0">
        <PanelGroup direction={groupDirection}>
          {/* LEFT: Operations Catalog */}
          {panels.operations && (
            <>
              <Panel defaultSize={14} minSize={10} maxSize={isNarrow ? 40 : 22}>
                <OperationsCatalog selectedGate={selectedGate} onGateSelect={setSelectedGate} />
              </Panel>
              <PanelResizeHandle className={outerHandleClass} />
            </>
          )}

          {/* CENTER: Canvas + Bottom Viz */}
          <Panel defaultSize={panels.code ? 58 : 86} minSize={40}>
            <PanelGroup direction="vertical">
              {/* Circuit Canvas */}
              <Panel defaultSize={panels.visualizations ? 60 : 100} minSize={30}>
                <div className="flex h-full min-w-0 flex-col overflow-hidden bg-[#071715]">
                  <div className="flex min-h-[58px] items-center justify-between gap-3 border-b border-vegas-gold/10 bg-[#0d2420] px-4">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-vegas-gold/55">Circuit Canvas</div>
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        {selectedGate ? (
                          <>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/20 text-[11px] font-bold text-white"
                              style={{ backgroundColor: GATE_META[selectedGate]?.color || '#444' }}>
                              {GATE_META[selectedGate]?.symbol || selectedGate}
                            </div>
                            <span className="truncate font-body text-sm text-isabelline/75">
                              {GATE_META[selectedGate]?.label || selectedGate} selected. Click a slot to place it.
                            </span>
                            <button onClick={() => setSelectedGate(null)}
                              className="flex h-6 w-6 shrink-0 items-center justify-center text-isabelline/35 transition-colors hover:text-isabelline"
                              title="Clear selected gate">
                              <IconX size={15} stroke={1.9} />
                            </button>
                          </>
                        ) : (
                          <span className="font-body text-sm text-isabelline/55">Select a gate, load a preset, or inspect a shared circuit.</span>
                        )}
                      </div>
                    </div>

                    <div className="hidden items-center gap-2 xl:flex">
                      {PRESETS.slice(0, 4).map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => loadPreset(preset.id)}
                          className="border border-isabelline/10 px-3 py-1.5 font-body text-xs text-isabelline/55 transition-colors hover:border-vegas-gold/35 hover:text-vegas-gold"
                          title={`Load ${preset.label}`}
                        >
                          {preset.label.replace(' State', '').replace(' (2q)', '').replace(' (3q)', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative min-h-0 flex-1 overflow-hidden bg-forest-light/20">
                    {/* Inspect mode step controls */}
                    {inspectTimestep !== null && (
                      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 border border-vegas-gold/30 px-2 py-1 shadow-lg"
                        style={{ backgroundColor: 'rgba(10,31,28,0.92)', backdropFilter: 'blur(8px)' }}>
                        <span className="mr-1 font-mono text-[10px] text-vegas-gold/60">INSPECT</span>
                        <button onClick={() => setInspectTimestep(Math.max(0, inspectTimestep - 1))}
                          disabled={inspectTimestep <= 0}
                          className="flex h-7 w-7 items-center justify-center text-isabelline/50 transition-colors hover:bg-vegas-gold/10 hover:text-vegas-gold disabled:opacity-30">‹</button>
                        <span className="px-1.5 font-mono text-xs text-vegas-gold">t{inspectTimestep}</span>
                        <button onClick={() => setInspectTimestep(Math.min(state.numTimesteps - 1, inspectTimestep + 1))}
                          disabled={inspectTimestep >= state.numTimesteps - 1}
                          className="flex h-7 w-7 items-center justify-center text-isabelline/50 transition-colors hover:bg-vegas-gold/10 hover:text-vegas-gold disabled:opacity-30">›</button>
                        <button onClick={() => setInspectTimestep(null)} title="Exit inspect"
                          className="ml-0.5 flex h-7 w-7 items-center justify-center text-isabelline/30 transition-colors hover:text-isabelline/60">
                          <IconX size={14} stroke={1.8} />
                        </button>
                      </div>
                    )}
                    <CircuitCanvas selectedGate={selectedGate} onGateSelect={setSelectedGate}
                      inspectTimestep={inspectTimestep} onInspectTimestep={setInspectTimestep} />
                  </div>
                </div>
              </Panel>

              {/* Bottom: Visualization Dock */}
              {panels.visualizations && (
                <>
                  <PanelResizeHandle className="h-px bg-vegas-gold/15 hover:bg-vegas-gold/30 transition-colors" />
                  <Panel defaultSize={40} minSize={20}>
                    <div className="flex h-full flex-col bg-[#081816]">
                      {/* Viz tab bar */}
                      <div className="flex min-h-[42px] items-center border-b border-vegas-gold/15 bg-[#0d2420]">
                        {VIZ_TABS.map(tab => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveVizTab(tab.id)}
                              className={`group flex h-[42px] items-center gap-2 border-b-2 px-3 font-body text-[11px] transition-all ${
                                activeVizTab === tab.id
                                  ? 'border-vegas-gold bg-vegas-gold/10 text-vegas-gold'
                                  : 'border-transparent text-isabelline/40 hover:bg-isabelline/5 hover:text-isabelline/75'
                              }`}
                            >
                              <Icon size={15} stroke={1.8} />
                              <span>{tab.label}</span>
                            </button>
                          );
                        })}
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
              <PanelResizeHandle className={outerHandleClass} />
              <Panel defaultSize={panels.explainer ? 18 : 28} minSize={14} maxSize={isNarrow ? 60 : 40}>
                <div className="flex h-full flex-col bg-[#071715]">
                  {/* Code tab bar */}
                  <div className="flex min-h-[42px] items-center border-b border-vegas-gold/15 bg-[#0d2420]">
                    {CODE_TABS.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveCodeTab(tab.id)}
                          className={`flex h-[42px] items-center gap-2 border-b-2 px-3 font-body text-[11px] transition-all ${
                            activeCodeTab === tab.id
                              ? 'border-vegas-gold bg-vegas-gold/10 text-vegas-gold'
                              : 'border-transparent text-isabelline/40 hover:bg-isabelline/5 hover:text-isabelline/70'
                          }`}
                        >
                          <Icon size={15} stroke={1.8} />
                          {tab.label}
                        </button>
                      );
                    })}
                    <div className="ml-auto pr-2">
                      <InfoButton text={CODE_TABS.find(t => t.id === activeCodeTab)?.info || ''} />
                    </div>
                  </div>
                  {/* Code content */}
                  <div className="flex-1 overflow-auto p-4">
                    {activeCodeTab === 'problems' ? (
                      <div className="border border-isabelline/10 bg-deep-jungle/45 p-4 font-body text-xs text-isabelline/60">
                        <div className="mb-2 flex items-center gap-2 text-vegas-gold">
                          <IconAlertTriangle size={16} stroke={1.8} />
                          <span className="font-mono text-[10px] uppercase tracking-wider">Validation</span>
                        </div>
                        {results ? 'No problems detected.' : 'Run a simulation to check for issues.'}
                      </div>
                    ) : (
                      <pre className="min-h-full border border-isabelline/10 bg-[#0b1320] p-4 font-mono text-xs leading-relaxed text-isabelline/80 whitespace-pre-wrap">
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

          {/* RIGHT-MOST: Deterministic Circuit Explainer */}
          {panels.explainer && (
            <>
              <PanelResizeHandle className={outerHandleClass} />
              <Panel defaultSize={22} minSize={16} maxSize={isNarrow ? 60 : 35}>
                <CircuitExplainer />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
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
