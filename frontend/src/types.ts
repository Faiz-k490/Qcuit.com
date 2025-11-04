// In frontend/src/types.ts
export interface GateInstance {
  id: string; // Unique ID (from uuidv4)
  gateType: string; // 'H', 'X', 'RX', etc.
  qubit: number; // The primary qubit wire index
  timestep: number;
  theta?: number; // For parametric gates
}

export interface MultiQubitGateInstance {
  id: string;
  gateType: string; // 'CNOT', 'SWAP', 'CZ', 'CCNOT'
  timestep: number;
  controls: number[]; // List of control qubit indices
  targets: number[]; // List of target qubit indices
}

export interface Measurement {
  id: string;
  qubit: number; // Qubit index
  classicalBit: number; // Classical bit index
  timestep: number;
  gateType: 'MEASUREMENT'; // Differentiator
}

export interface CircuitState {
  numQubits: number;
  numClassical: number;
  numTimesteps: number;
  // Use an object/Record for O(1) lookups by coordinate
  gates: Record<string, GateInstance>; // Key: "q_index-timestep"
  multiQubitGates: MultiQubitGateInstance[];
  measurements: Measurement[];
  noiseLevel: number;
}

// Type for the drag-and-drop 'active' object
export interface DraggingGate {
  gateType: string;
}

// Type for pending multi-qubit gates
export interface PendingGate {
  gateType: string;
  control: number;
  timestep: number;
}

// Type for the backend's simulation response
export interface SimulationResult {
  probabilities: Record<string, number>;
  code: {
    qiskit: string;
    braket: string;
    openqasm: string;
  };
}
