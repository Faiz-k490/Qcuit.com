// In frontend/src/hooks/useCircuitValidator.ts
import { useState, useEffect } from 'react';
import { CircuitState, PendingGate } from '../types';

export function useCircuitValidator(
  circuitState: CircuitState,
  pendingGate: PendingGate | null
): string[] {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const newErrors: string[] = [];
    const occupiedSlots = new Set<string>(); // Tracks "q_index-timestep"

    // 1. Check for incomplete gate placement
    if (pendingGate) {
      newErrors.push(
        `Gate placement incomplete. Click a target slot for the ${pendingGate.gateType} gate.`
      );
    }

    // 2. Check for single-qubit gate collisions
    for (const slotKey in circuitState.gates) {
      occupiedSlots.add(slotKey);
    }

    // 3. Check multi-qubit gates
    for (const gate of circuitState.multiQubitGates) {
      const t = gate.timestep;

      // Check for identical control/target
      const allQubits = [...gate.controls, ...gate.targets];
      const uniqueQubits = new Set(allQubits);
      if (uniqueQubits.size < allQubits.length) {
        newErrors.push(
          `Invalid ${gate.gateType} at t=${t}: Gate has identical control and target qubits.`
        );
      }

      // Check for collisions
      for (const q of allQubits) {
        const key = `q_${q}-${t}`;
        if (occupiedSlots.has(key)) {
          newErrors.push(
            `Collision at (q=${q}, t=${t}): A single-qubit gate and multi-qubit gate are on the same slot.`
          );
        }
        occupiedSlots.add(key);
      }
    }

    // 4. Check measurement gates
    for (const gate of circuitState.measurements) {
      const t = gate.timestep;
      const q = gate.qubit;

      // Check for collisions on the qubit wire
      const key = `q_${q}-${t}`;
       if (occupiedSlots.has(key)) {
          newErrors.push(
            `Collision at (q=${q}, t=${t}): A gate and a measurement are on the same slot.`
          );
        }
        occupiedSlots.add(key);
      // TODO: Add check for classical bit collisions
    }

    setErrors(newErrors);
  }, [circuitState, pendingGate]); // Re-run validation on any change

  return errors;
}
