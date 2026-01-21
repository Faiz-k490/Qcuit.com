import { Paper, Text, Accordion, Slider, Box } from '@mantine/core';
import { useCircuit } from '../store/CircuitContext';

export function GatePaletteV3() {
  const { state, setNoiseLevel } = useCircuit();

  const onNoiseChange = (value: number) => {
    setNoiseLevel(value);
  };

  return (
    <Paper p="md" style={{ height: '100%', overflowY: 'auto' }}>
      <Text size="lg" fw={700} mb="md">
        Gate Palette
      </Text>

      <Text size="sm" c="dimmed" mb="md">
        Drag gates from the canvas palette (bottom-left) onto qubit wires. Double-click gates to delete.
      </Text>

      <Accordion defaultValue={['info', 'noise']} multiple>
        <Accordion.Item value="info">
          <Accordion.Control>Gate Types</Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" mb="xs">
              <strong>Single-qubit:</strong> H, X, Y, Z, S, T, SDG, TDG
            </Text>
            <Text size="sm" mb="xs">
              <strong>Parametric:</strong> RX, RY, RZ (with θ parameter)
            </Text>
            <Text size="sm" mb="xs">
              <strong>Multi-qubit:</strong> CNOT, CZ, SWAP, CCNOT
            </Text>
            <Text size="sm">
              <strong>Measurement:</strong> M (connects qubit to classical bit)
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="controls">
          <Accordion.Control>Controls</Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" mb="xs">
              <strong>Drag:</strong> Move gates freely on canvas
            </Text>
            <Text size="sm" mb="xs">
              <strong>Drop:</strong> Snaps to nearest grid position
            </Text>
            <Text size="sm" mb="xs">
              <strong>Double-click:</strong> Delete gate
            </Text>
            <Text size="sm">
              <strong>+/- buttons:</strong> Add/remove qubit wires (max 20)
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="noise">
          <Accordion.Control>Noise Simulation</Accordion.Control>
          <Accordion.Panel>
            <Box px="sm" pt="xs">
              <Text size="sm" mb="xs">
                Depolarizing Channel Noise
              </Text>
              <Slider
                value={state.noiseLevel}
                onChange={onNoiseChange}
                min={0}
                max={0.1}
                step={0.01}
                label={(value) => `${(value * 100).toFixed(0)}%`}
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
