import React, { useState, useCallback } from 'react';
import { Box } from '@mantine/core';
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

const SINGLE_GATES = ['H', 'X', 'Y', 'Z', 'S', 'T', 'S†', 'T†', 'I'];
const PARAMETRIC_GATES = ['RX', 'RY', 'RZ'];
const MULTI_GATES = ['CNOT', 'CZ', 'SWAP', 'CCX'];

interface CircuitCanvasProps {
  selectedGate: string | null;
  onGateSelect: (gate: string | null) => void;
}

// Gate color coding by family
const getGateColors = (gateType: string) => {
  if (['H'].includes(gateType)) return { fill: '#1565c0', stroke: '#42a5f5', hover: '#1976d2' };
  if (['S', 'S†', 'T', 'T†'].includes(gateType)) return { fill: '#6a1b9a', stroke: '#ab47bc', hover: '#7b1fa2' };
  if (['Y', 'Z'].includes(gateType)) return { fill: '#2e7d32', stroke: '#66bb6a', hover: '#388e3c' };
  if (['RX', 'RY', 'RZ'].includes(gateType)) return { fill: '#e65100', stroke: '#ff9800', hover: '#ef6c00' };
  if (['I'].includes(gateType)) return { fill: '#424242', stroke: '#757575', hover: '#616161' };
  return { fill: '#3e3e3e', stroke: '#888', hover: '#4e4e4e' };
};

function SvgGate({ gate, x, y, onDelete }: { 
  gate: GateInstance; x: number; y: number; onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cx = x + SLOT_CENTER;
  const cy = y + SLOT_CENTER;
  const gateX = x + (SLOT_SIZE - GATE_SIZE) / 2;
  const gateY = y + (SLOT_SIZE - GATE_SIZE) / 2;
  const r = GATE_SIZE / 2 - 2;

  // X gate: circle with + (oplus symbol)
  if (gate.gateType === 'X') {
    return (
      <g style={{ cursor: 'pointer' }} 
         onDoubleClick={() => onDelete(gate.id)}
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}>
        <circle cx={cx} cy={cy} r={r} fill="none" 
          stroke={hovered ? '#90caf9' : '#64b5f6'} strokeWidth={hovered ? 3 : 2} />
        <line x1={cx - r + 4} y1={cy} x2={cx + r - 4} y2={cy} 
          stroke={hovered ? '#90caf9' : '#64b5f6'} strokeWidth={2} />
        <line x1={cx} y1={cy - r + 4} x2={cx} y2={cy + r - 4} 
          stroke={hovered ? '#90caf9' : '#64b5f6'} strokeWidth={2} />
      </g>
    );
  }

  const colors = getGateColors(gate.gateType);

  return (
    <g style={{ cursor: 'pointer' }} 
       onDoubleClick={() => onDelete(gate.id)}
       onMouseEnter={() => setHovered(true)}
       onMouseLeave={() => setHovered(false)}>
      <rect x={gateX} y={gateY} width={GATE_SIZE} height={GATE_SIZE}
        fill={hovered ? colors.hover : colors.fill} 
        stroke={hovered ? '#fff' : colors.stroke} 
        strokeWidth={hovered ? 2.5 : 2} rx={GATE_RADIUS} />
      <text x={cx} y={gate.theta !== undefined ? cy - 4 : cy}
        textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize={gate.gateType.length > 2 ? 11 : 14} fontWeight="bold">
        {gate.gateType}
      </text>
      {gate.theta !== undefined && (
        <text x={cx} y={cy + 10}
          textAnchor="middle" dominantBaseline="central" fill="#ffcc80" fontSize={9}>
          {(gate.theta / Math.PI).toFixed(2)}π
        </text>
      )}
    </g>
  );
}

