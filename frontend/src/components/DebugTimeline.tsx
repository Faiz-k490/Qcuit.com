/**
 * Debugging Timeline Component
 * 
 * Shows state snapshots at each timestep for debugging circuits.
 * Uses keyframe logic - stores every Nth step and recomputes on demand.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Group, Slider, Badge, Stack, Button, Tooltip } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconPlayerSkipBack, IconPlayerSkipForward } from '@tabler/icons-react';

interface StateSnapshot {
  timestep: number;
  probabilities: Record<string, number>;
  gatesApplied: string[];
}

interface DebugTimelineProps {
  numQubits: number;
  gates: Record<string, any>;
  multiQubitGates: any[];
  maxTimestep: number;
}

export function DebugTimeline({ numQubits, gates, multiQubitGates, maxTimestep }: DebugTimelineProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [snapshots, setSnapshots] = useState<StateSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch snapshots from backend
  const fetchSnapshots = useCallback(async () => {
    if (maxTimestep === 0) {
      setSnapshots([]);
      return;
    }

    setLoading(true);
    try {
      // Build circuit steps up to each timestep
      const allOps = [
        ...Object.values(gates),
        ...multiQubitGates,
      ].sort((a: any, b: any) => a.timestep - b.timestep);

      const newSnapshots: StateSnapshot[] = [];
      
      // Get initial state
      const initialResponse = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numQubits,
          numClassical: numQubits,
          gates: {},
          multiQubitGates: [],
          measurements: [],
          noiseLevel: 0,
        }),
      });
      
      if (initialResponse.ok) {
        const data = await initialResponse.json();
        newSnapshots.push({
          timestep: 0,
          probabilities: data.probabilities,
          gatesApplied: [],
        });
      }

      // Get state after each timestep (keyframe every 2 steps for performance)
      for (let t = 1; t <= Math.min(maxTimestep, 10); t++) {
        const opsUpToT = allOps.filter((op: any) => op.timestep < t);
        const gatesDict: Record<string, any> = {};
        const multiGates: any[] = [];
        
        opsUpToT.forEach((op: any) => {
          if (op.controls !== undefined) {
            multiGates.push(op);
          } else {
            gatesDict[`q_${op.qubit}-${op.timestep}`] = op;
          }
        });

        const response = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numQubits,
            numClassical: numQubits,
            gates: gatesDict,
            multiQubitGates: multiGates,
            measurements: [],
            noiseLevel: 0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const gateNames = opsUpToT.map((op: any) => op.gateType);
          newSnapshots.push({
            timestep: t,
            probabilities: data.probabilities,
            gatesApplied: gateNames,
          });
        }
      }

      setSnapshots(newSnapshots);
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    } finally {
      setLoading(false);
    }
  }, [numQubits, gates, multiQubitGates, maxTimestep]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= snapshots.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, snapshots.length]);

  const currentSnapshot = snapshots[currentStep];
  const topStates = currentSnapshot
    ? Object.entries(currentSnapshot.probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];

  return (
    <Box style={{ height: '100%', backgroundColor: '#1a1a2e', padding: 12, overflowY: 'auto' }}>
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={600} c="white">Debug Timeline</Text>
        <Badge variant="light" color={loading ? 'yellow' : 'blue'} size="xs">
          {loading ? 'Loading...' : `${snapshots.length} steps`}
        </Badge>
      </Group>

      <Button 
        size="xs" 
        variant="light" 
        onClick={fetchSnapshots} 
        loading={loading}
        fullWidth
        mb="sm"
      >
        Compute Timeline
      </Button>

      {snapshots.length > 0 && (
        <>
          {/* Playback controls */}
          <Group justify="center" mb="sm">
            <Tooltip label="Reset">
              <Button variant="subtle" size="xs" onClick={() => setCurrentStep(0)}>
                <IconPlayerSkipBack size={14} />
              </Button>
            </Tooltip>
            <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
              <Button 
                variant="subtle" 
                size="xs" 
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
              </Button>
            </Tooltip>
            <Tooltip label="Next">
              <Button 
                variant="subtle" 
                size="xs" 
                onClick={() => setCurrentStep(Math.min(currentStep + 1, snapshots.length - 1))}
              >
                <IconPlayerSkipForward size={14} />
              </Button>
            </Tooltip>
          </Group>

          {/* Timeline slider */}
          <Box mb="md">
            <Slider
              value={currentStep}
              onChange={setCurrentStep}
              min={0}
              max={snapshots.length - 1}
              step={1}
              marks={snapshots.map((_, i) => ({ value: i, label: `${i}` }))}
              size="sm"
              color="blue"
            />
          </Box>

          {/* Current state display */}
          <Box style={{ backgroundColor: '#2a2a4e', borderRadius: 8, padding: 12 }}>
            <Text size="xs" c="dimmed" mb={4}>
              Timestep {currentSnapshot?.timestep || 0}
            </Text>
            
            {currentSnapshot?.gatesApplied.length ? (
              <Text size="xs" c="#888" mb="sm">
                Gates: {currentSnapshot.gatesApplied.join(', ')}
              </Text>
            ) : (
              <Text size="xs" c="#666" mb="sm">Initial state |0...0⟩</Text>
            )}

            <Text size="xs" c="dimmed" mb={4}>Top States:</Text>
            <Stack gap={4}>
              {topStates.map(([state, prob]) => (
                <Group key={state} justify="space-between">
                  <Text size="xs" c="#8899bb" ff="monospace">|{state}⟩</Text>
                  <Group gap={4}>
                    <Box 
                      style={{ 
                        width: 60, 
                        height: 6, 
                        backgroundColor: '#1a1a2e',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}
                    >
                      <Box 
                        style={{ 
                          width: `${prob * 100}%`, 
                          height: '100%',
                          backgroundColor: '#42a5f5',
                          borderRadius: 3,
                        }} 
                      />
                    </Box>
                    <Text size="xs" c="white">{(prob * 100).toFixed(1)}%</Text>
                  </Group>
                </Group>
              ))}
            </Stack>
          </Box>
        </>
      )}

      {snapshots.length === 0 && !loading && (
        <Text size="xs" c="dimmed" ta="center" mt="lg">
          Click "Compute Timeline" to see state evolution at each timestep.
        </Text>
      )}
    </Box>
  );
}
