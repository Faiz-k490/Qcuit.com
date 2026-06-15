import { useState, useEffect } from 'react';
import { Box, Button, Center, Paper, Text, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
} from '@dnd-kit/core';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { v4 as uuidv4 } from 'uuid';
import { CircuitState, DraggingGate, GateInstance, SimulationResult, PendingGate, MultiQubitGateInstance, Measurement } from './types';
import { GatePalette } from './components/GatePalette';
import { CircuitGrid } from './components/CircuitGrid';
import { OutputDisplay } from './components/OutputDisplay';
import { useCircuitValidator } from './hooks/useCircuitValidator';

// Define the initial state for the circuit
const initialState: CircuitState = {
  numQubits: 5,
  numClassical: 5,
  numTimesteps: 20,
  gates: {},
  multiQubitGates: [],
  measurements: [],
  noiseLevel: 0.0,
};

// Component for the drag overlay
function DraggingGateItem({ gateType }: { gateType: string }) {
  return (
    <Center
      style={{
        width: 40,
        height: 40,
        border: '1px solid #888',
        borderRadius: 4,
        backgroundColor: '#555',
      }}
    >
      <Text fw={700}>{gateType}</Text>
    </Center>
  );
}

function App() {
  const [circuitState, setCircuitState] = useState<CircuitState>(initialState);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<DraggingGate | null>(null);
  const [pendingGate, setPendingGate] = useState<PendingGate | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const validationErrors = useCircuitValidator(circuitState, pendingGate);

  // Setup D&D sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 5px to start a drag
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // --- Mouse Tracking Effect ---
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    // Only listen for mouse move when a gate is NOT being dragged
    if (!activeDragItem) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeDragItem]);

  // --- HOOK FOR LOADING STATE FROM URL ---
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedState = urlParams.get('circuit');

      if (sharedState) {
        const stateString = atob(sharedState);
        const loadedState: CircuitState = JSON.parse(stateString);

        if (loadedState.numQubits && loadedState.gates) {
          setCircuitState(loadedState);
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
  }, []);

  // --- D&D Handlers ---
  // --- D&D Handlers ---
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data && data.gateType) {
      setActiveDragItem(data as DraggingGate);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over } = event;
    
    // Clear activeDragItem first to re-enable mouse tracking
    setActiveDragItem(null);

    if (activeDragItem && over && over.id) {
      const overId = String(over.id);
      const gateType = activeDragItem.gateType;

      if (overId.startsWith('slot-q')) {
        const [, q_str, t_str] = overId.split('-').map(s => s.substring(1));
        const qubit = parseInt(q_str, 10);
        const timestep = parseInt(t_str, 10);
        const slotKey = `q_${qubit}-${timestep}`;

        const simpleGates = ['H', 'X', 'Y', 'Z', 'S', 'T', 'SDG', 'TDG'];
        const parametricGates = ['RX', 'RY', 'RZ'];
        const multiQubitGates = ['CNOT', 'CZ', 'SWAP', 'CCNOT'];
        const measurementGate = 'M';

        // --- FUNCTION TO ADD A GATE ---
        const addGateToState = (gate: GateInstance) => {
          setCircuitState(prevState => {
            if (prevState.gates[slotKey]) {
              notifications.show({
                title: 'Error',
                message: 'A gate already exists in this slot.',
                color: 'red',
              });
              return prevState;
            }
            const newGates = { ...prevState.gates, [slotKey]: gate };
            return { ...prevState, gates: newGates };
          });
        };

        // --- LOGIC FOR DIFFERENT GATE TYPES ---
        if (simpleGates.includes(gateType)) {
          // Handle simple gates
          const newGate: GateInstance = {
            id: uuidv4(),
            gateType: gateType,
            qubit: qubit,
            timestep: timestep,
          };
          addGateToState(newGate);

        } else if (parametricGates.includes(gateType)) {
          // Handle parametric gates: Open modal
          modals.openContextModal({
            modal: 'parametricModal',
            title: `Set ${gateType} Parameter`,
            innerProps: {
              gateType: gateType,
              onConfirm: (theta: number) => {
                const newGate: GateInstance = {
                  id: uuidv4(),
                  gateType: gateType,
                  qubit: qubit,
                  timestep: timestep,
                  theta: theta,
                };
                addGateToState(newGate);
              },
            },
          });
        } else if (multiQubitGates.includes(gateType) || gateType === measurementGate) {
          // --- SET PENDING GATE ---
          // Start the multi-step placement
          setPendingGate({
            gateType: gateType,
            controls: [qubit], // For M, this stores the qubit; for CCNOT this is first control
            timestep: timestep,
          });
          const message = gateType === 'CCNOT'
            ? 'Click a second control slot to continue.'
            : 'Click a target slot in the same timestep to complete the gate.';
          notifications.show({
            title: `${gateType} Gate Started`,
            message,
            color: 'blue',
          });
        }
      }
    }
  }

  // --- Slot Click Handler ---
  function onSlotClick(slotId: string) {
    if (!pendingGate) return;

    const slotMatch = slotId.match(/slot-([qc])(\d+)-t(\d+)/);
    const { gateType, controls, timestep } = pendingGate;

    // Cancel if invalid slot or wrong timestep
    if (!slotMatch || parseInt(slotMatch[3], 10) !== timestep) {
      setPendingGate(null);
      notifications.show({
        title: 'Gate Canceled',
        message: 'Target must be in the same timestep.',
        color: 'yellow',
      });
      return;
    }

    const [, type, index_str] = slotMatch;
    const index = parseInt(index_str, 10);

    // Measurement flow
    if (gateType === 'M') {
      if (type === 'c') {
        const newMeasurement: Measurement = {
          id: uuidv4(),
          gateType: 'MEASUREMENT',
          qubit: controls[0],
          classicalBit: index,
          timestep,
        };
        setCircuitState(prev => ({
          ...prev,
          measurements: [...prev.measurements, newMeasurement],
        }));
        setPendingGate(null);
      }
      return;
    }

    // Multi-qubit flow
    if (type === 'q') {
      if (controls.includes(index)) {
        // clicked on an existing control; ignore
        return;
      }

      if (gateType === 'CCNOT' && controls.length === 1) {
        // Second control selection
        setPendingGate({ ...pendingGate, controls: [controls[0], index] });
        notifications.show({
          title: 'CCNOT Control 2 Added',
          message: 'Click a target slot to complete the gate.',
          color: 'blue',
        });
        return;
      }

      const expectedControls = gateType === 'CCNOT' ? 2 : 1;
      if (controls.length === expectedControls) {
        const targets = gateType === 'SWAP' ? [controls[0], index] : [index];
        const newGate: MultiQubitGateInstance = {
          id: uuidv4(),
          gateType,
          timestep,
          controls: [...controls],
          targets,
        };
        setCircuitState(prev => ({
          ...prev,
          multiQubitGates: [...prev.multiQubitGates, newGate],
        }));
        setPendingGate(null);
      }
    }
  }

  // --- API Call ---
  async function onSimulateClick() {
    const API_URL = process.env.REACT_APP_API_URL || '/api/simulate';
    console.log(`Sending simulation request to: ${API_URL}`);

    try {
      // Send the ENTIRE circuitState to the backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(circuitState), // Send the real state
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
      notifications.show({
        title: 'Simulation Complete',
        message: 'Results updated successfully.',
        color: 'blue',
      });

    } catch (error: any) {
      console.error('Simulation failed:', error);
      notifications.show({
        title: 'Simulation Failed',
        message: error.message || 'Check the console for details.',
        color: 'red',
      });
    }
  }

  // --- SHARE FUNCTION ---
  function getShareableLink() {
    try {
      // 1. Serialize and Encode
      const stateString = JSON.stringify(circuitState);
      const base64State = btoa(stateString);

      // 2. Create the new URL
      const url = new URL(window.location.href);
      url.search = '';
      url.searchParams.set('circuit', base64State);

      // 3. Update the URL bar (this always works)
      window.history.pushState({}, '', url.toString());

      // 4. Try to copy to clipboard (may fail on non-HTTPS)
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
          console.warn('Clipboard write failed. URL was updated in bar.', err);
          notifications.show({
            title: 'URL Ready!',
            message: 'Link updated in your address bar. (Copying failed on non-HTTPS page).',
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
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Box style={{ height: '100vh', width: '100vw' }}>
        <PanelGroup direction="horizontal">

          {/* Panel 1: Gate Palette */}
          <Panel defaultSize={20} minSize={15}>
            <GatePalette
              circuitState={circuitState}
              setCircuitState={setCircuitState}
            />
          </Panel>
          <PanelResizeHandle />

          {/* Panel 2: Main Content (Grid + Outputs) */}
          <Panel defaultSize={55} minSize={40}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={65} minSize={40}>
                  <Paper style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                  <Box style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                    <Group>
                      <Button onClick={getShareableLink} variant="default">Share</Button>
                      <Button onClick={onSimulateClick}>Simulate</Button>
                    </Group>
                  </Box>

                    {/* --- UPDATE: Pass pendingGate and mousePosition --- */}
                  <CircuitGrid
                    circuitState={circuitState}
                    onSlotClick={onSlotClick}
                      pendingGate={pendingGate}
                      mousePosition={mousePosition}
                  />

                </Paper>
              </Panel>
              <PanelResizeHandle />
              <Panel defaultSize={35} minSize={20}>
                {/* --- UPDATE PANEL 2b --- */}
                <OutputDisplay
                  results={results}
                  view="histogram"
                />
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle />

          {/* Panel 3: Code Output */}
          <Panel defaultSize={25} minSize={20}>
            {/* --- UPDATE PANEL 3 --- */}
            <OutputDisplay
              results={results}
              view="code"
              validationErrors={validationErrors}
            />
          </Panel>

        </PanelGroup>
      </Box>

      {/* --- ADD THE DRAG OVERLAY --- */}
      <DragOverlay>
        {activeDragItem ? (
          <DraggingGateItem gateType={activeDragItem.gateType} />
        ) : null}
      </DragOverlay>

    </DndContext>
  );
}

export default App;
