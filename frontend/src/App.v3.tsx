import { useEffect, useState } from 'react';
import { Box, Button, Paper, Text, Group, ActionIcon, Tooltip, Tabs, Menu } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconMinus, IconChartBar, IconAtom, IconShare3, IconCpu, IconTimeline, IconWand, IconTemplate, IconChevronDown, IconSphere } from '@tabler/icons-react';
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
            '0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-cnot-0', gateType: 'CNOT', control: 0, target: 1, timestep: 1 }
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
            '0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-cnot-0', gateType: 'CNOT', control: 0, target: 1, timestep: 1 },
            { id: 'preset-cnot-1', gateType: 'CNOT', control: 1, target: 2, timestep: 2 }
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
            '0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 },
            '1-0': { id: 'preset-h-1', gateType: 'H', qubit: 1, timestep: 0 },
            '2-0': { id: 'preset-h-2', gateType: 'H', qubit: 2, timestep: 0 }
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
            '0-0': { id: 'preset-h-0', gateType: 'H', qubit: 0, timestep: 0 },
            '1-2': { id: 'preset-h-1', gateType: 'H', qubit: 1, timestep: 2 }
          },
          multiQubitGates: [
            { id: 'preset-cz-0', gateType: 'CZ', control: 0, target: 1, timestep: 1 }
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
            '0-0': { id: 'preset-x-0', gateType: 'X', qubit: 0, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-swap-0', gateType: 'SWAP', control: 0, target: 1, timestep: 1 }
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
            '0-0': { id: 'preset-x-0', gateType: 'X', qubit: 0, timestep: 0 },
            '1-0': { id: 'preset-x-1', gateType: 'X', qubit: 1, timestep: 0 }
          },
          multiQubitGates: [
            { id: 'preset-ccx-0', gateType: 'CCX', control: 0, control2: 1, target: 2, timestep: 1 }
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
      notifications.show({
        title: 'Preset Loaded',
        message: `Loaded ${preset.toUpperCase()} circuit preset.`,
        color: 'blue',
      });
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
          notifications.show({
            title: 'Circuit Loaded',
            message: 'Successfully loaded shared circuit.',
            color: 'blue',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load shared circuit:', error);
      notifications.show({
        title: 'Load Error',
        message: 'Could not load shared circuit.',
        color: 'red',
      });
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
          notifications.show({
            title: 'Link Copied!',
            message: 'Your circuit is copied to the clipboard.',
            color: 'blue',
          });
        })
        .catch((err) => {
          console.warn('Clipboard write failed.', err);
          notifications.show({
            title: 'URL Ready!',
            message: 'Link updated in your address bar.',
            color: 'yellow',
          });
        });
    } catch (error) {
      console.error('Failed to create shareable link:', error);
      notifications.show({
        title: 'Error',
        message: 'Could not create shareable link.',
        color: 'red',
      });
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
        notifications.show({
          title: 'Circuit Optimized',
          message: `Removed ${data.gates_removed} redundant gates (${data.original_count} → ${data.optimized_count})`,
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Optimization Failed',
        message: error.message || 'Check the console for details.',
        color: 'red',
      });
    }
  };

  // Simulate handler
  const handleSimulate = async () => {
    try {
      await runCircuit();
      notifications.show({
        title: 'Simulation Complete',
        message: 'Results updated successfully.',
        color: 'blue',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Simulation Failed',
        message: error.message || 'Check the console for details.',
        color: 'red',
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter: Simulate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCircuit();
      }
      // Escape: Deselect gate
      if (e.key === 'Escape') {
        setSelectedGate(null);
      }
      // Number keys 1-9: Quick gate select
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

  return (
    <Box style={{ height: '100vh', width: '100vw' }}>
      <PanelGroup direction="horizontal">
        {/* Panel 1: Gate Palette */}
        <Panel defaultSize={15} minSize={12} maxSize={20}>
          <GatePaletteV3 
            selectedGate={selectedGate} 
            onGateSelect={setSelectedGate} 
          />
        </Panel>
        <PanelResizeHandle />

        {/* Panel 2: Main Content (Canvas + Outputs) */}
        <Panel defaultSize={55} minSize={40}>
          <PanelGroup direction="vertical">
            {/* Circuit Canvas */}
            <Panel defaultSize={65} minSize={40}>
              <Paper style={{ height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#16213e' }}>
                {/* Top controls - all in one row */}
                <Box style={{ position: 'absolute', top: 10, right: 10, zIndex: 100,
                  backgroundColor: 'rgba(26,26,46,0.9)', padding: '6px 12px', borderRadius: 6 }}>
                  <Group gap="md">
                    {/* Qubit controls */}
                    <Group gap={4}>
                      <Text size="xs" c="#888">Qubits:</Text>
                      <ActionIcon variant="subtle" size="xs" onClick={removeQubit} 
                        disabled={state.numQubits <= 1} color="gray">
                        <IconMinus size={12} />
                      </ActionIcon>
                      <Text size="sm" c="white" fw={600}>{state.numQubits}</Text>
                      <ActionIcon variant="subtle" size="xs" onClick={addQubit}
                        disabled={state.numQubits >= 20} color="gray">
                        <IconPlus size={12} />
                      </ActionIcon>
                    </Group>
                    <Box style={{ width: 1, height: 20, backgroundColor: '#444' }} />
                    <Menu shadow="md" width={180}>
                      <Menu.Target>
                        <Button variant="subtle" size="xs" color="cyan" leftSection={<IconTemplate size={12} />} rightSection={<IconChevronDown size={10} />}>
                          Presets
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Entanglement</Menu.Label>
                        <Menu.Item onClick={() => loadPreset('bell')}>Bell State (2q)</Menu.Item>
                        <Menu.Item onClick={() => loadPreset('ghz3')}>GHZ State (3q)</Menu.Item>
                        <Menu.Divider />
                        <Menu.Label>Superposition</Menu.Label>
                        <Menu.Item onClick={() => loadPreset('superposition')}>Uniform (3q)</Menu.Item>
                        <Menu.Item onClick={() => loadPreset('qft2')}>QFT (2q)</Menu.Item>
                        <Menu.Divider />
                        <Menu.Label>Multi-Qubit Gates</Menu.Label>
                        <Menu.Item onClick={() => loadPreset('swap')}>SWAP Test (2q)</Menu.Item>
                        <Menu.Item onClick={() => loadPreset('toffoli')}>Toffoli (3q)</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                    <Tooltip label="Optimize circuit (cancel redundant gates)">
                      <Button onClick={handleOptimize} variant="subtle" size="xs" color="grape" leftSection={<IconWand size={12} />}>
                        Optimize
                      </Button>
                    </Tooltip>
                    <Button onClick={getShareableLink} variant="subtle" size="xs" color="gray">
                      Share
                    </Button>
                    <Tooltip label="Ctrl+Enter to simulate">
                      <Button onClick={handleSimulate} loading={isSimulating} size="sm" 
                        style={{ backgroundColor: '#4fc3f7', color: '#000' }}>
                        Simulate
                      </Button>
                    </Tooltip>
                  </Group>
                </Box>

                {/* Circuit Canvas */}
                <CircuitCanvas 
                  selectedGate={selectedGate}
                  onGateSelect={setSelectedGate}
                />
              </Paper>
            </Panel>
            <PanelResizeHandle />

            {/* Histogram output */}
            <Panel defaultSize={35} minSize={20}>
              <OutputDisplay results={results} view="histogram" />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle />

        {/* Panel 3: Right sidebar with tabs */}
        <Panel defaultSize={28} minSize={22}>
          <Tabs defaultValue="code" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Tabs.List style={{ backgroundColor: '#1a1a2e', borderBottom: '1px solid #333' }}>
              <Tabs.Tab value="code" leftSection={<IconChartBar size={14} />} style={{ color: '#aaa' }}>
                Code
              </Tabs.Tab>
              <Tabs.Tab value="qsphere" leftSection={<IconAtom size={14} />} style={{ color: '#aaa' }}>
                Q-Sphere
              </Tabs.Tab>
              <Tabs.Tab value="bloch" leftSection={<IconSphere size={14} />} style={{ color: '#aaa' }}>
                Bloch
              </Tabs.Tab>
              <Tabs.Tab value="entanglement" leftSection={<IconShare3 size={14} />} style={{ color: '#aaa' }}>
                Entangle
              </Tabs.Tab>
              <Tabs.Tab value="resources" leftSection={<IconCpu size={14} />} style={{ color: '#aaa' }}>
                Resources
              </Tabs.Tab>
              <Tabs.Tab value="debug" leftSection={<IconTimeline size={14} />} style={{ color: '#aaa' }}>
                Debug
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="code" style={{ flex: 1, overflow: 'hidden' }}>
              <OutputDisplay results={results} view="code" />
            </Tabs.Panel>

            <Tabs.Panel value="qsphere" style={{ flex: 1, overflow: 'hidden' }}>
              <QSphere 
                numQubits={state.numQubits}
                gates={state.gates}
                multiQubitGates={state.multiQubitGates}
              />
            </Tabs.Panel>

            <Tabs.Panel value="bloch" style={{ flex: 1, overflow: 'hidden' }}>
              <BlochSphere
                numQubits={state.numQubits}
                gates={state.gates}
                multiQubitGates={state.multiQubitGates}
              />
            </Tabs.Panel>

            <Tabs.Panel value="entanglement" style={{ flex: 1, overflow: 'hidden' }}>
              <EntanglementGraph
                numQubits={state.numQubits}
                gates={state.gates}
                multiQubitGates={state.multiQubitGates}
              />
            </Tabs.Panel>

            <Tabs.Panel value="resources" style={{ flex: 1, overflow: 'hidden' }}>
              <ResourcePanel
                numQubits={state.numQubits}
                gates={state.gates}
                multiQubitGates={state.multiQubitGates}
              />
            </Tabs.Panel>

            <Tabs.Panel value="debug" style={{ flex: 1, overflow: 'hidden' }}>
              <DebugTimeline
                numQubits={state.numQubits}
                gates={state.gates}
                multiQubitGates={state.multiQubitGates}
                maxTimestep={state.numTimesteps}
              />
            </Tabs.Panel>
          </Tabs>
        </Panel>
      </PanelGroup>
    </Box>
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
