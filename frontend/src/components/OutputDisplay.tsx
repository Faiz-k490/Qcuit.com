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
    const hasResults = results && Object.keys(results.probabilities).length > 0;
    
    // Sort probabilities by value (descending) for better visualization
    const sortedEntries = hasResults 
      ? Object.entries(results.probabilities).sort(([, a], [, b]) => b - a)
      : [];
    
    // Generate gradient colors based on probability
    const generateColors = (probs: number[]) => {
      return probs.map(p => {
        const intensity = Math.max(0.4, p);
        return `rgba(100, 181, 246, ${intensity})`;
      });
    };

    const chartData = {
      labels: sortedEntries.map(([label]) => `|${label}⟩`),
      datasets: [
        {
          label: 'Probability',
          data: sortedEntries.map(([, prob]) => prob),
          backgroundColor: generateColors(sortedEntries.map(([, prob]) => prob)),
          borderColor: 'rgba(100, 181, 246, 1)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };

    return (
      <Paper p="md" style={{ height: '100%', overflow: 'auto', backgroundColor: '#1e1e1e' }}>
        <Group justify="space-between" mb="sm">
          <Text fw={600} c="white">Probabilities</Text>
          {hasResults && (
            <Badge variant="light" color="blue">
              {sortedEntries.length} states
            </Badge>
          )}
        </Group>
        
        {!hasResults ? (
          <Box style={{ 
            height: 'calc(100% - 50px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8
          }}>
            <Text c="dimmed" size="sm">No simulation results yet</Text>
            <Text c="dimmed" size="xs">Click "Simulate" to run the circuit</Text>
          </Box>
        ) : (
          <Box style={{ height: 'calc(100% - 50px)' }}>
            <Bar
              data={chartData}
              options={{
                maintainAspectRatio: false,
                indexAxis: sortedEntries.length > 8 ? 'y' : 'x',
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${(ctx.raw as number * 100).toFixed(2)}%`
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    max: sortedEntries.length > 8 ? 1 : undefined,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#aaa' }
                  },
                  y: {
                    beginAtZero: true,
                    max: sortedEntries.length > 8 ? undefined : 1,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                      color: '#aaa',
                      callback: sortedEntries.length > 8 ? undefined : (value) => `${(value as number * 100).toFixed(0)}%`
                    }
                  },
                },
              }}
            />
          </Box>
        )}
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
