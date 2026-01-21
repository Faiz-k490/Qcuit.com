import React, { createContext, useContext, useReducer, useCallback, ReactNode, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CircuitState, GateInstance, MultiQubitGateInstance, Measurement, SimulationResult } from '../types';

// Action types
type CircuitAction =
  | { type: 'SET_NUM_QUBITS'; payload: number }
  | { type: 'ADD_QUBIT' }
  | { type: 'REMOVE_QUBIT' }
  | { type: 'ADD_GATE'; payload: GateInstance }
  | { type: 'MOVE_GATE'; payload: { gateId: string; newQubit: number; newTimestep: number } }
  | { type: 'DELETE_GATE'; payload: string }
  | { type: 'UPDATE_GATE'; payload: { gateId: string; updates: Partial<GateInstance> } }
  | { type: 'ADD_MULTI_GATE'; payload: MultiQubitGateInstance }
  | { type: 'DELETE_MULTI_GATE'; payload: string }
  | { type: 'ADD_MEASUREMENT'; payload: Measurement }
  | { type: 'DELETE_MEASUREMENT'; payload: string }
  | { type: 'SET_NOISE_LEVEL'; payload: number }
  | { type: 'CLEAR_CIRCUIT' }
  | { type: 'LOAD_CIRCUIT'; payload: CircuitState };

// Initial state
const initialState: CircuitState = {
  numQubits: 5,
  numClassical: 5,
  numTimesteps: 20,
  gates: {},
  multiQubitGates: [],
  measurements: [],
  noiseLevel: 0.0,
};

// Reducer
function circuitReducer(state: CircuitState, action: CircuitAction): CircuitState {
  switch (action.type) {
    case 'SET_NUM_QUBITS': {
      const newNumQubits = Math.max(1, Math.min(20, action.payload));
      return {
        ...state,
        numQubits: newNumQubits,
        numClassical: newNumQubits,
      };
    }

    case 'ADD_QUBIT': {
      if (state.numQubits >= 20) return state;
      return {
        ...state,
        numQubits: state.numQubits + 1,
        numClassical: state.numClassical + 1,
      };
    }

    case 'REMOVE_QUBIT': {
      if (state.numQubits <= 1) return state;
      const newNumQubits = state.numQubits - 1;
      // Remove gates on the removed qubit
      const newGates: Record<string, GateInstance> = {};
      Object.entries(state.gates).forEach(([key, gate]) => {
        if (gate.qubit < newNumQubits) {
          newGates[key] = gate;
        }
      });
      // Remove multi-qubit gates that involve the removed qubit
      const newMultiGates = state.multiQubitGates.filter(
        (g) => ![...g.controls, ...g.targets].some((q) => q >= newNumQubits)
      );
      // Remove measurements on the removed qubit
      const newMeasurements = state.measurements.filter(
        (m) => m.qubit < newNumQubits && m.classicalBit < newNumQubits
      );
      return {
        ...state,
        numQubits: newNumQubits,
        numClassical: newNumQubits,
        gates: newGates,
        multiQubitGates: newMultiGates,
        measurements: newMeasurements,
      };
    }

    case 'ADD_GATE': {
      const gate = action.payload;
      const slotKey = `q_${gate.qubit}-${gate.timestep}`;
      // Don't overwrite existing gate
      if (state.gates[slotKey]) return state;
      return {
        ...state,
        gates: { ...state.gates, [slotKey]: gate },
      };
    }

    case 'MOVE_GATE': {
      const { gateId, newQubit, newTimestep } = action.payload;
      // Find the gate by ID
      const oldEntry = Object.entries(state.gates).find(([_, g]) => g.id === gateId);
      if (!oldEntry) return state;
      const [oldKey, gate] = oldEntry;
      const newKey = `q_${newQubit}-${newTimestep}`;
      // If moving to same position, no change
      if (oldKey === newKey) return state;
      // If target slot is occupied, don't move
      if (state.gates[newKey]) return state;
      // Remove from old position, add to new
      const { [oldKey]: _, ...restGates } = state.gates;
      return {
        ...state,
        gates: {
          ...restGates,
          [newKey]: { ...gate, qubit: newQubit, timestep: newTimestep },
        },
      };
    }

    case 'DELETE_GATE': {
      const gateId = action.payload;
      const newGates: Record<string, GateInstance> = {};
      Object.entries(state.gates).forEach(([key, gate]) => {
        if (gate.id !== gateId) {
          newGates[key] = gate;
        }
      });
      return { ...state, gates: newGates };
    }

    case 'UPDATE_GATE': {
      const { gateId, updates } = action.payload;
      const newGates: Record<string, GateInstance> = {};
      Object.entries(state.gates).forEach(([key, gate]) => {
        if (gate.id === gateId) {
          newGates[key] = { ...gate, ...updates };
        } else {
          newGates[key] = gate;
        }
      });
      return { ...state, gates: newGates };
    }

    case 'ADD_MULTI_GATE': {
      return {
        ...state,
        multiQubitGates: [...state.multiQubitGates, action.payload],
      };
    }

    case 'DELETE_MULTI_GATE': {
      return {
        ...state,
        multiQubitGates: state.multiQubitGates.filter((g) => g.id !== action.payload),
      };
    }

    case 'ADD_MEASUREMENT': {
      return {
        ...state,
        measurements: [...state.measurements, action.payload],
      };
    }

    case 'DELETE_MEASUREMENT': {
      return {
        ...state,
        measurements: state.measurements.filter((m) => m.id !== action.payload),
      };
    }

    case 'SET_NOISE_LEVEL': {
      return { ...state, noiseLevel: action.payload };
    }

    case 'CLEAR_CIRCUIT': {
      return {
        ...state,
        gates: {},
        multiQubitGates: [],
        measurements: [],
      };
    }

    case 'LOAD_CIRCUIT': {
      return action.payload;
    }

    default:
      return state;
  }
}

