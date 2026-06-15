"""
Qcuit Platform — Deterministic Circuit Explainer
POST /api/explain — pure, reproducible circuit analysis with no LLM calls.

Given a circuit description, returns a structured explanation:
  - per-column descriptions of the state evolution,
  - per-qubit single-qubit state classification (|0>, |+>, |->, |i>, ...),
  - entanglement detection via partial-trace Von Neumann entropy,
  - a high-level verdict for the whole circuit (Bell, GHZ, product, custom).

This endpoint is intentionally deterministic and does not depend on external
model APIs.
"""

from __future__ import annotations

import hashlib
import json
import math
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from flask import Blueprint, jsonify, request

from api.circuit_executor import CircuitExecutor

explain_bp = Blueprint('explain', __name__, url_prefix='/api')

# ── Tunables ────────────────────────────────────────────────────────
TOL = 1e-6              # numerical tolerance for state classification
ENTROPY_THRESHOLD = 1e-3  # below this we call a qubit "unentangled"
MAX_COLUMNS = 64        # safety cap on timesteps we analyse


# ── In-process cache keyed by circuit SHA-256 ──────────────────────
_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_MAX = 256


def _cache_key(payload: Dict[str, Any]) -> str:
    """Stable SHA-256 over the relevant circuit fields."""
    canonical = json.dumps(
        {
            'numQubits': payload.get('numQubits', 0),
            'gates': payload.get('gates', {}),
            'multiQubitGates': payload.get('multiQubitGates', []),
            'measurements': payload.get('measurements', []),
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


# ── Gate normalisation (mirrors __init__.py) ───────────────────────
def _normalize_gate(gate: Dict[str, Any]) -> Dict[str, Any]:
    g = dict(gate)
    if 'control' in g and 'controls' not in g:
        g['controls'] = [g.pop('control')]
    if 'target' in g and 'targets' not in g:
        g['targets'] = [g.pop('target')]
    if 'control2' in g:
        g.setdefault('controls', []).append(g.pop('control2'))
    return g


# ── Single-qubit reduced density helpers ───────────────────────────
def _reduced_density_matrix(state: np.ndarray, qubit: int, num_qubits: int) -> np.ndarray:
    """Trace out everything except `qubit` from a pure statevector.

    For pure |psi>, rho_q[a, b] = sum_{rest} psi_{rest, a} * conj(psi_{rest, b}).
    """
    dim = 2 ** num_qubits
    rho = np.zeros((2, 2), dtype=np.complex128)
    mask = 1 << qubit
    for i in range(dim):
        bi = 1 if (i & mask) else 0
        # j shares the same "rest" bits as i but qubit value bj.
        for bj in (0, 1):
            j = i if bj == bi else (i ^ mask)
            rho[bi, bj] += state[i] * np.conjugate(state[j])
    # Each (rest, bi, bj) contributes once: outer loop visits both bi=0 and bi=1
    # for each rest, and each visit writes to a different row. No double-counting.
    return rho


def _entanglement_entropy(rho: np.ndarray) -> float:
    """Von Neumann entropy in bits."""
    eigs = np.linalg.eigvalsh(rho)
    s = 0.0
    for lam in eigs:
        lam = float(np.real(lam))
        if lam > 1e-12:
            s -= lam * math.log2(lam)
    return float(max(0.0, s))


# ── Single-qubit state classifier ──────────────────────────────────
_NAMED_STATES = {
    '|0>':  np.array([1.0, 0.0], dtype=np.complex128),
    '|1>':  np.array([0.0, 1.0], dtype=np.complex128),
    '|+>':  np.array([1.0, 1.0], dtype=np.complex128) / math.sqrt(2),
    '|->':  np.array([1.0, -1.0], dtype=np.complex128) / math.sqrt(2),
    '|+i>': np.array([1.0, 1j], dtype=np.complex128) / math.sqrt(2),
    '|-i>': np.array([1.0, -1j], dtype=np.complex128) / math.sqrt(2),
}


def _classify_pure_qubit(rho: np.ndarray) -> Dict[str, Any]:
    """Describe a single-qubit reduced density matrix.

    Returns a dict with:
      - name:   '|0>', '|+>', etc. or 'mixed' or 'pure'
      - bloch:  [x, y, z] Bloch vector
      - prob0:  P(|0>)
      - prob1:  P(|1>)
      - purity: tr(rho^2)
    """
    purity = float(np.real(np.trace(rho @ rho)))
    prob0 = float(np.real(rho[0, 0]))
    prob1 = float(np.real(rho[1, 1]))
    # Bloch vector
    x = float(2.0 * np.real(rho[0, 1]))
    y = float(2.0 * np.imag(rho[1, 0]))
    z = float(prob0 - prob1)

    result = {
        'bloch': [round(x, 6), round(y, 6), round(z, 6)],
        'prob0': round(prob0, 6),
        'prob1': round(prob1, 6),
        'purity': round(purity, 6),
        'name': None,
        'mixed': purity < 1.0 - 1e-3,
    }

    if result['mixed']:
        # Mixed / entangled — purity < 1
        if abs(prob0 - 0.5) < 0.05 and abs(x) < 0.05 and abs(y) < 0.05 and abs(z) < 0.05:
            result['name'] = 'maximally mixed'
        else:
            result['name'] = 'mixed'
        return result

    # Pure state — compare Bloch vector to named states
    candidates = [
        ('|0>', (0.0, 0.0, 1.0)),
        ('|1>', (0.0, 0.0, -1.0)),
        ('|+>', (1.0, 0.0, 0.0)),
        ('|->', (-1.0, 0.0, 0.0)),
        ('|+i>', (0.0, 1.0, 0.0)),
        ('|-i>', (0.0, -1.0, 0.0)),
    ]
    for name, (bx, by, bz) in candidates:
        if (abs(x - bx) < 0.02 and abs(y - by) < 0.02 and abs(z - bz) < 0.02):
            result['name'] = name
            return result

    result['name'] = 'pure'
    return result


# ── Whole-circuit verdict (Bell, GHZ, product, custom) ─────────────
def _circuit_verdict(state: np.ndarray, num_qubits: int) -> str:
    """Heuristic classifier for the overall circuit output."""
    probs = np.abs(state) ** 2
    # Drop near-zero amplitudes
    nonzero = [(i, float(p)) for i, p in enumerate(probs) if p > 1e-6]

    if len(nonzero) == 1:
        i, _ = nonzero[0]
        bits = format(i, f'0{num_qubits}b')
        return f"Computational basis state |{bits}>"

    # GHZ-like: two nonzero amplitudes at |00...0> and |11...1> with equal weight
    if num_qubits >= 2 and len(nonzero) == 2:
        idxs = sorted(i for i, _ in nonzero)
        zero, all_one = 0, (1 << num_qubits) - 1
        if idxs == [zero, all_one] and abs(nonzero[0][1] - nonzero[1][1]) < 1e-3:
            return f"{num_qubits}-qubit GHZ state"

    # Bell-pair detection on 2-qubit circuits
    if num_qubits == 2 and len(nonzero) == 2:
        if abs(nonzero[0][1] - nonzero[1][1]) < 1e-3:
            return "Bell-like entangled state"

    # Uniform superposition over all basis states
    if len(nonzero) == 2 ** num_qubits:
        uniform = 1.0 / (2 ** num_qubits)
        if all(abs(p - uniform) < 1e-3 for _, p in nonzero):
            return f"Uniform superposition over {2 ** num_qubits} states"

    # Product check: full state factorises iff every qubit is pure
    all_pure = True
    for q in range(num_qubits):
        rho = _reduced_density_matrix(state, q, num_qubits)
        if float(np.real(np.trace(rho @ rho))) < 1.0 - 1e-3:
            all_pure = False
            break
    if all_pure:
        return "Product state (no entanglement)"

    return "Entangled state"


# ── Group circuit steps into timestep columns ──────────────────────
def _group_by_timestep(steps: List[Dict[str, Any]]) -> List[Tuple[int, List[Dict[str, Any]]]]:
    buckets: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
    for step in steps:
        t = int(step.get('timestep', 0))
        buckets[t].append(step)
    return sorted(buckets.items(), key=lambda kv: kv[0])


# ── Human-friendly description of a single gate ─────────────────────
def _describe_gate(step: Dict[str, Any]) -> str:
    gt = str(step.get('gateType', '?')).upper()
    if gt in ('CNOT', 'CX'):
        c = (step.get('controls') or [step.get('control')])[0]
        t = (step.get('targets') or [step.get('target')])[0]
        return f"CNOT (control q{c} -> target q{t})"
    if gt == 'CZ':
        c = (step.get('controls') or [step.get('control')])[0]
        t = (step.get('targets') or [step.get('target')])[0]
        return f"CZ on q{c} and q{t}"
    if gt == 'SWAP':
        tgts = step.get('targets') or []
        if len(tgts) >= 2:
            return f"SWAP q{tgts[0]} <-> q{tgts[1]}"
        return "SWAP"
    if gt in ('CCX', 'CCNOT', 'TOFFOLI'):
        controls = step.get('controls') or []
        tgts = step.get('targets') or []
        if len(controls) >= 2 and tgts:
            return f"Toffoli (controls q{controls[0]}, q{controls[1]} -> target q{tgts[0]})"
        return "Toffoli"
    if gt in ('RX', 'RY', 'RZ'):
        q = step.get('qubit', 0)
        theta = step.get('theta', 0.0)
        try:
            theta_str = f"{float(theta):.3f}"
        except (TypeError, ValueError):
            theta_str = str(theta)
        return f"{gt}({theta_str}) on q{q}"
    if gt in ('M', 'MEASUREMENT'):
        q = step.get('qubit', 0)
        c = step.get('classicalBit', q)
        return f"Measure q{q} -> c{c}"
    q = step.get('qubit', 0)
    return f"{gt} on q{q}"


# ── Per-column narrative ─────────────────────────────────────────────
def _column_narrative(
    column_index: int,
    column_steps: List[Dict[str, Any]],
    state: np.ndarray,
    num_qubits: int,
) -> Dict[str, Any]:
    """Produce a structured description after this column has been applied."""
    gate_descriptions = [_describe_gate(s) for s in column_steps]

    # Per-qubit classification
    qubits = []
    entangled_qubits: List[int] = []
    for q in range(num_qubits):
        rho = _reduced_density_matrix(state, q, num_qubits)
        info = _classify_pure_qubit(rho)
        info['qubit'] = q
        info['entropy'] = round(_entanglement_entropy(rho), 6)
        if info['entropy'] > ENTROPY_THRESHOLD:
            entangled_qubits.append(q)
        qubits.append(info)

    # Short summary line
    if not entangled_qubits:
        pure_names = [q['name'] for q in qubits if q.get('name')]
        if pure_names and all(n == pure_names[0] for n in pure_names):
            summary = f"All qubits in {pure_names[0]}."
        else:
            tokens = ', '.join(f"q{q['qubit']}={q['name']}" for q in qubits if q.get('name'))
            summary = f"No entanglement. {tokens}." if tokens else "No entanglement."
    else:
        ent_list = ', '.join(f"q{q}" for q in entangled_qubits)
        summary = f"Entanglement on {ent_list}."

    return {
        'column': column_index,
        'gates_applied': gate_descriptions,
        'qubits': qubits,
        'entangled_qubits': entangled_qubits,
        'summary': summary,
    }


# ── Entanglement edge graph (pairwise concurrence-ish heuristic) ────
def _entanglement_edges(state: np.ndarray, num_qubits: int) -> List[Dict[str, Any]]:
    """Approximate pairwise entanglement edges via mutual information lower bound.

    For two qubits A and B: I(A:B) = S(A) + S(B) - S(AB).
    We compute the reduced density matrix on {A,B} and its entropy.
    """
    edges: List[Dict[str, Any]] = []
    dim = 2 ** num_qubits
    for a in range(num_qubits):
        for b in range(a + 1, num_qubits):
            # Reduced 4x4 density matrix on (a,b) via partial trace
            rho_ab = np.zeros((4, 4), dtype=np.complex128)
            mask_a = 1 << a
            mask_b = 1 << b
            # rest = bits other than a,b
            rest_mask = (dim - 1) ^ mask_a ^ mask_b
            # Enumerate all (rest, ba, bb) configurations
            # We need rho_ab[(ba',bb'), (ba,bb)] = sum_rest psi_{rest|ba'|bb'} conj(psi_{rest|ba|bb})
            for rest in range(dim):
                if rest & ~rest_mask:
                    continue
                for ba_p in range(2):
                    for bb_p in range(2):
                        i_p = rest | (ba_p * mask_a) | (bb_p * mask_b)
                        amp_p = state[i_p]
                        if abs(amp_p) < 1e-15:
                            continue
                        for ba in range(2):
                            for bb in range(2):
                                i = rest | (ba * mask_a) | (bb * mask_b)
                                amp = state[i]
                                row = (ba_p << 1) | bb_p
                                col = (ba << 1) | bb
                                rho_ab[row, col] += amp_p * np.conjugate(amp)
            s_ab = _entanglement_entropy(rho_ab)
            s_a = _entanglement_entropy(_reduced_density_matrix(state, a, num_qubits))
            s_b = _entanglement_entropy(_reduced_density_matrix(state, b, num_qubits))
            mi = s_a + s_b - s_ab
            if mi > 1e-3:
                edges.append({
                    'a': a,
                    'b': b,
                    'mutual_information': round(float(mi), 6),
                })
    return edges


# ── The endpoint itself ─────────────────────────────────────────────
@explain_bp.route('/explain', methods=['POST'])
def explain():
    """Return a structured deterministic explanation for the given circuit."""
    payload = request.get_json(silent=True) or {}
    try:
        num_qubits = int(payload.get('numQubits') or payload.get('num_qubits') or 0)
    except (TypeError, ValueError):
        return jsonify({'error': 'numQubits must be an integer.'}), 400
    if num_qubits <= 0:
        return jsonify({'error': 'numQubits must be >= 1.'}), 400
    if num_qubits > 12:
        return jsonify({'error': 'Explain supports up to 12 qubits.'}), 400

    # Cache check
    key = _cache_key(payload)
    if key in _CACHE:
        return jsonify(_CACHE[key])

    gates = payload.get('gates', {}) or {}
    multi = payload.get('multiQubitGates', []) or []
    measurements = payload.get('measurements', []) or []

    if isinstance(gates, dict):
        gate_iter = gates.values()
    else:
        gate_iter = gates

    all_ops = (
        [_normalize_gate(g) for g in gate_iter if isinstance(g, dict)]
        + [_normalize_gate(g) for g in multi if isinstance(g, dict)]
        + [_normalize_gate(m) for m in measurements if isinstance(m, dict)]
    )
    all_ops.sort(key=lambda op: int(op.get('timestep', 0)))

    # Group by timestep so each column is a unit
    columns = _group_by_timestep(all_ops)
    if len(columns) > MAX_COLUMNS:
        columns = columns[:MAX_COLUMNS]

    # Walk the circuit column-by-column, applying one column at a time.
    cumulative: List[Dict[str, Any]] = []
    applied_so_far: List[Dict[str, Any]] = []
    final_state: Optional[np.ndarray] = None

    # Initial state |0...0>
    init_state = np.zeros(2 ** num_qubits, dtype=np.complex128)
    init_state[0] = 1.0

    cumulative.append(_column_narrative(
        column_index=-1,
        column_steps=[],
        state=init_state,
        num_qubits=num_qubits,
    ))
    cumulative[-1]['gates_applied'] = ['(initial state |0…0>)']
    cumulative[-1]['summary'] = f"All qubits initialised to |0> (state |{'0' * num_qubits}>)."

    for col_idx, (t, col_steps) in enumerate(columns):
        applied_so_far.extend(col_steps)
        # Skip measurements when computing the unitary state evolution; they collapse
        # the state and are non-deterministic. We still list them in gates_applied.
        unitary_ops = [s for s in applied_so_far if str(s.get('gateType', '')).upper() not in ('M', 'MEASUREMENT')]
        try:
            executor = CircuitExecutor()
            _, state = executor.execute(num_qubits, unitary_ops, noise_level=0.0)
        except Exception as exc:  # pragma: no cover - guard against bad gates
            return jsonify({'error': f'Simulation failed at column {col_idx}: {exc}'}), 400
        final_state = state
        narrative = _column_narrative(
            column_index=t,
            column_steps=col_steps,
            state=state,
            num_qubits=num_qubits,
        )
        cumulative.append(narrative)

    if final_state is None:
        final_state = init_state

    # Whole-circuit verdict + entanglement edges from the final state
    verdict = _circuit_verdict(final_state, num_qubits)
    edges = _entanglement_edges(final_state, num_qubits) if num_qubits >= 2 else []

    probs = np.abs(final_state) ** 2
    top_outcomes = sorted(
        [(format(i, f'0{num_qubits}b'), float(p)) for i, p in enumerate(probs) if p > 1e-4],
        key=lambda kv: kv[1],
        reverse=True,
    )[:8]

    result = {
        'hash': key,
        'num_qubits': num_qubits,
        'num_columns': len(columns),
        'verdict': verdict,
        'columns': cumulative,
        'entanglement_edges': edges,
        'top_outcomes': [{'state': s, 'probability': round(p, 6)} for s, p in top_outcomes],
    }

    # Bounded cache
    if len(_CACHE) >= _CACHE_MAX:
        _CACHE.pop(next(iter(_CACHE)))
    _CACHE[key] = result

    return jsonify(result)
