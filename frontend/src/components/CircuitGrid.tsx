// In frontend/src/components/CircuitGrid.tsx
import { Grid, Box, Text, Center } from '@mantine/core';
import { CircuitState, GateInstance, MultiQubitGateInstance, Measurement } from '../types';
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

// --- NEW: Component to render multi-qubit gates (text only) ---
function MultiGateText({ gate }: { gate: MultiQubitGateInstance }) {
  return (
    <Center
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        color: '#aaffaa',
        pointerEvents: 'none',
      }}
    >
      <Text size="xs" ta="center">
        {gate.gateType} (C:{gate.controls[0]}, T:{gate.targets[0]})
      </Text>
    </Center>
  );
}

// --- NEW: Component to render measurement (text only) ---
function MeasurementText({ gate }: { gate: Measurement }) {
  return (
    <Center
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        color: '#aaaaff',
        pointerEvents: 'none',
      }}
    >
      <Text size="xs" ta="center">
        M (Q{gate.qubit}
        <br />
        to C{gate.classicalBit})
      </Text>
    </Center>
  );
}

export function CircuitGrid({
  circuitState,
  onSlotClick,
}: {
  circuitState: CircuitState;
  onSlotClick: (id: string) => void;
}) {
  const { numQubits, numClassical, numTimesteps, gates, multiQubitGates, measurements } =
    circuitState;

  const timeSlots = Array.from({ length: numTimesteps }, (_, t) => t);
  const qubitWires = Array.from({ length: numQubits }, (_, q) => q);
  const classicalWires = Array.from({ length: numClassical }, (_, c) => c);

  // Find multi-qubit gates and measurements at a specific timestep
  const getMultiGateAt = (t: number) =>
    multiQubitGates.find(g => g.timestep === t);
  const getMeasurementAt = (t: number) =>
    measurements.find(m => m.timestep === t);

  return (
    <Box style={{ overflow: 'auto', height: '100%' }}>
      <Grid
        style={{
          minWidth: numTimesteps * 50,
          position: 'relative',
        }}
      >
        {/* --- Render Qubit Wires --- */}
        {qubitWires.map(q_index => (
          <Grid.Col span={12} key={`wire-q-${q_index}`}>
            <Box style={{ display: 'flex', flexDirection: 'row' }}>
              {timeSlots.map(t_index => {
                const slotId = `slot-q${q_index}-t${t_index}`;
                const gate = gates[`q_${q_index}-${t_index}`];

                return (
                  <Box
                    key={slotId}
                    style={{
                      flex: '1 0 50px',
                      minWidth: 50,
                      position: 'relative',
                      padding: 5,
                    }}
                  >
                    <DroppableSlot id={slotId} onSlotClick={onSlotClick} />
                    {gate && <Gate gate={gate} />}

                    {/* --- Render multi-gate text (on first control qubit) --- */}
                    {getMultiGateAt(t_index)?.controls[0] === q_index && (
                      <MultiGateText gate={getMultiGateAt(t_index)!} />
                    )}
                    {/* --- Render measurement text (on the qubit) --- */}
                    {getMeasurementAt(t_index)?.qubit === q_index && (
                      <MeasurementText gate={getMeasurementAt(t_index)!} />
                    )}
                  </Box>
                );
              })}
            </Box>
          </Grid.Col>
        ))}

        {/* --- Render Classical Wires --- */}
        {classicalWires.map(c_index => (
          <Grid.Col span={12} key={`wire-c-${c_index}`}>
            <Box style={{ display: 'flex', flexDirection: 'row', borderTop: '2px double #555' }}>
              {timeSlots.map(t_index => {
                const slotId = `slot-c${c_index}-t${t_index}`;
                return (
                  <Box
                    key={slotId}
                    style={{
                      flex: '1 0 50px',
                      minWidth: 50,
                      position: 'relative',
                      padding: 5,
                    }}
                  >
                    <DroppableSlot id={slotId} onSlotClick={onSlotClick} />
                  </Box>
                );
              })}
            </Box>
          </Grid.Col>
        ))}

      </Grid>
    </Box>
  );
}
