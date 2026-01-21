/**
 * Resource Estimation Panel
 * 
 * Shows gate counts, estimated fidelity, runtime, and hardware metrics
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, Group, Badge, Progress, Stack, Divider, Select } from '@mantine/core';
import { IconCpu, IconClock, IconTarget, IconActivity } from '@tabler/icons-react';

interface ResourceEstimate {
  backend: string;
  num_qubits: number;
  single_qubit_gates: number;
  two_qubit_gates: number;
  estimated_time_ns: number;
  estimated_fidelity: number;
  circuit_depth: number;
}

interface ResourcePanelProps {
  numQubits: number;
  gates: Record<string, any>;
  multiQubitGates: any[];
}

const BACKENDS = [
  { value: 'ibm_brisbane', label: 'IBM Brisbane (127Q)' },
  { value: 'ibm_osaka', label: 'IBM Osaka (127Q)' },
  { value: 'ionq_aria', label: 'IonQ Aria (25Q)' },
  { value: 'rigetti_aspen', label: 'Rigetti Aspen (80Q)' },
];

function formatTime(ns: number): string {
  if (ns < 1000) return `${ns.toFixed(0)} ns`;
  if (ns < 1e6) return `${(ns / 1000).toFixed(1)} μs`;
  if (ns < 1e9) return `${(ns / 1e6).toFixed(1)} ms`;
  return `${(ns / 1e9).toFixed(2)} s`;
}

function getFidelityColor(fidelity: number): string {
  if (fidelity > 0.99) return 'green';
  if (fidelity > 0.95) return 'lime';
  if (fidelity > 0.9) return 'yellow';
  if (fidelity > 0.8) return 'orange';
  return 'red';
}

export function ResourcePanel({ numQubits, gates, multiQubitGates }: ResourcePanelProps) {
  const [estimate, setEstimate] = useState<ResourceEstimate | null>(null);
  const [backend, setBackend] = useState('ibm_brisbane');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEstimate = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numQubits,
            gates,
            multiQubitGates,
            backend,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setEstimate(data);
        }
      } catch (err) {
        console.error('Failed to fetch estimate:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchEstimate, 300);
    return () => clearTimeout(timer);
  }, [numQubits, gates, multiQubitGates, backend]);

  const totalGates = (estimate?.single_qubit_gates || 0) + (estimate?.two_qubit_gates || 0);

  return (
    <Box style={{ height: '100%', backgroundColor: '#1a1a2e', padding: 12, overflowY: 'auto' }}>
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={600} c="white">Resources</Text>
        <Badge variant="light" color="blue" size="xs">
          {loading ? 'Loading...' : 'Live'}
        </Badge>
      </Group>

      <Select
        size="xs"
        value={backend}
        onChange={(v) => v && setBackend(v)}
        data={BACKENDS}
        mb="md"
        styles={{
          input: { backgroundColor: '#2a2a4e', borderColor: '#3a3a5e', color: '#fff' },
          dropdown: { backgroundColor: '#2a2a4e', borderColor: '#3a3a5e' },
        }}
      />

      <Stack gap="sm">
        {/* Gate Counts */}
        <Box>
          <Group justify="space-between" mb={4}>
            <Group gap={4}>
              <IconActivity size={14} color="#888" />
              <Text size="xs" c="#888">Total Gates</Text>
            </Group>
            <Text size="sm" c="white" fw={600}>{totalGates}</Text>
          </Group>
          <Group justify="space-between" pl={18}>
            <Text size="xs" c="#666">1-qubit</Text>
            <Text size="xs" c="#aaa">{estimate?.single_qubit_gates || 0}</Text>
          </Group>
          <Group justify="space-between" pl={18}>
            <Text size="xs" c="#666">2-qubit</Text>
            <Text size="xs" c="#aaa">{estimate?.two_qubit_gates || 0}</Text>
          </Group>
        </Box>

        <Divider color="#333" />

        {/* Circuit Depth */}
        <Group justify="space-between">
          <Group gap={4}>
            <IconCpu size={14} color="#888" />
            <Text size="xs" c="#888">Circuit Depth</Text>
          </Group>
          <Text size="sm" c="white" fw={600}>{estimate?.circuit_depth || 0}</Text>
        </Group>

        <Divider color="#333" />

        {/* Estimated Runtime */}
        <Group justify="space-between">
          <Group gap={4}>
            <IconClock size={14} color="#888" />
            <Text size="xs" c="#888">Est. Runtime</Text>
          </Group>
          <Text size="sm" c="white" fw={600}>
            {formatTime(estimate?.estimated_time_ns || 0)}
          </Text>
        </Group>

        <Divider color="#333" />

        {/* Estimated Fidelity */}
        <Box>
          <Group justify="space-between" mb={4}>
            <Group gap={4}>
              <IconTarget size={14} color="#888" />
              <Text size="xs" c="#888">Est. Fidelity</Text>
            </Group>
            <Text size="sm" c={getFidelityColor(estimate?.estimated_fidelity || 1)} fw={600}>
              {((estimate?.estimated_fidelity || 1) * 100).toFixed(1)}%
            </Text>
          </Group>
          <Progress 
            value={(estimate?.estimated_fidelity || 1) * 100} 
            color={getFidelityColor(estimate?.estimated_fidelity || 1)}
            size="sm"
            radius="xl"
          />
        </Box>

        <Divider color="#333" />

        {/* Qubit Usage */}
        <Box>
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="#888">Qubit Usage</Text>
            <Text size="xs" c="#aaa">{numQubits} / {backend.includes('ibm') ? 127 : backend.includes('ionq') ? 25 : 80}</Text>
          </Group>
          <Progress 
            value={(numQubits / (backend.includes('ibm') ? 127 : backend.includes('ionq') ? 25 : 80)) * 100} 
            color="blue"
            size="xs"
            radius="xl"
          />
        </Box>
      </Stack>

      {/* Hardware Info */}
      <Box mt="lg" pt="md" style={{ borderTop: '1px solid #333' }}>
        <Text size="xs" c="dimmed" mb={4}>Hardware Notes</Text>
        {backend === 'ibm_brisbane' && (
          <Text size="xs" c="#666">
            Superconducting • Heavy-hex topology • T1≈200μs • 2Q error≈1%
          </Text>
        )}
        {backend === 'ionq_aria' && (
          <Text size="xs" c="#666">
            Trapped ion • All-to-all connectivity • T1≈10s • 2Q error≈0.5%
          </Text>
        )}
        {backend === 'rigetti_aspen' && (
          <Text size="xs" c="#666">
            Superconducting • Octagonal lattice • T1≈30μs • 2Q error≈2%
          </Text>
        )}
      </Box>
    </Box>
  );
}
