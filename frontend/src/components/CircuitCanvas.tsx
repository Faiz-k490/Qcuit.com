import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect, Text, Group, Circle } from 'react-konva';
import Konva from 'konva';
import { useCircuit } from '../store/CircuitContext';
import { GateInstance, MultiQubitGateInstance, Measurement } from '../types';
import {
  SLOT_SIZE,
  WIRE_PADDING,
  SLOT_CENTER,
  GATE_SIZE,
  GATE_RADIUS,
  CONTROL_RADIUS,
} from '../gridConstants';

// Snap position to grid
function snapToGrid(x: number, y: number): { qubit: number; timestep: number } {
  const timestep = Math.round((x - WIRE_PADDING) / SLOT_SIZE);
  const qubit = Math.round(y / SLOT_SIZE);
  return { qubit: Math.max(0, qubit), timestep: Math.max(0, timestep) };
}

// Get pixel position from grid coordinates
function gridToPixel(qubit: number, timestep: number): { x: number; y: number } {
  return {
    x: WIRE_PADDING + timestep * SLOT_SIZE + (SLOT_SIZE - GATE_SIZE) / 2,
    y: qubit * SLOT_SIZE + (SLOT_SIZE - GATE_SIZE) / 2,
  };
}

// Draggable Gate component
interface DraggableGateProps {
  gate: GateInstance;
  onDragEnd: (gateId: string, newQubit: number, newTimestep: number) => void;
  onDelete: (gateId: string) => void;
  numQubits: number;
  numTimesteps: number;
}

function DraggableGate({ gate, onDragEnd, onDelete, numQubits, numTimesteps }: DraggableGateProps) {
  const { x, y } = gridToPixel(gate.qubit, gate.timestep);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    const node = e.target;
    const { qubit, timestep } = snapToGrid(
      node.x() + GATE_SIZE / 2,
      node.y() + GATE_SIZE / 2
    );
    // Clamp to valid range
    const clampedQubit = Math.max(0, Math.min(numQubits - 1, qubit));
    const clampedTimestep = Math.max(0, Math.min(numTimesteps - 1, timestep));
    
    // Snap back to grid position
    const snapped = gridToPixel(clampedQubit, clampedTimestep);
    node.position({ x: snapped.x, y: snapped.y });
    
    onDragEnd(gate.id, clampedQubit, clampedTimestep);
  };

  const handleDblClick = () => {
    onDelete(gate.id);
  };

  // Display theta for parametric gates
  const displayText = gate.theta !== undefined 
    ? `${gate.gateType}\n${gate.theta.toFixed(2)}`
    : gate.gateType;

  return (
    <Group
      x={x}
      y={y}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDblClick={handleDblClick}
      opacity={isDragging ? 0.7 : 1}
    >
      <Rect
        width={GATE_SIZE}
        height={GATE_SIZE}
        fill={isDragging ? '#555' : '#3e3e3e'}
        stroke={isDragging ? '#aaa' : '#888'}
        strokeWidth={1}
        cornerRadius={GATE_RADIUS}
        shadowColor={isDragging ? '#000' : undefined}
        shadowBlur={isDragging ? 10 : 0}
        shadowOpacity={0.5}
      />
      <Text
        text={displayText}
        width={GATE_SIZE}
        height={GATE_SIZE}
        align="center"
        verticalAlign="middle"
        fill="white"
        fontSize={gate.theta !== undefined ? 10 : 14}
        fontStyle="bold"
      />
    </Group>
  );
}

// Multi-qubit gate visual (CNOT, CZ, SWAP, CCNOT)
interface MultiGateVisualProps {
  gate: MultiQubitGateInstance;
  onDelete: (gateId: string) => void;
}

