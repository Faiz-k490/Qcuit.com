// In frontend/src/components/GatePalette.tsx
import { Paper, Group, Text, Accordion, Slider, Box, Center } from '@mantine/core';
import { useDraggable } from '@dnd-kit/core';
import { CircuitState } from '../types';

// A small, draggable gate component for the palette
function DraggableGate({ gateType }: { gateType: string }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `palette-gate-${gateType}`,
    data: {
      gateType: gateType,
    },
  });

  return (
    <Center
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        cursor: 'grab',
        width: 40,
        height: 40,
        border: '1px solid #444',
        borderRadius: 4,
        backgroundColor: '#2e2e2e',
      }}
    >
      <Text fw={700}>{gateType}</Text>
    </Center>
  );
}

// The main palette
export function GatePalette({
  circuitState,
  setCircuitState,
}: {
  circuitState: CircuitState;
  setCircuitState: React.Dispatch<React.SetStateAction<CircuitState>>;
}) {

  const onNoiseChange = (value: number) => {
    setCircuitState(prev => ({ ...prev, noiseLevel: value }));
  };

  return (
    <Paper p="md" style={{ height: '100%', overflowY: 'auto' }}>
      <Text size="lg" fw={700} mb="md">Gate Palette</Text>
      <Accordion defaultValue={["common"]} multiple>

        <Accordion.Item value="common">
          <Accordion.Control>Common Gates</Accordion.Control>
          <Accordion.Panel>
            <Group>
              <DraggableGate gateType="H" />
              <DraggableGate gateType="X" />
              <DraggableGate gateType="Y" />
              <DraggableGate gateType="Z" />
            </Group>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="parametric">
          <Accordion.Control>Parametric Gates</Accordion.Control>
          <Accordion.Panel>
            <Group>
              <DraggableGate gateType="RX" />
              <DraggableGate gateType="RY" />
              <DraggableGate gateType="RZ" />
            </Group>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="multi">
          <Accordion.Control>Multi-Qubit Gates</Accordion.Control>
          <Accordion.Panel>
            <Group>
              <DraggableGate gateType="CNOT" />
              <DraggableGate gateType="CZ" />
              <DraggableGate gateType="SWAP" />
              <DraggableGate gateType="CCNOT" />
            </Group>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="measurement">
          <Accordion.Control>Measurement</Accordion.Control>
          <Accordion.Panel>
            <DraggableGate gateType="M" />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="noise">
          <Accordion.Control>Noise Simulation</Accordion.Control>
          <Accordion.Panel>
            <Box px="sm" pt="xs">
              <Text size="sm">Depolarizing Channel Noise</Text>
              <Slider
                value={circuitState.noiseLevel}
                onChange={onNoiseChange}
                min={0}
                max={0.1} // Max 10%
                step={0.01}
                precision={2}
                label={value => `${(value * 100).toFixed(0)}%`}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.05, label: '5%' },
                  { value: 0.1, label: '10%' },
                ]}
              />
            </Box>
          </Accordion.Panel>
        </Accordion.Item>

      </Accordion>
    </Paper>
  );
}
