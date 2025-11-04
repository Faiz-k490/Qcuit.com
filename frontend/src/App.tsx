import { useState } from 'react';
import { Box, Button, Center, Paper, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
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
import { CircuitState, DraggingGate, GateInstance, SimulationResult } from './types';
import { GatePalette } from './components/GatePalette';
import { CircuitGrid } from './components/CircuitGrid';
import { OutputDisplay } from './components/OutputDisplay';

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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Setup D&D sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 5px to start a drag
      activationConstraint: {
        distance: 5,
      },
    })
  );

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

    // Check if we have an active item and a drop target
    if (activeDragItem && over && over.id) {
      const overId = String(over.id);

      // Check if the drop target is a circuit slot
      if (overId.startsWith('slot-q')) {
        // Parse "slot-q0-t5" into [0, 5]
        const [, q_str, t_str] = overId.split('-').map(s => s.substring(1));
        const qubit = parseInt(q_str, 10);
        const timestep = parseInt(t_str, 10);
        const slotKey = `q_${qubit}-${timestep}`;

        // TODO: Add logic for multi-qubit gates and measurements

        // For now, only handle single-qubit gates
        const isSingleQubitGate = ['H', 'X', 'Y', 'Z', 'RX', 'RY', 'RZ', 'S', 'T'].includes(
          activeDragItem.gateType
        );

        if (isSingleQubitGate) {
          const newGate: GateInstance = {
            id: uuidv4(),
            gateType: activeDragItem.gateType,
            qubit: qubit,
            timestep: timestep,
          };

          setCircuitState(prevState => {
            // Check for collision
            if (prevState.gates[slotKey]) {
              notifications.show({
                title: 'Error',
                message: 'A gate already exists in this slot.',
                color: 'red',
              });
              return prevState;
            }

            // Add the new gate
            const newGates = {
              ...prevState.gates,
              [slotKey]: newGate,
            };
            return { ...prevState, gates: newGates };
          });
        }
      }
    }

    setActiveDragItem(null); // Clear the active item
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
                <Paper style={{ height: '100%', position: 'relative' }}>
                  <Button
                    onClick={onSimulateClick}
                    style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}
                  >
                    Simulate
                  </Button>

                  {/* --- ADD THE CIRCUIT GRID --- */}
                  <CircuitGrid circuitState={circuitState} />

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
