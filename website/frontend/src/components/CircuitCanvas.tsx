import React, { useState, useCallback, useRef } from 'react';
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

/* ─── Timestep header height ─── */
const HEADER_H = 24;

interface CircuitCanvasProps {
  selectedGate: string | null;
  onGateSelect: (gate: string | null) => void;
  inspectTimestep?: number | null;
  onInspectTimestep?: (t: number | null) => void;
}

/* ─── Inline gate toolbar data ─── */
interface SelectedItem {
  kind: 'gate' | 'multi' | 'measurement';
  id: string;
  gateType: string;
  screenX: number;
  screenY: number;
  hasTheta?: boolean;
  theta?: number;
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

function SvgGate({ gate, x, y, onDelete, onSelect, isSelected }: { 
  gate: GateInstance; x: number; y: number; onDelete: (id: string) => void;
  onSelect: (e: React.MouseEvent) => void; isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || isSelected;
  const cx = x + SLOT_CENTER;
  const cy = y + SLOT_CENTER;
  const gateX = x + (SLOT_SIZE - GATE_SIZE) / 2;
  const gateY = y + (SLOT_SIZE - GATE_SIZE) / 2;
  const r = GATE_SIZE / 2 - 2;

  // X gate: circle with + (oplus symbol)
  if (gate.gateType === 'X') {
    return (
      <g style={{ cursor: 'pointer' }} 
         onClick={onSelect}
         onDoubleClick={() => onDelete(gate.id)}
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}>
        {isSelected && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke="#C5A059" strokeWidth={1.5} strokeDasharray="3 2" />}
        <circle cx={cx} cy={cy} r={r} fill="none" 
          stroke={active ? '#90caf9' : '#64b5f6'} strokeWidth={active ? 3 : 2} />
        <line x1={cx - r + 4} y1={cy} x2={cx + r - 4} y2={cy} 
          stroke={active ? '#90caf9' : '#64b5f6'} strokeWidth={2} />
        <line x1={cx} y1={cy - r + 4} x2={cx} y2={cy + r - 4} 
          stroke={active ? '#90caf9' : '#64b5f6'} strokeWidth={2} />
      </g>
    );
  }

  const colors = getGateColors(gate.gateType);

  return (
    <g style={{ cursor: 'pointer' }} 
       onClick={onSelect}
       onDoubleClick={() => onDelete(gate.id)}
       onMouseEnter={() => setHovered(true)}
       onMouseLeave={() => setHovered(false)}>
      {isSelected && <rect x={gateX - 4} y={gateY - 4} width={GATE_SIZE + 8} height={GATE_SIZE + 8}
        fill="none" stroke="#C5A059" strokeWidth={1.5} strokeDasharray="3 2" rx={GATE_RADIUS + 2} />}
      <rect x={gateX} y={gateY} width={GATE_SIZE} height={GATE_SIZE}
        fill={active ? colors.hover : colors.fill} 
        stroke={active ? '#fff' : colors.stroke} 
        strokeWidth={active ? 2.5 : 2} rx={GATE_RADIUS} />
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

function SvgMultiGate({ gate, x, onDelete, onSelect, isSelected }: { 
  gate: MultiQubitGateInstance; x: number; onDelete: (id: string) => void;
  onSelect: (e: React.MouseEvent) => void; isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || isSelected;
  const allQubits = [...gate.controls, ...gate.targets].sort((a, b) => a - b);
  const yStart = allQubits[0] * SLOT_SIZE + SLOT_CENTER + HEADER_H;
  const yEnd = allQubits[allQubits.length - 1] * SLOT_SIZE + SLOT_CENTER + HEADER_H;
  const lineX = x + SLOT_CENTER;
  const targetR = GATE_SIZE / 2 - 4;
  const lineColor = active ? '#90caf9' : '#64b5f6';

  // For SWAP, draw X on both qubits
  if (gate.gateType === 'SWAP') {
    const size = 8;
    return (
      <g style={{ cursor: 'pointer' }} 
         onClick={onSelect}
         onDoubleClick={() => onDelete(gate.id)}
         onMouseEnter={() => setHovered(true)}
         onMouseLeave={() => setHovered(false)}>
        {isSelected && <line x1={lineX} y1={yStart - 4} x2={lineX} y2={yEnd + 4} stroke="#C5A059" strokeWidth={1.5} strokeDasharray="3 2" />}
        <line x1={lineX} y1={yStart} x2={lineX} y2={yEnd} stroke={lineColor} strokeWidth={active ? 3 : 2} />
        {gate.targets.map((q) => {
          const y = q * SLOT_SIZE + SLOT_CENTER + HEADER_H;
          return (
            <g key={`swap-${gate.id}-${q}`}>
              <line x1={lineX - size} y1={y - size} x2={lineX + size} y2={y + size} stroke={lineColor} strokeWidth={active ? 3 : 2.5} />
              <line x1={lineX - size} y1={y + size} x2={lineX + size} y2={y - size} stroke={lineColor} strokeWidth={active ? 3 : 2.5} />
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <g style={{ cursor: 'pointer' }} 
       onClick={onSelect}
       onDoubleClick={() => onDelete(gate.id)}
       onMouseEnter={() => setHovered(true)}
       onMouseLeave={() => setHovered(false)}>
      {isSelected && <line x1={lineX} y1={yStart - 4} x2={lineX} y2={yEnd + 4} stroke="#C5A059" strokeWidth={1.5} strokeDasharray="3 2" />}
      <line x1={lineX} y1={yStart} x2={lineX} y2={yEnd} stroke={lineColor} strokeWidth={active ? 3 : 2} />
      {/* Control dots */}
      {gate.controls.map((q) => (
        <circle key={`c-${gate.id}-${q}`} cx={lineX} cy={q * SLOT_SIZE + SLOT_CENTER + HEADER_H}
          r={active ? CONTROL_RADIUS + 1 : CONTROL_RADIUS} fill={lineColor} />
      ))}
      {/* Targets */}
      {gate.targets.map((q) => {
        const y = q * SLOT_SIZE + SLOT_CENTER + HEADER_H;
        if (gate.gateType === 'CNOT' || gate.gateType === 'CCX') {
          return (
            <g key={`t-${gate.id}-${q}`}>
              <circle cx={lineX} cy={y} r={targetR} fill="none" stroke={lineColor} strokeWidth={active ? 3 : 2} />
              <line x1={lineX - targetR + 2} y1={y} x2={lineX + targetR - 2} y2={y} stroke={lineColor} strokeWidth={2} />
              <line x1={lineX} y1={y - targetR + 2} x2={lineX} y2={y + targetR - 2} stroke={lineColor} strokeWidth={2} />
            </g>
          );
        }
        if (gate.gateType === 'CZ') {
          return <circle key={`t-${gate.id}-${q}`} cx={lineX} cy={y} r={active ? CONTROL_RADIUS + 1 : CONTROL_RADIUS} fill={lineColor} />;
        }
        return null;
      })}
    </g>
  );
}

function SvgMeasurement({ measurement, numQubits, x, onDelete, onSelect, isSelected }: { 
  measurement: Measurement; numQubits: number; x: number; onDelete: (id: string) => void;
  onSelect: (e: React.MouseEvent) => void; isSelected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || isSelected;
  const gateX = x + (SLOT_SIZE - GATE_SIZE) / 2;
  const gateY = measurement.qubit * SLOT_SIZE + (SLOT_SIZE - GATE_SIZE) / 2 + HEADER_H;
  const cx = x + SLOT_CENTER;
  const cy = measurement.qubit * SLOT_SIZE + SLOT_CENTER + HEADER_H;
  const lineX = x + SLOT_CENTER;
  const qubitY = measurement.qubit * SLOT_SIZE + SLOT_CENTER + HEADER_H;
  const classicalY = (measurement.classicalBit + numQubits + 1) * SLOT_SIZE + SLOT_CENTER + HEADER_H;
  const meterR = GATE_SIZE / 2 - 6;
  const arcY = cy + 4;
  
  return (
    <g style={{ cursor: 'pointer' }} 
       onClick={onSelect}
       onDoubleClick={() => onDelete(measurement.id)}
       onMouseEnter={() => setHovered(true)}
       onMouseLeave={() => setHovered(false)}>
      {isSelected && <rect x={gateX - 4} y={gateY - 4} width={GATE_SIZE + 8} height={GATE_SIZE + 8}
        fill="none" stroke="#C5A059" strokeWidth={1.5} strokeDasharray="3 2" rx={GATE_RADIUS + 2} />}
      <rect x={gateX} y={gateY} width={GATE_SIZE} height={GATE_SIZE}
        fill={active ? '#455a64' : '#37474f'} 
        stroke={active ? '#fff' : '#78909c'} 
        strokeWidth={active ? 2.5 : 2} rx={GATE_RADIUS} />
      <path d={`M ${cx - meterR} ${arcY} A ${meterR} ${meterR} 0 0 1 ${cx + meterR} ${arcY}`}
        fill="none" stroke="white" strokeWidth={1.5} />
      <line x1={cx} y1={arcY} x2={cx + meterR * 0.7} y2={arcY - meterR * 0.9}
        stroke="white" strokeWidth={1.5} />
      <line x1={lineX} y1={qubitY + GATE_SIZE / 2} x2={lineX} y2={classicalY}
        stroke={active ? '#bbdefb' : '#90caf9'} strokeWidth={2} strokeDasharray="4 2" />
      <polygon points={`${lineX},${classicalY} ${lineX - 4},${classicalY - 8} ${lineX + 4},${classicalY - 8}`}
        fill={active ? '#bbdefb' : '#90caf9'} />
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
      fill={isHighlighted ? 'rgba(197, 160, 89, 0.15)' : hovered && !hasGate ? 'rgba(197,160,89,0.05)' : 'transparent'}
      stroke={hovered && !hasGate ? 'rgba(197,160,89,0.2)' : 'transparent'}
      strokeWidth={1}
      style={{ cursor: hasGate ? 'default' : 'pointer' }} 
      onClick={() => onClick(id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)} />
  );
}

/* ═══════════════════════════════════════════════════════
   Inline Gate Toolbar (floating HTML overlay)
   ═══════════════════════════════════════════════════════ */
function GateToolbar({ item, onDelete, onEditTheta, onDismiss }: {
  item: SelectedItem;
  onDelete: () => void;
  onEditTheta?: (theta: number) => void;
  onDismiss: () => void;
}) {
  const [editingTheta, setEditingTheta] = useState(false);
  const [thetaVal, setThetaVal] = useState(String(item.theta !== undefined ? (item.theta / Math.PI).toFixed(3) : ''));

  const handleThetaSubmit = () => {
    const v = parseFloat(thetaVal);
    if (!isNaN(v) && onEditTheta) onEditTheta(v * Math.PI);
    setEditingTheta(false);
  };

  return (
    <div
      className="absolute z-50 flex items-center gap-1 px-2 py-1 rounded-lg shadow-lg border border-vegas-gold/30"
      style={{
        left: item.screenX,
        top: item.screenY - 42,
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(10,31,28,0.95)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-mono text-[10px] text-vegas-gold mr-1">{item.gateType}</span>

      {item.hasTheta && !editingTheta && (
        <button onClick={() => setEditingTheta(true)} title="Edit angle"
          className="w-6 h-6 rounded flex items-center justify-center text-isabelline/50 hover:text-vegas-gold hover:bg-vegas-gold/10 transition-colors text-xs">θ</button>
      )}

      {editingTheta && (
        <form onSubmit={(e) => { e.preventDefault(); handleThetaSubmit(); }} className="flex items-center gap-0.5">
          <input autoFocus value={thetaVal} onChange={(e) => setThetaVal(e.target.value)}
            className="w-14 px-1 py-0.5 rounded bg-forest-light/60 border border-vegas-gold/30 text-isabelline font-mono text-[10px] focus:outline-none"
            placeholder="π mult" />
          <span className="text-isabelline/30 text-[10px]">π</span>
          <button type="submit" className="text-vegas-gold text-xs hover:text-vegas-gold/80">✓</button>
        </form>
      )}

      <button onClick={onDelete} title="Delete (or double-click)"
        className="w-6 h-6 rounded flex items-center justify-center text-isabelline/40 hover:text-muted-brick hover:bg-muted-brick/10 transition-colors text-xs">✕</button>
      <button onClick={onDismiss} title="Dismiss"
        className="w-6 h-6 rounded flex items-center justify-center text-isabelline/30 hover:text-isabelline/60 transition-colors text-[10px]">⎋</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main CircuitCanvas
   ═══════════════════════════════════════════════════════ */
export function CircuitCanvas({ selectedGate, onGateSelect, inspectTimestep, onInspectTimestep }: CircuitCanvasProps) {
  const { state, addGate, deleteGate, addMultiGate, deleteMultiGate, deleteMeasurement, addMeasurement } = useCircuit();
  const { numQubits, numClassical, numTimesteps, gates, multiQubitGates, measurements } = state;
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const [pendingMultiGate, setPendingMultiGate] = useState<{
    gateType: string; controls: number[]; timestep: number;
  } | null>(null);

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

  const totalRows = numQubits + 1 + numClassical;
  const svgWidth = WIRE_PADDING + numTimesteps * SLOT_SIZE + 50;
  const svgHeight = HEADER_H + totalRows * SLOT_SIZE + 20;

  // Check if slot has a gate
  const slotHasGate = useCallback((q: number, t: number) => {
    return Object.values(gates).some(g => g.qubit === q && g.timestep === t) ||
           multiQubitGates.some(g => (g.controls.includes(q) || g.targets.includes(q)) && g.timestep === t) ||
           measurements.some(m => m.qubit === q && m.timestep === t);
  }, [gates, multiQubitGates, measurements]);

  // Compute screen position from SVG event
  const svgToScreen = useCallback((e: React.MouseEvent): { x: number; y: number } => {
    const container = svgContainerRef.current;
    if (!container) return { x: e.clientX, y: e.clientY };
    const rect = container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + container.scrollLeft,
      y: e.clientY - rect.top + container.scrollTop,
    };
  }, []);

  // Handle gate click → show inline toolbar
  const handleGateClick = useCallback((e: React.MouseEvent, kind: 'gate' | 'multi' | 'measurement', id: string, gateType: string, hasTheta?: boolean, theta?: number) => {
    e.stopPropagation();
    const pos = svgToScreen(e);
    setSelectedItem({ kind, id, gateType, screenX: pos.x, screenY: pos.y, hasTheta, theta });
  }, [svgToScreen]);

  const dismissToolbar = useCallback(() => setSelectedItem(null), []);

  const handleSlotClick = useCallback((slotId: string) => {
    setSelectedItem(null); // dismiss toolbar on slot click
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
    <div className="h-full flex flex-col relative" onClick={dismissToolbar}>
      {/* Gate placement status bar */}
      {(selectedGate || pendingMultiGate) && (
        <div className="flex items-center justify-between px-3 py-1 border-b border-vegas-gold/15 font-body text-xs text-vegas-gold"
          style={{ paddingLeft: 200, backgroundColor: 'rgba(17,42,38,0.9)' }}>
          <span>{pendingMultiGate 
            ? `Click ${pendingMultiGate.gateType === 'M' ? 'classical bit' : 'target qubit'} to complete ${pendingMultiGate.gateType}`
            : `Selected: ${selectedGate} — Click a slot to place`}</span>
          <span className="cursor-pointer px-2 hover:text-isabelline transition-colors"
            onClick={() => { onGateSelect(null); setPendingMultiGate(null); }}>✕ Cancel</span>
        </div>
      )}

      {/* Scrollable canvas */}
      <div ref={svgContainerRef} className="flex-1 overflow-auto relative" style={{ backgroundColor: '#0D2420' }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {/* Timestep column headers */}
          {Array.from({ length: numTimesteps }, (_, t) => {
            const colX = WIRE_PADDING + t * SLOT_SIZE;
            const isInspected = inspectTimestep === t;
            return (
              <g key={`ts-header-${t}`}>
                <rect x={colX} y={0} width={SLOT_SIZE} height={HEADER_H}
                  fill={isInspected ? 'rgba(197,160,89,0.12)' : 'transparent'}
                  style={{ cursor: onInspectTimestep ? 'pointer' : 'default' }}
                  onClick={() => onInspectTimestep && onInspectTimestep(isInspected ? null : t)} />
                <text x={colX + SLOT_CENTER} y={HEADER_H / 2} textAnchor="middle" dominantBaseline="central"
                  fill={isInspected ? '#C5A059' : 'rgba(245,242,234,0.2)'}
                  fontSize={9} fontFamily="'JetBrains Mono', monospace">
                  t{t}
                </text>
                {/* Column guide line */}
                {isInspected && (
                  <line x1={colX + SLOT_CENTER} y1={HEADER_H} x2={colX + SLOT_CENTER} y2={svgHeight}
                    stroke="rgba(197,160,89,0.15)" strokeWidth={1} strokeDasharray="4 3" />
                )}
              </g>
            );
          })}

          {/* Qubit wires */}
          {Array.from({ length: numQubits }, (_, q) => (
            <g key={`qubit-wire-${q}`}>
              <line x1={WIRE_PADDING} y1={q * SLOT_SIZE + SLOT_CENTER + HEADER_H} x2={svgWidth}
                y2={q * SLOT_SIZE + SLOT_CENTER + HEADER_H} stroke="rgba(197,160,89,0.25)" strokeWidth={2} />
              <text x={WIRE_PADDING - 10} y={q * SLOT_SIZE + SLOT_CENTER + HEADER_H} fill="rgba(245,242,234,0.5)"
                dominantBaseline="central" textAnchor="end" fontSize={12} fontFamily="'JetBrains Mono', monospace">q[{q}]</text>
            </g>
          ))}
          {/* Classical wires */}
          {Array.from({ length: numClassical }, (_, c) => {
            const y = (numQubits + 1 + c) * SLOT_SIZE + SLOT_CENTER + HEADER_H;
            return (
              <g key={`classical-wire-${c}`}>
                <line x1={WIRE_PADDING} y1={y - 2} x2={svgWidth} y2={y - 2} stroke="rgba(197,160,89,0.15)" strokeWidth={1} />
                <line x1={WIRE_PADDING} y1={y + 2} x2={svgWidth} y2={y + 2} stroke="rgba(197,160,89,0.15)" strokeWidth={1} />
                <text x={WIRE_PADDING - 10} y={y} fill="rgba(245,242,234,0.35)" dominantBaseline="central"
                  textAnchor="end" fontSize={12} fontFamily="'JetBrains Mono', monospace">c[{c}]</text>
              </g>
            );
          })}
          {/* Qubit slots */}
          {Array.from({ length: numQubits }, (_, q) =>
            Array.from({ length: numTimesteps }, (_, t) => {
              const slotId = `slot-q${q}-t${t}`;
              return <DroppableSlot key={slotId} id={slotId} x={WIRE_PADDING + t * SLOT_SIZE}
                y={q * SLOT_SIZE + HEADER_H} onClick={handleSlotClick} 
                isHighlighted={highlightedSlots.has(slotId)} hasGate={slotHasGate(q, t)} />;
            })
          )}
          {/* Classical slots */}
          {Array.from({ length: numClassical }, (_, c) =>
            Array.from({ length: numTimesteps }, (_, t) => {
              const slotId = `slot-c${c}-t${t}`;
              return <DroppableSlot key={slotId} id={slotId} x={WIRE_PADDING + t * SLOT_SIZE}
                y={(numQubits + 1 + c) * SLOT_SIZE + HEADER_H} onClick={handleSlotClick} isHighlighted={highlightedSlots.has(slotId)} />;
            })
          )}
          {/* Multi-qubit gates */}
          {multiQubitGates.map((gate) => (
            <SvgMultiGate key={gate.id} gate={gate} x={WIRE_PADDING + gate.timestep * SLOT_SIZE} onDelete={deleteMultiGate}
              isSelected={selectedItem?.id === gate.id}
              onSelect={(e) => handleGateClick(e, 'multi', gate.id, gate.gateType)} />
          ))}
          {/* Measurements */}
          {measurements.map((m) => (
            <SvgMeasurement key={m.id} measurement={m} numQubits={numQubits}
              x={WIRE_PADDING + m.timestep * SLOT_SIZE} onDelete={deleteMeasurement}
              isSelected={selectedItem?.id === m.id}
              onSelect={(e) => handleGateClick(e, 'measurement', m.id, 'M')} />
          ))}
          {/* Single gates */}
          {Object.entries(gates).map(([key, gate]) => (
            <SvgGate key={key} gate={gate} x={WIRE_PADDING + gate.timestep * SLOT_SIZE}
              y={gate.qubit * SLOT_SIZE + HEADER_H} onDelete={deleteGate}
              isSelected={selectedItem?.id === gate.id}
              onSelect={(e) => handleGateClick(e, 'gate', gate.id, gate.gateType, PARAMETRIC_GATES.includes(gate.gateType), gate.theta)} />
          ))}
          {/* Pending multi-gate indicator */}
          {pendingMultiGate && (
            <circle cx={WIRE_PADDING + pendingMultiGate.timestep * SLOT_SIZE + SLOT_CENTER}
              cy={pendingMultiGate.controls[0] * SLOT_SIZE + SLOT_CENTER + HEADER_H} r={CONTROL_RADIUS + 2}
              fill="none" stroke="#C5A059" strokeWidth={2} strokeDasharray="4 2">
              <animate attributeName="stroke-dashoffset" from="0" to="12" dur="0.5s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>

        {/* Inline gate toolbar overlay */}
        {selectedItem && (
          <GateToolbar
            item={selectedItem}
            onDelete={() => {
              if (selectedItem.kind === 'gate') deleteGate(selectedItem.id);
              else if (selectedItem.kind === 'multi') deleteMultiGate(selectedItem.id);
              else deleteMeasurement(selectedItem.id);
              setSelectedItem(null);
            }}
            onEditTheta={selectedItem.hasTheta ? (theta) => {
              // Delete and re-add with new theta
              if (selectedItem.kind === 'gate') {
                const g = gates[Object.keys(gates).find(k => gates[k].id === selectedItem.id) || ''];
                if (g) {
                  deleteGate(g.id);
                  addGate({ gateType: g.gateType, qubit: g.qubit, timestep: g.timestep, theta });
                }
              }
              setSelectedItem(null);
            } : undefined}
            onDismiss={dismissToolbar}
          />
        )}
      </div>
    </div>
  );
}
