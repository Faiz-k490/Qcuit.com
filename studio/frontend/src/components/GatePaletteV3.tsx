import { Paper, Text, Slider, Box, Stack, Tooltip, Group } from '@mantine/core';
import { useCircuit } from '../store/CircuitContext';
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react';

// IBM Composer style gate colors
const GATE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  H: { bg: '#1565c0', border: '#42a5f5', text: '#fff' },
  X: { bg: '#42a5f5', border: '#90caf9', text: '#fff' },
  Y: { bg: '#26a69a', border: '#80cbc4', text: '#fff' },
  Z: { bg: '#26a69a', border: '#80cbc4', text: '#fff' },
  S: { bg: '#7e57c2', border: '#b39ddb', text: '#fff' },
  'S†': { bg: '#7e57c2', border: '#b39ddb', text: '#fff' },
  T: { bg: '#7e57c2', border: '#b39ddb', text: '#fff' },
  'T†': { bg: '#7e57c2', border: '#b39ddb', text: '#fff' },
  RX: { bg: '#ef6c00', border: '#ffb74d', text: '#fff' },
  RY: { bg: '#ef6c00', border: '#ffb74d', text: '#fff' },
  RZ: { bg: '#ef6c00', border: '#ffb74d', text: '#fff' },
  I: { bg: '#546e7a', border: '#90a4ae', text: '#fff' },
  CNOT: { bg: '#42a5f5', border: '#90caf9', text: '#fff' },
  CZ: { bg: '#26a69a', border: '#80cbc4', text: '#fff' },
  SWAP: { bg: '#42a5f5', border: '#90caf9', text: '#fff' },
  CCX: { bg: '#42a5f5', border: '#90caf9', text: '#fff' },
  M: { bg: '#37474f', border: '#78909c', text: '#fff' },
};

const GATE_ROWS = [
  ['H', 'X', 'Y', 'Z', 'I'],
  ['T', 'S', 'T†', 'S†'],
  ['RX', 'RY', 'RZ'],
  ['CNOT', 'CZ', 'SWAP', 'CCX'],
  ['M'],
];

interface GatePaletteV3Props {
  selectedGate: string | null;
  onGateSelect: (gate: string) => void;
}

function GateButton({ gate, isSelected, onClick }: { 
  gate: string; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const colors = GATE_COLORS[gate] || { bg: '#424242', border: '#757575', text: '#fff' };
  
  return (
    <Tooltip label={gate} position="top" withArrow>
      <Box
        onClick={onClick}
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          border: isSelected ? '2px solid #fff' : `1px solid ${colors.border}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: gate.length > 3 ? 9 : gate.length > 2 ? 10 : 12,
          fontWeight: 600,
          color: colors.text,
          boxShadow: isSelected ? '0 0 0 2px #64b5f6' : 'none',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = isSelected ? '0 0 0 2px #64b5f6' : 'none';
        }}
      >
        {gate === 'CNOT' ? '⊕' : gate === 'M' ? '📊' : gate}
      </Box>
    </Tooltip>
  );
}

export function GatePaletteV3({ selectedGate, onGateSelect }: GatePaletteV3Props) {
  const { state, setNoiseLevel, clearCircuit, undo, redo, canUndo, canRedo } = useCircuit();

  return (
    <Paper p="sm" style={{ height: '100%', overflowY: 'auto', backgroundColor: '#1a1a2e' }}>
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={600} c="white">Operations</Text>
        <Group gap={4}>
          <Tooltip label="Undo">
            <Box
              onClick={canUndo ? undo : undefined}
              style={{
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: canUndo ? '#2a2a4e' : '#1a1a2e', borderRadius: 4, cursor: canUndo ? 'pointer' : 'default',
                opacity: canUndo ? 1 : 0.4,
              }}
            >
              <IconArrowBackUp size={14} color="#aaa" />
            </Box>
          </Tooltip>
          <Tooltip label="Redo">
            <Box
              onClick={canRedo ? redo : undefined}
              style={{
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: canRedo ? '#2a2a4e' : '#1a1a2e', borderRadius: 4, cursor: canRedo ? 'pointer' : 'default',
                opacity: canRedo ? 1 : 0.4,
              }}
            >
              <IconArrowForwardUp size={14} color="#aaa" />
            </Box>
          </Tooltip>
        </Group>
      </Group>
      
      <Stack gap="xs">
        {GATE_ROWS.map((row, rowIdx) => (
          <Group key={rowIdx} gap={6}>
            {row.map((gate) => (
              <GateButton
                key={gate}
                gate={gate}
                isSelected={selectedGate === gate}
                onClick={() => onGateSelect(gate)}
              />
            ))}
          </Group>
        ))}
      </Stack>

      <Box mt="lg" pt="md" style={{ borderTop: '1px solid #333' }}>
        <Text size="xs" c="dimmed" mb={4}>Noise Level</Text>
        <Slider
          value={state.noiseLevel}
          onChange={setNoiseLevel}
          min={0}
          max={0.1}
          step={0.01}
          size="xs"
          color="blue"
          label={(value) => `${(value * 100).toFixed(0)}%`}
        />
      </Box>

      <Box mt="lg" pt="md" style={{ borderTop: '1px solid #333' }}>
        <Text size="xs" c="dimmed" mb={4}>Instructions</Text>
        <Text size="xs" c="#888">Click gate → click slot</Text>
        <Text size="xs" c="#888">Double-click to delete</Text>
        <Text 
          size="xs" 
          c="#ef5350" 
          mt="sm"
          style={{ cursor: 'pointer' }}
          onClick={clearCircuit}
        >
          Clear Circuit
        </Text>
      </Box>
    </Paper>
  );
}