function MultiGateVisual({ gate, onDelete }: MultiGateVisualProps) {
  const allQubits = [...gate.controls, ...gate.targets].sort((a, b) => a - b);
  const lineX = WIRE_PADDING + gate.timestep * SLOT_SIZE + SLOT_CENTER;
  const yStart = allQubits[0] * SLOT_SIZE + SLOT_CENTER;
  const yEnd = allQubits[allQubits.length - 1] * SLOT_SIZE + SLOT_CENTER;

  const handleDblClick = () => {
    onDelete(gate.id);
  };

  return (
    <Group onDblClick={handleDblClick}>
      {/* Vertical connecting line */}
      <Line points={[lineX, yStart, lineX, yEnd]} stroke="#5599ff" strokeWidth={2} />

      {/* Control dots */}
      {gate.controls.map((q, idx) => (
        <Circle
          key={`ctrl-${idx}`}
          x={lineX}
          y={q * SLOT_SIZE + SLOT_CENTER}
          radius={CONTROL_RADIUS}
          fill="#5599ff"
        />
      ))}

      {/* Target symbols */}
      {gate.targets.map((q, idx) => {
        const y = q * SLOT_SIZE + SLOT_CENTER;

        if (gate.gateType === 'CNOT' || gate.gateType === 'CCNOT') {
          // Circle-plus (XOR) target
          return (
            <Group key={`tgt-${idx}`} x={lineX} y={y}>
              <Circle radius={CONTROL_RADIUS * 2} fill="#5599ff" />
              <Line points={[-10, 0, 10, 0]} stroke="white" strokeWidth={3} />
              <Line points={[0, -10, 0, 10]} stroke="white" strokeWidth={3} />
            </Group>
          );
        }

        if (gate.gateType === 'CZ') {
          // Solid dot for both control and target
          return (
            <Circle
              key={`tgt-${idx}`}
              x={lineX}
              y={y}
              radius={CONTROL_RADIUS}
              fill="#5599ff"
            />
          );
        }

        if (gate.gateType === 'SWAP') {
          // X symbol for SWAP
          const size = CONTROL_RADIUS * 1.5;
          return (
            <Group key={`tgt-${idx}`} x={lineX} y={y}>
              <Line points={[-size, -size, size, size]} stroke="#5599ff" strokeWidth={3} />
              <Line points={[-size, size, size, -size]} stroke="#5599ff" strokeWidth={3} />
            </Group>
          );
        }

        return null;
      })}
    </Group>
  );
}

// Measurement visual
interface MeasurementVisualProps {
  measurement: Measurement;
  numQubits: number;
  onDelete: (measurementId: string) => void;
}

function MeasurementVisual({ measurement, numQubits, onDelete }: MeasurementVisualProps) {
  const { x, y } = gridToPixel(measurement.qubit, measurement.timestep);
  const lineX = WIRE_PADDING + measurement.timestep * SLOT_SIZE + SLOT_CENTER;
  const qubitY = measurement.qubit * SLOT_SIZE + SLOT_CENTER;
  const classicalY = (measurement.classicalBit + numQubits + 1) * SLOT_SIZE + SLOT_CENTER;

  const handleDblClick = () => {
    onDelete(measurement.id);
  };

  return (
    <Group onDblClick={handleDblClick}>
      {/* Measurement box */}
      <Rect
        x={x}
        y={y}
        width={GATE_SIZE}
        height={GATE_SIZE}
        fill="#3e3e3e"
        stroke="#888"
        strokeWidth={1}
        cornerRadius={GATE_RADIUS}
      />
      <Text
        x={x}
        y={y}
        text="M"
        width={GATE_SIZE}
        height={GATE_SIZE}
        align="center"
        verticalAlign="middle"
        fill="white"
        fontSize={14}
        fontStyle="bold"
      />
      {/* Arrow to classical wire */}
      <Line
        points={[lineX, qubitY + GATE_SIZE / 2, lineX, classicalY - 8]}
        stroke="#aaaaff"
        strokeWidth={2}
      />
      {/* Arrowhead */}
      <Line
        points={[lineX - 4, classicalY - 8, lineX, classicalY, lineX + 4, classicalY - 8]}
        stroke="#aaaaff"
        strokeWidth={2}
        closed
        fill="#aaaaff"
      />
    </Group>
  );
}

// Palette gate for dragging onto canvas
interface PaletteGateProps {
  gateType: string;
  x: number;
  y: number;
  onDragEnd: (gateType: string, x: number, y: number) => void;
}

function PaletteGate({ gateType, x, y, onDragEnd }: PaletteGateProps) {
  const nodeRef = useRef<Konva.Group>(null);
  const startPosRef = useRef({ x, y });

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const endX = node.x() + GATE_SIZE / 2;
    const endY = node.y() + GATE_SIZE / 2;
    
    // Reset position back to palette
    node.position(startPosRef.current);
    
    onDragEnd(gateType, endX, endY);
  };

  return (
    <Group ref={nodeRef} x={x} y={y} draggable onDragEnd={handleDragEnd}>
      <Rect
        width={GATE_SIZE}
        height={GATE_SIZE}
        fill="#2e2e2e"
        stroke="#666"
        strokeWidth={1}
        cornerRadius={GATE_RADIUS}
      />
      <Text
        text={gateType}
        width={GATE_SIZE}
        height={GATE_SIZE}
        align="center"
        verticalAlign="middle"
        fill="white"
        fontSize={12}
        fontStyle="bold"
      />
    </Group>
  );
}

