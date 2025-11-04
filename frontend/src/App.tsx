import { useState } from 'react';
import { Box, Button, Group, Paper, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  MouseSensor,
} from '@dnd-kit/core';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import { CircuitState, DraggingGate, SimulationResult } from './types';
import { GatePalette } from './components/GatePalette';

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

function App() {
  const [circuitState, setCircuitState] = useState<CircuitState>(initialState);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<DraggingGate | null>(null);

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
  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data && data.gateType) {
      setActiveDragItem(data as DraggingGate);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null);
    const { over } = event;

    if (over) {
      console.log(`Gate ${activeDragItem?.gateType} dropped on ${over.id}`);
      // TODO: Add logic to place the gate in circuitState
      // e.g., if (over.id.startsWith('slot-')) { ... }
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
                <Paper p="md" style={{ height: '100%', position: 'relative' }}>
                  <Text>Circuit Grid (Panel 2a)</Text>
                  <Button
                    onClick={onSimulateClick}
                    style={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}
                  >
                    Simulate
                  </Button>
                  {/* We will add CircuitGridV2 component here */}
                </Paper>
              </Panel>
              <PanelResizeHandle />
              <Panel defaultSize={35} minSize={20}>
                <Paper p="md" style={{ height: '100%' }}>
                  <Text>Probabilities (Panel 2b)</Text>
                  {/* We will add OutputDisplay (Histogram) here */}
                </Paper>
              </Panel>
            </PanelGroup>
          </Panel>
          <PanelResizeHandle />

          {/* Panel 3: Code Output */}
          <Panel defaultSize={25} minSize={20}>
            <Paper p="md" style={{ height: '100%', overflow: 'auto' }}>
              <Text>Generated Code (Panel 3)</Text>
              {results && (
                <pre style={{ overflow: 'auto' }}>
                  {JSON.stringify(results, null, 2)}
                </pre>
              )}
              {/* We will add OutputDisplay (Code) here */}
            </Paper>
          </Panel>

        </PanelGroup>
      </Box>

      {/* TODO: Add DragOverlay here */}

    </DndContext>
  );
}

export default App;
