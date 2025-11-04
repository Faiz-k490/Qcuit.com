// In frontend/src/components/CircuitGrid.tsx
import { useRef, useState, useEffect } from 'react';
import { Box } from '@mantine/core';
import { CircuitState, GateInstance, MultiQubitGateInstance, Measurement, PendingGate } from '../types';
import { DroppableSlot } from './DroppableSlot';
import {
  SLOT_SIZE,
  WIRE_PADDING,
  SLOT_CENTER,
  GATE_SIZE,
  GATE_RADIUS,
  CONTROL_RADIUS,
} from '../gridConstants';

// SVG component to render a single-qubit gate
function SvgGate({ gate, x, y }: { gate: GateInstance; x: number; y: number }) {
  const gateX = x + (SLOT_SIZE - GATE_SIZE) / 2;
  const gateY = y + (SLOT_SIZE - GATE_SIZE) / 2;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={gateX}
        y={gateY}
        width={GATE_SIZE}
        height={GATE_SIZE}
        fill="#3e3e3e"
        stroke="#888"
        strokeWidth={1}
        rx={GATE_RADIUS}
      />
      <text
        x={gateX + GATE_SIZE / 2}
        y={gateY + GATE_SIZE / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={14}
        fontWeight="bold"
      >
        {gate.gateType}
      </text>
    </g>
  );
}