// Context types
interface CircuitContextType {
  state: CircuitState;
  results: SimulationResult | null;
  isSimulating: boolean;
  // Actions
  addQubit: () => void;
  removeQubit: () => void;
  setNumQubits: (n: number) => void;
  addGate: (gate: Omit<GateInstance, 'id'>) => void;
  moveGate: (gateId: string, newQubit: number, newTimestep: number) => void;
  deleteGate: (gateId: string) => void;
  updateGate: (gateId: string, updates: Partial<GateInstance>) => void;
  addMultiGate: (gate: Omit<MultiQubitGateInstance, 'id'>) => void;
  deleteMultiGate: (gateId: string) => void;
  addMeasurement: (measurement: Omit<Measurement, 'id'>) => void;
  deleteMeasurement: (measurementId: string) => void;
  setNoiseLevel: (level: number) => void;
  clearCircuit: () => void;
  loadCircuit: (circuit: CircuitState) => void;
  runCircuit: () => Promise<void>;
  setResults: (results: SimulationResult | null) => void;
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const CircuitContext = createContext<CircuitContextType | null>(null);

const MAX_HISTORY = 50;

// Provider component
export function CircuitProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(circuitReducer, initialState);
  const [results, setResults] = React.useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = React.useState(false);
  
  // Undo/Redo history
  const historyRef = useRef<CircuitState[]>([initialState]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const skipHistoryRef = useRef(false);

  // Save state to history after each action
  const saveToHistory = useCallback((newState: CircuitState) => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    // Truncate any future history if we're not at the end
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(newState);
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      historyIndexRef.current++;
    }
    historyRef.current = newHistory;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Track state changes for history
  React.useEffect(() => {
    saveToHistory(state);
  }, [state, saveToHistory]);

  const addQubit = useCallback(() => {
    dispatch({ type: 'ADD_QUBIT' });
  }, []);

  const removeQubit = useCallback(() => {
    dispatch({ type: 'REMOVE_QUBIT' });
  }, []);

  const setNumQubits = useCallback((n: number) => {
    dispatch({ type: 'SET_NUM_QUBITS', payload: n });
  }, []);

  const addGate = useCallback((gate: Omit<GateInstance, 'id'>) => {
    dispatch({ type: 'ADD_GATE', payload: { ...gate, id: uuidv4() } });
  }, []);

  const moveGate = useCallback((gateId: string, newQubit: number, newTimestep: number) => {
    dispatch({ type: 'MOVE_GATE', payload: { gateId, newQubit, newTimestep } });
  }, []);

  const deleteGate = useCallback((gateId: string) => {
    dispatch({ type: 'DELETE_GATE', payload: gateId });
  }, []);

  const updateGate = useCallback((gateId: string, updates: Partial<GateInstance>) => {
    dispatch({ type: 'UPDATE_GATE', payload: { gateId, updates } });
  }, []);

  const addMultiGate = useCallback((gate: Omit<MultiQubitGateInstance, 'id'>) => {
    dispatch({ type: 'ADD_MULTI_GATE', payload: { ...gate, id: uuidv4() } });
  }, []);

  const deleteMultiGate = useCallback((gateId: string) => {
    dispatch({ type: 'DELETE_MULTI_GATE', payload: gateId });
  }, []);

  const addMeasurement = useCallback((measurement: Omit<Measurement, 'id'>) => {
    dispatch({ type: 'ADD_MEASUREMENT', payload: { ...measurement, id: uuidv4() } });
  }, []);

  const deleteMeasurement = useCallback((measurementId: string) => {
    dispatch({ type: 'DELETE_MEASUREMENT', payload: measurementId });
  }, []);

  const setNoiseLevel = useCallback((level: number) => {
    dispatch({ type: 'SET_NOISE_LEVEL', payload: level });
  }, []);

  const clearCircuit = useCallback(() => {
    dispatch({ type: 'CLEAR_CIRCUIT' });
  }, []);

  const loadCircuit = useCallback((circuit: CircuitState) => {
    dispatch({ type: 'LOAD_CIRCUIT', payload: circuit });
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      skipHistoryRef.current = true;
      dispatch({ type: 'LOAD_CIRCUIT', payload: historyRef.current[historyIndexRef.current] });
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      skipHistoryRef.current = true;
      dispatch({ type: 'LOAD_CIRCUIT', payload: historyRef.current[historyIndexRef.current] });
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, []);

  // Run simulation via Flask backend
  const runCircuit = useCallback(async () => {
    setIsSimulating(true);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `HTTP error! status: ${response.status}`);
      }

      const data: SimulationResult = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Simulation failed:', error);
      throw error;
    } finally {
      setIsSimulating(false);
    }
  }, [state]);

  const value: CircuitContextType = {
    state,
    results,
    isSimulating,
    addQubit,
    removeQubit,
    setNumQubits,
    addGate,
    moveGate,
    deleteGate,
    updateGate,
    addMultiGate,
    deleteMultiGate,
    addMeasurement,
    deleteMeasurement,
    setNoiseLevel,
    clearCircuit,
    loadCircuit,
    runCircuit,
    setResults,
    undo,
    redo,
    canUndo,
    canRedo,
  };

  return <CircuitContext.Provider value={value}>{children}</CircuitContext.Provider>;
}

// Hook to use the circuit context
export function useCircuit() {
  const context = useContext(CircuitContext);
  if (!context) {
    throw new Error('useCircuit must be used within a CircuitProvider');
  }
  return context;
}