function SvgMultiGate({ gate, x, onDelete }: { 
  gate: MultiQubitGateInstance; x: number; onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const allQubits = [...gate.controls, ...gate.targets].sort((a, b) => a - b);
  const yStart = allQubits[0] * SLOT_SIZE + SLOT_CENTER;
  const yEnd = allQubits[allQubits.length - 1] * SLOT_SIZE + SLOT_CENTER;
  const lineX = x + SLOT_CENTER;
  const targetR = GATE_SIZE / 2 - 4;
  const lineColor = hovered ? '#90caf9' : '#64b5f6';

  // For SWAP, draw X on both qubits
  if (gate.gateType === 'SWAP') {
    const size = 8;
    return (
      <g style={{ cursor: 'pointer' }} 
         onDoubleClick={() => onDelete(gate.id)}
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}>
        <line x1={lineX} y1={yStart} x2={lineX} y2={yEnd} stroke={lineColor} strokeWidth={hovered ? 3 : 2} />
        {gate.targets.map((q) => {
          const y = q * SLOT_SIZE + SLOT_CENTER;
          return (
            <g key={`swap-${gate.id}-${q}`}>
              <line x1={lineX - size} y1={y - size} x2={lineX + size} y2={y + size} stroke={lineColor} strokeWidth={hovered ? 3 : 2.5} />
              <line x1={lineX - size} y1={y + size} x2={lineX + size} y2={y - size} stroke={lineColor} strokeWidth={hovered ? 3 : 2.5} />
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <g style={{ cursor: 'pointer' }} 
       onDoubleClick={() => onDelete(gate.id)}
       onMouseEnter={() => setHovered(true)}
       onMouseLeave={() => setHovered(false)}>
      <line x1={lineX} y1={yStart} x2={lineX} y2={yEnd} stroke={lineColor} strokeWidth={hovered ? 3 : 2} />
      {/* Control dots */}
      {gate.controls.map((q) => (
        <circle key={`c-${gate.id}-${q}`} cx={lineX} cy={q * SLOT_SIZE + SLOT_CENTER}
          r={hovered ? CONTROL_RADIUS + 1 : CONTROL_RADIUS} fill={lineColor} />
      ))}
      {/* Targets */}
      {gate.targets.map((q) => {
        const y = q * SLOT_SIZE + SLOT_CENTER;
        if (gate.gateType === 'CNOT' || gate.gateType === 'CCX') {
          return (
            <g key={`t-${gate.id}-${q}`}>
              <circle cx={lineX} cy={y} r={targetR} fill="none" stroke={lineColor} strokeWidth={hovered ? 3 : 2} />
              <line x1={lineX - targetR + 2} y1={y} x2={lineX + targetR - 2} y2={y} stroke={lineColor} strokeWidth={2} />
              <line x1={lineX} y1={y - targetR + 2} x2={lineX} y2={y + targetR - 2} stroke={lineColor} strokeWidth={2} />
            </g>
          );
        }
        if (gate.gateType === 'CZ') {
          return <circle key={`t-${gate.id}-${q}`} cx={lineX} cy={y} r={hovered ? CONTROL_RADIUS + 1 : CONTROL_RADIUS} fill={lineColor} />;
        }
        return null;
      })}
    </g>
  );
}

function SvgMeasurement({ measurement, numQubits, x, onDelete }: { 
  measurement: Measurement; numQubits: number; x: number; onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const gateX = x + (SLOT_SIZE - GATE_SIZE) / 2;
  const gateY = measurement.qubit * SLOT_SIZE + (SLOT_SIZE - GATE_SIZE) / 2;
  const cx = x + SLOT_CENTER;
  const cy = measurement.qubit * SLOT_SIZE + SLOT_CENTER;
  const lineX = x + SLOT_CENTER;
  const qubitY = measurement.qubit * SLOT_SIZE + SLOT_CENTER;
  const classicalY = (measurement.classicalBit + numQubits + 1) * SLOT_SIZE + SLOT_CENTER;
  const meterR = GATE_SIZE / 2 - 6;
  const arcY = cy + 4;
  
  return (
    <g style={{ cursor: 'pointer' }} 
       onDoubleClick={() => onDelete(measurement.id)}
       onMouseEnter={() => setHovered(true)}
       onMouseLeave={() => setHovered(false)}>
      <rect x={gateX} y={gateY} width={GATE_SIZE} height={GATE_SIZE}
        fill={hovered ? '#455a64' : '#37474f'} 
        stroke={hovered ? '#fff' : '#78909c'} 
        strokeWidth={hovered ? 2.5 : 2} rx={GATE_RADIUS} />
      <path d={`M ${cx - meterR} ${arcY} A ${meterR} ${meterR} 0 0 1 ${cx + meterR} ${arcY}`}
        fill="none" stroke="white" strokeWidth={1.5} />
      <line x1={cx} y1={arcY} x2={cx + meterR * 0.7} y2={arcY - meterR * 0.9}
        stroke="white" strokeWidth={1.5} />
      <line x1={lineX} y1={qubitY + GATE_SIZE / 2} x2={lineX} y2={classicalY}
        stroke={hovered ? '#bbdefb' : '#90caf9'} strokeWidth={2} strokeDasharray="4 2" />
      <polygon points={`${lineX},${classicalY} ${lineX - 4},${classicalY - 8} ${lineX + 4},${classicalY - 8}`}
        fill={hovered ? '#bbdefb' : '#90caf9'} />
    </g>
  );
}

function DroppableSlot({ id, x, y, onClick, isHighlighted, hasGate }: { 
  id: string; x: number; y: number; onClick: (id: string) => void; 
  isHighlighted?: boolean; hasGate?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <rect x={x} y={y} width={SLOT_SIZE} height={SLOT_SIZE}
      fill={isHighlighted ? 'rgba(85, 153, 255, 0.3)' : hovered && !hasGate ? 'rgba(255,255,255,0.05)' : 'transparent'}
      stroke={hovered && !hasGate ? 'rgba(255,255,255,0.2)' : 'transparent'}
      strokeWidth={1}
      style={{ cursor: hasGate ? 'default' : 'pointer' }} 
      onClick={() => onClick(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)} />
  );
}

export function CircuitCanvas({ selectedGate, onGateSelect }: CircuitCanvasProps) {
  const { state, addGate, deleteGate, addMultiGate, deleteMultiGate, deleteMeasurement, addMeasurement } = useCircuit();
  const { numQubits, numClassical, numTimesteps, gates, multiQubitGates, measurements } = state;
  
  const [pendingMultiGate, setPendingMultiGate] = useState<{
    gateType: string; controls: number[]; timestep: number;
  } | null>(null);

  const totalRows = numQubits + 1 + numClassical;
  const svgWidth = WIRE_PADDING + numTimesteps * SLOT_SIZE + 50;
  const svgHeight = totalRows * SLOT_SIZE + 20;

  // Check if slot has a gate
  const slotHasGate = useCallback((q: number, t: number) => {
    return Object.values(gates).some(g => g.qubit === q && g.timestep === t) ||
           multiQubitGates.some(g => (g.controls.includes(q) || g.targets.includes(q)) && g.timestep === t) ||
           measurements.some(m => m.qubit === q && m.timestep === t);
  }, [gates, multiQubitGates, measurements]);

  const handleSlotClick = useCallback((slotId: string) => {
    const match = slotId.match(/slot-([qc])(\d+)-t(\d+)/);
    if (!match) return;
    const [, wireType, indexStr, timestepStr] = match;
    const index = parseInt(indexStr, 10);
    const timestep = parseInt(timestepStr, 10);

    if (pendingMultiGate) {
      if (wireType === 'q') {
        if (pendingMultiGate.gateType === 'M') { setPendingMultiGate(null); return; }
        if (pendingMultiGate.controls.includes(index)) return;
        if (pendingMultiGate.gateType === 'CCX' && pendingMultiGate.controls.length === 1) {
          setPendingMultiGate({ ...pendingMultiGate, controls: [...pendingMultiGate.controls, index] });
          return;
        }
        const targets = pendingMultiGate.gateType === 'SWAP' ? [pendingMultiGate.controls[0], index] : [index];
        addMultiGate({ gateType: pendingMultiGate.gateType, timestep: pendingMultiGate.timestep,
          controls: pendingMultiGate.gateType === 'SWAP' ? [] : pendingMultiGate.controls, targets });
        setPendingMultiGate(null); onGateSelect(null);
      } else if (wireType === 'c' && pendingMultiGate.gateType === 'M') {
        addMeasurement({ gateType: 'MEASUREMENT', qubit: pendingMultiGate.controls[0],
          classicalBit: index, timestep: pendingMultiGate.timestep });
        setPendingMultiGate(null); onGateSelect(null);
      }
      return;
    }
    if (!selectedGate) return;
    if (wireType !== 'q') return;
    if (SINGLE_GATES.includes(selectedGate)) { addGate({ gateType: selectedGate, qubit: index, timestep }); return; }
    if (PARAMETRIC_GATES.includes(selectedGate)) { addGate({ gateType: selectedGate, qubit: index, timestep, theta: Math.PI / 4 }); return; }
    if (MULTI_GATES.includes(selectedGate) || selectedGate === 'M') {
      setPendingMultiGate({ gateType: selectedGate, controls: [index], timestep });
    }
  }, [selectedGate, pendingMultiGate, addGate, addMultiGate, addMeasurement, onGateSelect]);

  const getHighlightedSlots = () => {
    if (!pendingMultiGate) return new Set<string>();
    const slots = new Set<string>();
    if (pendingMultiGate.gateType === 'M') {
      for (let c = 0; c < numClassical; c++) slots.add(`slot-c${c}-t${pendingMultiGate.timestep}`);
    } else {
      for (let q = 0; q < numQubits; q++) {
        if (!pendingMultiGate.controls.includes(q)) slots.add(`slot-q${q}-t${pendingMultiGate.timestep}`);
      }
    }
    return slots;
  };
  const highlightedSlots = getHighlightedSlots();

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(selectedGate || pendingMultiGate) && (
        <Box style={{ padding: '4px 12px', paddingLeft: 200, backgroundColor: '#1a3a5c', color: '#5599ff', fontSize: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{pendingMultiGate 
            ? `Click ${pendingMultiGate.gateType === 'M' ? 'classical bit' : 'target qubit'} to complete ${pendingMultiGate.gateType}`
            : `Selected: ${selectedGate} — Click a slot to place`}</span>
          <span style={{ cursor: 'pointer', padding: '2px 8px' }}
            onClick={() => { onGateSelect(null); setPendingMultiGate(null); }}>✕ Cancel</span>
        </Box>
      )}

      <Box style={{ flex: 1, overflow: 'auto', backgroundColor: '#1e1e1e' }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {/* Qubit wires */}
          {Array.from({ length: numQubits }, (_, q) => (
            <g key={`qubit-wire-${q}`}>
              <line x1={WIRE_PADDING} y1={q * SLOT_SIZE + SLOT_CENTER} x2={svgWidth}
                y2={q * SLOT_SIZE + SLOT_CENTER} stroke="#555" strokeWidth={2} />
              <text x={WIRE_PADDING - 10} y={q * SLOT_SIZE + SLOT_CENTER} fill="#aaa"
                dominantBaseline="central" textAnchor="end" fontSize={12}>q[{q}]</text>
            </g>
          ))}
          {/* Classical wires */}
          {Array.from({ length: numClassical }, (_, c) => {
            const y = (numQubits + 1 + c) * SLOT_SIZE + SLOT_CENTER;
            return (
              <g key={`classical-wire-${c}`}>
                <line x1={WIRE_PADDING} y1={y - 2} x2={svgWidth} y2={y - 2} stroke="#555" strokeWidth={1} />
                <line x1={WIRE_PADDING} y1={y + 2} x2={svgWidth} y2={y + 2} stroke="#555" strokeWidth={1} />
                <text x={WIRE_PADDING - 10} y={y} fill="#aaa" dominantBaseline="central"
                  textAnchor="end" fontSize={12}>c[{c}]</text>
              </g>
            );
          })}
          {/* Qubit slots */}
          {Array.from({ length: numQubits }, (_, q) =>
            Array.from({ length: numTimesteps }, (_, t) => {
              const slotId = `slot-q${q}-t${t}`;
              return <DroppableSlot key={slotId} id={slotId} x={WIRE_PADDING + t * SLOT_SIZE}
                y={q * SLOT_SIZE} onClick={handleSlotClick} 
                isHighlighted={highlightedSlots.has(slotId)} hasGate={slotHasGate(q, t)} />;
            })
          )}
          {/* Classical slots */}
          {Array.from({ length: numClassical }, (_, c) =>
            Array.from({ length: numTimesteps }, (_, t) => {
              const slotId = `slot-c${c}-t${t}`;
              return <DroppableSlot key={slotId} id={slotId} x={WIRE_PADDING + t * SLOT_SIZE}
                y={(numQubits + 1 + c) * SLOT_SIZE} onClick={handleSlotClick} isHighlighted={highlightedSlots.has(slotId)} />;
            })
          )}
          {/* Multi-qubit gates */}
          {multiQubitGates.map((gate) => (
            <SvgMultiGate key={gate.id} gate={gate} x={WIRE_PADDING + gate.timestep * SLOT_SIZE} onDelete={deleteMultiGate} />
          ))}
          {/* Measurements */}
          {measurements.map((m) => (
            <SvgMeasurement key={m.id} measurement={m} numQubits={numQubits}
              x={WIRE_PADDING + m.timestep * SLOT_SIZE} onDelete={deleteMeasurement} />
          ))}
          {/* Single gates */}
          {Object.entries(gates).map(([key, gate]) => (
            <SvgGate key={key} gate={gate} x={WIRE_PADDING + gate.timestep * SLOT_SIZE}
              y={gate.qubit * SLOT_SIZE} onDelete={deleteGate} />
          ))}
          {/* Pending multi-gate indicator */}
          {pendingMultiGate && (
            <circle cx={WIRE_PADDING + pendingMultiGate.timestep * SLOT_SIZE + SLOT_CENTER}
              cy={pendingMultiGate.controls[0] * SLOT_SIZE + SLOT_CENTER} r={CONTROL_RADIUS + 2}
              fill="none" stroke="#5599ff" strokeWidth={2} strokeDasharray="4 2">
              <animate attributeName="stroke-dashoffset" from="0" to="12" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>
      </Box>
    </Box>
  );
}