// SVG component to render connecting line for multi-qubit gates
function SvgMultiGateLine({ gate, x }: { gate: MultiQubitGateInstance; x: number }) {
  const allQubits = [...gate.controls, ...gate.targets].sort((a, b) => a - b);
  const minQubit = allQubits[0];
  const maxQubit = allQubits[allQubits.length - 1];

  const lineX = x + SLOT_CENTER;
  const y1 = minQubit * SLOT_SIZE + SLOT_CENTER;
  const y2 = maxQubit * SLOT_SIZE + SLOT_CENTER;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Vertical connecting line */}
      <line x1={lineX} y1={y1} x2={lineX} y2={y2} stroke="#888" strokeWidth={2} />

      {/* Control dots */}
      {gate.controls.map((q, idx) => (
        <circle
          key={`control-${idx}`}
          cx={lineX}
          cy={q * SLOT_SIZE + SLOT_CENTER}
          r={CONTROL_RADIUS}
          fill="white"
        />
      ))}

      {/* Target boxes */}
      {gate.targets.map((q, idx) => {
        const targetX = x + (SLOT_SIZE - GATE_SIZE) / 2;
        const targetY = q * SLOT_SIZE + (SLOT_SIZE - GATE_SIZE) / 2;
        return (
          <g key={`target-${idx}`}>
            <rect
              x={targetX}
              y={targetY}
              width={GATE_SIZE}
              height={GATE_SIZE}
              fill="#3e3e3e"
              stroke="#888"
              strokeWidth={1}
              rx={GATE_RADIUS}
            />
            <text
              x={targetX + GATE_SIZE / 2}
              y={targetY + GATE_SIZE / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={14}
              fontWeight="bold"
            >
              {gate.gateType === 'CNOT' ? 'X' : gate.gateType === 'CZ' ? 'Z' : gate.gateType}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// SVG component to render measurement arrow
function SvgMeasurementLine({ gate, x, numQubits }: { gate: Measurement; x: number; numQubits: number }) {
  const qubitY = gate.qubit * SLOT_SIZE + SLOT_CENTER;
  const classicalY = (gate.classicalBit + numQubits + 1) * SLOT_SIZE + SLOT_CENTER;
  const lineX = x + SLOT_CENTER;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Measurement box on qubit wire */}
      <rect
        x={x + (SLOT_SIZE - GATE_SIZE) / 2}
        y={gate.qubit * SLOT_SIZE + (SLOT_SIZE - GATE_SIZE) / 2}
        width={GATE_SIZE}
        height={GATE_SIZE}
        fill="#3e3e3e"
        stroke="#888"
        strokeWidth={1}
        rx={GATE_RADIUS}
      />
      <text
        x={x + SLOT_CENTER}
        y={gate.qubit * SLOT_SIZE + SLOT_CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={14}
        fontWeight="bold"
      >
        M
      </text>

      {/* Arrow to classical wire */}
      <line x1={lineX} y1={qubitY + GATE_SIZE / 2} x2={lineX} y2={classicalY} stroke="#aaaaff" strokeWidth={2} />
      <polygon
        points={`${lineX},${classicalY} ${lineX - 4},${classicalY - 8} ${lineX + 4},${classicalY - 8}`}
        fill="#aaaaff"
      />
    </g>
  );
}

export function CircuitGrid({
  circuitState,
  onSlotClick,
  pendingGate,
  mousePosition,
}: {
  circuitState: CircuitState;
  onSlotClick: (id: string) => void;
  pendingGate: PendingGate | null;
  mousePosition: { x: number; y: number };
}) {
  const { numQubits, numClassical, numTimesteps, gates, multiQubitGates, measurements } =
    circuitState;

  const svgRef = useRef<SVGSVGElement>(null);
  const [svgOffset, setSvgOffset] = useState({ x: 0, y: 0 });

  // Effect to get SVG position
  useEffect(() => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setSvgOffset({ x: rect.left, y: rect.top });
    }
  }, [pendingGate]);

  const totalRows = numQubits + 1 + numClassical;
  const svgWidth = numTimesteps * SLOT_SIZE;
  const svgHeight = totalRows * SLOT_SIZE + WIRE_PADDING * 2;

  // Calculate ghost line coordinates
  let ghostLine = null;
  if (pendingGate && svgRef.current) {
    const startX = pendingGate.timestep * SLOT_SIZE + SLOT_CENTER;
    const startY = pendingGate.control * SLOT_SIZE + SLOT_CENTER;

    // Convert screen mouse coords to relative SVG coords
    const relativeMouseX = mousePosition.x - svgOffset.x;
    const relativeMouseY = mousePosition.y - svgOffset.y;

    ghostLine = (
      <line
        x1={startX}
        y1={startY}
        x2={relativeMouseX}
        y2={relativeMouseY}
        stroke="#999"
        strokeWidth={2}
        strokeDasharray="4 4"
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  return (
    <Box style={{ overflow: 'auto', height: '100%', backgroundColor: '#1e1e1e' }}>
      <svg ref={svgRef} width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
        {/* Define arrowhead marker */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <polygon points="0,0 10,5 0,10" fill="#aaaaff" />
          </marker>
        </defs>

        {/* Layer 1: Wires */}
        {Array.from({ length: numQubits }, (_, q) => (
          <line
            key={`qubit-wire-${q}`}
            x1={0}
            y1={q * SLOT_SIZE + SLOT_CENTER}
            x2={svgWidth}
            y2={q * SLOT_SIZE + SLOT_CENTER}
            stroke="#555"
            strokeWidth={2}
          />
        ))}

        {/* Classical wires (double line) */}
        {Array.from({ length: numClassical }, (_, c) => {
          const y = (numQubits + 1 + c) * SLOT_SIZE + SLOT_CENTER;
          return (
            <g key={`classical-wire-${c}`}>
              <line x1={0} y1={y - 2} x2={svgWidth} y2={y - 2} stroke="#555" strokeWidth={1} />
              <line x1={0} y1={y + 2} x2={svgWidth} y2={y + 2} stroke="#555" strokeWidth={1} />
            </g>
          );
        })}

        {/* Layer 2: Droppable Slots */}
        {Array.from({ length: numQubits + numClassical }, (_, row) => {
          const isClassical = row >= numQubits;
          const actualRow = isClassical ? row - numQubits : row;
          const wireType = isClassical ? 'c' : 'q';
          const y = isClassical ? (numQubits + 1 + actualRow) * SLOT_SIZE : row * SLOT_SIZE;

          return Array.from({ length: numTimesteps }, (_, t) => {
            const x = t * SLOT_SIZE;
            const slotId = `slot-${wireType}${actualRow}-t${t}`;
            return <DroppableSlot key={slotId} id={slotId} x={x} y={y} onSlotClick={onSlotClick} />;
          });
        })}

        {/* Layer 3: Multi-qubit gate connecting lines */}
        {multiQubitGates.map((gate, idx) => (
          <SvgMultiGateLine key={`multi-${idx}`} gate={gate} x={gate.timestep * SLOT_SIZE} />
        ))}

        {/* Layer 4: Measurement lines */}
        {measurements.map((gate, idx) => (
          <SvgMeasurementLine key={`measure-${idx}`} gate={gate} x={gate.timestep * SLOT_SIZE} numQubits={numQubits} />
        ))}

        {/* Layer 5: Single-qubit gates */}
        {Object.entries(gates).map(([key, gate]) => {
          const x = gate.timestep * SLOT_SIZE;
          const y = gate.qubit * SLOT_SIZE;
          return <SvgGate key={key} gate={gate} x={x} y={y} />;
        })}

        {/* Labels */}
        {Array.from({ length: numQubits }, (_, q) => (
          <text
            key={`label-q-${q}`}
            x={-10}
            y={q * SLOT_SIZE + SLOT_CENTER}
            textAnchor="end"
            dominantBaseline="central"
            fill="#888"
            fontSize={12}
          >
            q{q}
          </text>
        ))}
        {Array.from({ length: numClassical }, (_, c) => (
          <text
            key={`label-c-${c}`}
            x={-10}
            y={(numQubits + 1 + c) * SLOT_SIZE + SLOT_CENTER}
            textAnchor="end"
            dominantBaseline="central"
            fill="#888"
            fontSize={12}
          >
            c{c}
          </text>
        ))}

          {/* Layer 6: Ghost Line */}
          <g id="ghost-line">
            {ghostLine}
          </g>
      </svg>
    </Box>
  );
}
