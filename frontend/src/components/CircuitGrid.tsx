// In frontend/src/components/CircuitGrid.tsx
import { Grid, Box, Text, Center } from '@mantine/core';
import { CircuitState, GateInstance } from '../types';
import { DroppableSlot } from './DroppableSlot';

// This component renders a single gate on the grid
function Gate({ gate }: { gate: GateInstance }) {
  return (
    <Center
      style={{
        width: 40,
        height: 40,
        border: '1px solid #888',
        borderRadius: 4,
        backgroundColor: '#3e3e3e',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow dropping "through" it
      }}
    >
      <Text fw={700}>{gate.gateType}</Text>
    </Center>
  );
}

export function CircuitGrid({ circuitState }: { circuitState: CircuitState }) {
  const { numQubits, numTimesteps, gates } = circuitState;

  // Create an array for the grid rows (qubits)
  const qubitWires = Array.from({ length: numQubits }, (_, q) => q);

  // Create an array for the grid columns (timesteps)
  const timeSlots = Array.from({ length: numTimesteps }, (_, t) => t);

  return (
    <Box style={{ overflow: 'auto', height: '100%' }}>
      <Grid
        style={{
          minWidth: numTimesteps * 50, // Allow horizontal scrolling
          position: 'relative', // For absolute positioning of gates
        }}
      >
        {/* Render the grid of drop slots */}
        {qubitWires.map(q_index => (
          <Grid.Col span={12} key={`wire-${q_index}`}>
            <Box style={{ display: 'flex', flexDirection: 'row' }}>
              {timeSlots.map(t_index => {
                const slotId = `slot-q${q_index}-t${t_index}`;
                const gate = gates[`q_${q_index}-${t_index}`];

                return (
                  <Box
                    key={slotId}
                    style={{
                      flex: '1 0 50px', // Each slot is 50px wide
                      minWidth: 50,
                      position: 'relative', // For gate positioning
                      padding: 5,
                    }}
                  >
                    <DroppableSlot id={slotId} />
                    {/* If a gate exists at this slot, render it */}
                    {gate && <Gate gate={gate} />}
                  </Box>
                );
              })}
            </Box>
          </Grid.Col>
        ))}
        {/* We will add classical wires here later */}
      </Grid>
    </Box>
  );
}