// Main Circuit Canvas component
export function CircuitCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  const {
    state,
    addGate,
    moveGate,
    deleteGate,
    deleteMultiGate,
    deleteMeasurement,
  } = useCircuit();

  const { numQubits, numClassical, numTimesteps, gates, multiQubitGates, measurements } = state;

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calculate canvas dimensions based on circuit size
  const totalRows = numQubits + 1 + numClassical;
  const canvasWidth = Math.max(dimensions.width, WIRE_PADDING + numTimesteps * SLOT_SIZE + 50);
  const canvasHeight = Math.max(dimensions.height, totalRows * SLOT_SIZE + 50);

  // Handle gate drag end (from palette)
  const handlePaletteDragEnd = useCallback((gateType: string, x: number, y: number) => {
    // Check if dropped on valid canvas area
    if (x < WIRE_PADDING || y < 0) return;
    
    const { qubit, timestep } = snapToGrid(x, y);
    
    // Validate bounds
    if (qubit < 0 || qubit >= numQubits || timestep < 0 || timestep >= numTimesteps) {
      return;
    }

    // Simple gates
    const simpleGates = ['H', 'X', 'Y', 'Z', 'S', 'T', 'SDG', 'TDG'];
    if (simpleGates.includes(gateType)) {
      addGate({ gateType, qubit, timestep });
    }
    // TODO: Handle parametric gates (RX, RY, RZ) with modal
    // TODO: Handle multi-qubit gates (CNOT, CZ, SWAP, CCNOT) with multi-step placement
  }, [addGate, numQubits, numTimesteps]);

  // Handle gate move (existing gate dragged to new position)
  const handleGateDragEnd = useCallback((gateId: string, newQubit: number, newTimestep: number) => {
    moveGate(gateId, newQubit, newTimestep);
  }, [moveGate]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        backgroundColor: '#1e1e1e',
      }}
    >
      <Stage width={canvasWidth} height={canvasHeight}>
        {/* Layer 1: Wires (static, cached for performance) */}
        <Layer listening={false}>
          {/* Qubit wires */}
          {Array.from({ length: numQubits }, (_, q) => (
            <React.Fragment key={`qubit-${q}`}>
              <Line
                points={[
                  WIRE_PADDING,
                  q * SLOT_SIZE + SLOT_CENTER,
                  canvasWidth,
                  q * SLOT_SIZE + SLOT_CENTER,
                ]}
                stroke="#555"
                strokeWidth={2}
              />
              <Text
                x={5}
                y={q * SLOT_SIZE + SLOT_CENTER - 6}
                text={`q[${q}]`}
                fill="#aaa"
                fontSize={12}
              />
            </React.Fragment>
          ))}

          {/* Classical wires (double line) */}
          {Array.from({ length: numClassical }, (_, c) => {
            const y = (numQubits + 1 + c) * SLOT_SIZE + SLOT_CENTER;
            return (
              <React.Fragment key={`classical-${c}`}>
                <Line points={[WIRE_PADDING, y - 2, canvasWidth, y - 2]} stroke="#555" strokeWidth={1} />
                <Line points={[WIRE_PADDING, y + 2, canvasWidth, y + 2]} stroke="#555" strokeWidth={1} />
                <Text x={5} y={y - 6} text={`c[${c}]`} fill="#aaa" fontSize={12} />
              </React.Fragment>
            );
          })}
        </Layer>

        {/* Layer 2: Multi-qubit gates and measurements */}
        <Layer>
          {multiQubitGates.map((gate) => (
            <MultiGateVisual key={gate.id} gate={gate} onDelete={deleteMultiGate} />
          ))}
          {measurements.map((m) => (
            <MeasurementVisual
              key={m.id}
              measurement={m}
              numQubits={numQubits}
              onDelete={deleteMeasurement}
            />
          ))}
        </Layer>

        {/* Layer 3: Single-qubit gates (draggable) */}
        <Layer>
          {Object.values(gates).map((gate) => (
            <DraggableGate
              key={gate.id}
              gate={gate}
              onDragEnd={handleGateDragEnd}
              onDelete={deleteGate}
              numQubits={numQubits}
              numTimesteps={numTimesteps}
            />
          ))}
        </Layer>

        {/* Layer 4: Gate palette (on the left side) */}
        <Layer>
          <Rect x={0} y={0} width={WIRE_PADDING - 5} height={canvasHeight} fill="#252525" />
          <Text x={5} y={canvasHeight - 200} text="Drag gates:" fill="#888" fontSize={10} />
          {['H', 'X', 'Y', 'Z'].map((gateType, idx) => (
            <PaletteGate
              key={gateType}
              gateType={gateType}
              x={5}
              y={canvasHeight - 180 + idx * (GATE_SIZE + 5)}
              onDragEnd={handlePaletteDragEnd}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
