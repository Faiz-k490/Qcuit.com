import { useEffect, useState } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { CircuitProvider, useCircuit } from './store/CircuitContext';
import { CircuitCanvas } from './components/CircuitCanvas';
import { OutputDisplay } from './components/OutputDisplay';
import { GatePaletteV3 } from './components/GatePaletteV3';
import { QSphere } from './components/QSphere';
import { ResourcePanel } from './components/ResourcePanel';
import { EntanglementGraph } from './components/EntanglementGraph';
import { DebugTimeline } from './components/DebugTimeline';
import { BlochSphere } from './components/BlochSphere';

function CircuitEditor() {
  const {
    state,
    results,
    isSimulating,
    addQubit,
    removeQubit,
    runCircuit,
    loadCircuit,
  } = useCircuit();

  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('code');
  const [showPresets, setShowPresets] = useState(false);
  const [notification, setNotification] = useState<{title: string; message: string; type: 'success' | 'error' | 'info'} | null>(null);

  const showNotification = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Circuit presets
  const loadPreset = (preset: string) => {
    let presetCircuit: any = null;
    
    switch (preset) {
      case 'bell':
        presetCircuit = {
          numQubits: 2,
          numClassical: 2,
          numTimesteps: 10,
          gates: {
            'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-cnot-0', gateType: 'CNOT', controls: [0], targets: [1], timestep: 1 }
          ],
          measurements: [],
          noiseLevel: 0
        };
        break;
      case 'ghz3':
        presetCircuit = {
          numQubits: 3,
          numClassical: 3,
          numTimesteps: 10,
          gates: {
            'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-cnot-0', gateType: 'CNOT', controls: [0], targets: [1], timestep: 1 },
            { id: 'preset-cnot-1', gateType: 'CNOT', controls: [1], targets: [2], timestep: 2 }
          ],
          measurements: [],
          noiseLevel: 0
        };
        break;
      case 'superposition':
        presetCircuit = {
          numQubits: 3,
          numClassical: 3,
          numTimesteps: 10,
          gates: {
            'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 },
            'q_1-0': { id: 'preset-h-1', gateType: 'H', qubit: 1, timestep: 0 },
            'q_2-0': { id: 'preset-h-2', gateType: 'H', qubit: 2, timestep: 0 }
          },
          multiQubitGates: [],
          measurements: [],
          noiseLevel: 0
        };
        break;
      case 'qft2':
        presetCircuit = {
          numQubits: 2,
          numClassical: 2,
          numTimesteps: 10,
          gates: {
            'q_0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 },
            'q_1-2': { id: 'preset-h-1', gateType: 'H', qubit: 1, timestep: 2 }
          },
          multiQubitGates: [
            { id: 'preset-cz-0', gateType: 'CZ', controls: [0], targets: [1], timestep: 1 }
          ],
          measurements: [],
          noiseLevel: 0
        };
        break;
      case 'swap':
        presetCircuit = {
          numQubits: 2,
          numClassical: 2,
          numTimesteps: 10,
          gates: {
            'q_0-0': { id: 'preset-x-0', gateType: 'X', qubit: 0, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-swap-0', gateType: 'SWAP', controls: [0], targets: [1], timestep: 1 }
          ],
          measurements: [],
          noiseLevel: 0
        };
        break;
      case 'toffoli':
        presetCircuit = {
          numQubits: 3,
          numClassical: 3,
          numTimesteps: 10,
          gates: {
            'q_0-0': { id: 'preset-x-0', gateType: 'X', qubit: 0, timestep: 0 },
            'q_1-0': { id: 'preset-x-1', gateType: 'X', qubit: 1, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-ccx-0', gateType: 'CCX', controls: [0, 1], targets: [2], timestep: 1 }
          ],
          measurements: [],
          noiseLevel: 0
        };
        break;
      default:
        return;
    }
    
    if (presetCircuit) {
      loadCircuit(presetCircuit);
      showNotification('Preset Loaded', `Loaded ${preset.toUpperCase()} circuit preset.`, 'success');
      setShowPresets(false);
    }
  };

  // Load circuit from URL on mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('circuit');

      if (sharedState) {
        const stateString = atob(sharedState);
        const loadedState = JSON.parse(stateString);

        if (loadedState.numQubits && loadedState.gates) {
          loadCircuit(loadedState);
          showNotification('Circuit Loaded', 'Successfully loaded shared circuit.', 'success');
        }
      }
    } catch (error) {
      console.error('Failed to load shared circuit:', error);
      showNotification('Load Error', 'Could not load shared circuit.', 'error');
    }
  }, [loadCircuit]);

  // Share function
  const getShareableLink = () => {
    try {
      const stateString = JSON.stringify(state);
      const base64State = btoa(stateString);
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('circuit', base64State);
      window.history.pushState({}, '', url.toString());

      navigator.clipboard
        .writeText(url.toString())
        .then(() => {
          showNotification('Link Copied!', 'Your circuit is copied to the clipboard.', 'success');
        })
        .catch((err) => {
          console.warn('Clipboard write failed.', err);
          showNotification('URL Ready!', 'Link updated in your address bar.', 'info');
        });
    } catch (error) {
      console.error('Failed to create shareable link:', error);
      showNotification('Error', 'Could not create shareable link.', 'error');
    }
  };

  // Optimize handler
  const handleOptimize = async () => {
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gates: state.gates,
          multiQubitGates: state.multiQubitGates,
          level: 2,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        showNotification('Circuit Optimized', `Removed ${data.gates_removed} redundant gates (${data.original_count} → ${data.optimized_count})`, 'success');
      }
    } catch (error: any) {
      showNotification('Optimization Failed', error.message || 'Check the console for details.', 'error');
    }
  };

  // Simulate handler
  const handleSimulate = async () => {
    try {
      await runCircuit();
      showNotification('Simulation Complete', 'Results updated successfully.', 'success');
    } catch (error: any) {
      showNotification('Simulation Failed', error.message || 'Check the console for details.', 'error');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCircuit();
      }
      if (e.key === 'Escape') {
        setSelectedGate(null);
      }
      const gateMap: Record<string, string> = {
        '1': 'H', '2': 'X', '3': 'Y', '4': 'Z',
        '5': 'S', '6': 'T', '7': 'RX', '8': 'RY', '9': 'RZ'
      };
      if (gateMap[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setSelectedGate(gateMap[e.key]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runCircuit]);

  const tabs = [
    { id: 'code', label: 'Code', icon: '📊' },
    { id: 'qsphere', label: 'Q-cuit Sphere', icon: '⚛️' },
    { id: 'bloch', label: 'Bloch', icon: '🌐' },
    { id: 'entanglement', label: 'Entangle', icon: '🔗' },
    { id: 'resources', label: 'Resources', icon: '💻' },
    { id: 'debug', label: 'Debug', icon: '📈' },
  ];

  const presets = [
    { id: 'bell', label: 'Bell State (2q)', category: 'Entanglement' },
    { id: 'ghz3', label: 'GHZ State (3q)', category: 'Entanglement' },
    { id: 'superposition', label: 'Uniform (3q)', category: 'Superposition' },
    { id: 'qft2', label: 'QFT (2q)', category: 'Superposition' },
    { id: 'swap', label: 'SWAP Test (2q)', category: 'Multi-Qubit Gates' },
    { id: 'toffoli', label: 'Toffoli (3q)', category: 'Multi-Qubit Gates' },
  ];

  return (
    <div className="h-screen w-screen bg-deep-jungle overflow-hidden">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[200] animate-slide-in">
          <div className={`heritage-card border-l-4 ${
            notification.type === 'success' ? 'border-vegas-gold' :
            notification.type === 'error' ? 'border-muted-brick' :
            'border-brass-light'
          } p-4 min-w-[300px] max-w-md`}>
            <div className="font-body text-sm font-semibold text-isabelline mb-1">
              {notification.title}
            </div>
            <div className="font-body text-xs text-isabelline/60">
              {notification.message}
            </div>
          </div>
        </div>
      )}

      <PanelGroup direction="horizontal">
        {/* Panel 1: Gate Palette */}
        <Panel defaultSize={15} minSize={12} maxSize={20}>
          <GatePaletteV3 
            selectedGate={selectedGate} 
            onGateSelect={setSelectedGate} 
          />
        </Panel>
        <PanelResizeHandle className="w-px bg-vegas-gold/20 hover:bg-vegas-gold/40 transition-colors" />

        {/* Panel 2: Main Content (Canvas + Outputs) */}
        <Panel defaultSize={55} minSize={40}>
          <PanelGroup direction="vertical">
            {/* Circuit Canvas */}
            <Panel defaultSize={65} minSize={40}>
              <div className="h-full relative overflow-hidden bg-forest-light heritage-texture">
                {/* Top controls */}
                <div className="absolute top-4 right-4 z-10 heritage-card p-3">
                  <div className="flex items-center gap-4">
                    {/* Qubit controls */}
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs text-isabelline/50 uppercase tracking-wider">Qubits</span>
                      <button
                        onClick={removeQubit}
                        disabled={state.numQubits <= 1}
                        className="w-6 h-6 rounded border border-vegas-gold/30 bg-deep-jungle/50 text-vegas-gold hover:bg-vegas-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs"
                      >
                        −
                      </button>
                      <span className="font-mono text-sm text-isabelline font-semibold w-6 text-center">{state.numQubits}</span>
                      <button
                        onClick={addQubit}
                        disabled={state.numQubits >= 20}
                        className="w-6 h-6 rounded border border-vegas-gold/30 bg-deep-jungle/50 text-vegas-gold hover:bg-vegas-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-px h-5 bg-vegas-gold/20" />

                    {/* Presets dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="px-3 py-1.5 rounded border border-vegas-gold/30 bg-deep-jungle/50 text-vegas-gold hover:bg-vegas-gold/10 transition-all font-body text-xs flex items-center gap-2"
                      >
                        <span>📋</span>
                        <span>Presets</span>
                        <span className="text-[10px]">▼</span>
                      </button>
                      {showPresets && (
                        <div className="absolute top-full right-0 mt-2 w-56 heritage-card border border-vegas-gold/20 max-h-80 overflow-y-auto">
                          {['Entanglement', 'Superposition', 'Multi-Qubit Gates'].map(category => (
                            <div key={category}>
                              <div className="px-3 py-2 font-body text-[10px] uppercase tracking-wider text-vegas-gold/50 border-b border-vegas-gold/10">
                                {category}
                              </div>
                              {presets.filter(p => p.category === category).map(preset => (
                                <button
                                  key={preset.id}
                                  onClick={() => loadPreset(preset.id)}
                                  className="w-full px-3 py-2 text-left font-body text-xs text-isabelline/70 hover:bg-vegas-gold/10 hover:text-isabelline transition-colors"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleOptimize}
                      className="px-3 py-1.5 rounded border border-vegas-gold/30 bg-deep-jungle/50 text-vegas-gold hover:bg-vegas-gold/10 transition-all font-body text-xs flex items-center gap-2"
                      title="Optimize circuit (cancel redundant gates)"
                    >
                      <span>✨</span>
                      <span>Optimize</span>
                    </button>

                    <button
                      onClick={getShareableLink}
                      className="px-3 py-1.5 rounded border border-vegas-gold/30 bg-deep-jungle/50 text-isabelline/50 hover:bg-vegas-gold/10 hover:text-isabelline transition-all font-body text-xs"
                    >
                      Share
                    </button>

                    <button
                      onClick={handleSimulate}
                      disabled={isSimulating}
                      className="px-4 py-1.5 rounded bg-vegas-gold text-deep-jungle hover:bg-brass-light disabled:opacity-50 disabled:cursor-not-allowed transition-all font-body text-xs font-semibold"
                      title="Ctrl+Enter to simulate"
                    >
                      {isSimulating ? 'Simulating...' : 'Simulate'}
                    </button>
                  </div>
                </div>

                {/* Circuit Canvas */}
                <CircuitCanvas 
                  selectedGate={selectedGate}
                  onGateSelect={setSelectedGate}
                />
              </div>
            </Panel>
            <PanelResizeHandle className="h-px bg-vegas-gold/20 hover:bg-vegas-gold/40 transition-colors" />

            {/* Histogram output */}
            <Panel defaultSize={35} minSize={20}>
              <OutputDisplay results={results} view="histogram" />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="w-px bg-vegas-gold/20 hover:bg-vegas-gold/40 transition-colors" />

        {/* Panel 3: Right sidebar with tabs */}
        <Panel defaultSize={28} minSize={22}>
          <div className="h-full flex flex-col bg-deep-jungle">
            {/* Tab Headers */}
            <div className="flex border-b border-vegas-gold/20 bg-forest-light/30">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-3 font-body text-xs transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-vegas-gold text-vegas-gold bg-deep-jungle/50'
                      : 'border-transparent text-isabelline/40 hover:text-isabelline/70 hover:bg-deep-jungle/30'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'code' && (
                <OutputDisplay results={results} view="code" />
              )}
              {activeTab === 'qsphere' && (
                <QSphere 
                  numQubits={state.numQubits}
                  gates={state.gates}
                  multiQubitGates={state.multiQubitGates}
                />
              )}
              {activeTab === 'bloch' && (
                <BlochSphere
                  numQubits={state.numQubits}
                  gates={state.gates}
                  multiQubitGates={state.multiQubitGates}
                />
              )}
              {activeTab === 'entanglement' && (
                <EntanglementGraph
                  numQubits={state.numQubits}
                  gates={state.gates}
                  multiQubitGates={state.multiQubitGates}
                />
              )}
              {activeTab === 'resources' && (
                <ResourcePanel
                  numQubits={state.numQubits}
                  gates={state.gates}
                  multiQubitGates={state.multiQubitGates}
                />
              )}
              {activeTab === 'debug' && (
                <DebugTimeline
                  numQubits={state.numQubits}
                  gates={state.gates}
                  multiQubitGates={state.multiQubitGates}
                  maxTimestep={state.numTimesteps}
                />
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

function App() {
  return (
    <CircuitProvider>
      <CircuitEditor />
    </CircuitProvider>
  );
}

export default App;
