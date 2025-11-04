// In frontend/src/components/OutputDisplay.tsx
import { Paper, Text, Tabs, Badge, Stack, Group, ThemeIcon, Box, Code } from '@mantine/core';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { SimulationResult } from '../types';
import { IconAlertTriangle } from '@tabler/icons-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type OutputDisplayProps = {
  results: SimulationResult | null;
  view: 'histogram' | 'code';
  validationErrors?: string[];
};

export function OutputDisplay({
  results,
  view,
  validationErrors = [],
}: OutputDisplayProps) {

  // --- View 1: Histogram ---
  if (view === 'histogram') {
    const chartData = {
      labels: results ? Object.keys(results.probabilities) : [],
      datasets: [
        {
          label: 'Probability',
          data: results ? Object.values(results.probabilities) : [],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
        },
      ],
    };

    return (
      <Paper p="md" style={{ height: '100%', overflow: 'auto' }}>
        <Text>Probabilities</Text>
        <Box style={{ height: 'calc(100% - 30px)' }}>
          <Bar
            data={chartData}
            options={{
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 1,
                },
              },
            }}
          />
        </Box>
      </Paper>
    );
  }

  // --- View 2: Code & Problems Tabs ---
  const errorCount = validationErrors.length;

  return (
    <Paper p="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs defaultValue="qiskit" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Tabs.List>
          <Tabs.Tab value="qiskit">Qiskit</Tabs.Tab>
          <Tabs.Tab value="braket">Braket</Tabs.Tab>
          <Tabs.Tab value="openqasm">OpenQASM</Tabs.Tab>
          <Tabs.Tab
            value="problems"
            color={errorCount > 0 ? 'red' : 'gray'}
            rightSection={
              errorCount > 0 ? (
                <Badge color="red" variant="filled" size="sm" circle>
                  {errorCount}
                </Badge>
              ) : null
            }
          >
            Problems
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="qiskit" pt="xs" style={{ flexGrow: 1, overflow: 'auto' }}>
          <Code block style={{ whiteSpace: 'pre', fontSize: '0.85rem' }}>
            {results?.code.qiskit || '# Click "Simulate" to generate Qiskit code.'}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel value="braket" pt="xs" style={{ flexGrow: 1, overflow: 'auto' }}>
          <Code block style={{ whiteSpace: 'pre', fontSize: '0.85rem' }}>
            {results?.code.braket || '# Click "Simulate" to generate Braket code.'}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel value="openqasm" pt="xs" style={{ flexGrow: 1, overflow: 'auto' }}>
          <Code block style={{ whiteSpace: 'pre', fontSize: '0.85rem' }}>
            {results?.code.openqasm || '// Click "Simulate" to generate OpenQASM code.'}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel value="problems" pt="md" style={{ flexGrow: 1, overflow: 'auto' }}>
          {errorCount === 0 ? (
            <Text c="dimmed">No problems detected.</Text>
          ) : (
            <Stack gap="xs">
              {validationErrors.map((error, index) => (
                <Group key={index} wrap="nowrap">
                  <ThemeIcon color="red" size="sm" variant="light">
                    <IconAlertTriangle size={14} />
                  </ThemeIcon>
                  <Text size="sm">{error}</Text>
                </Group>
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}
