"""
Qcuit Platform — Gemini Agent Routes
POST /api/agent/tutor — AI quantum tutor powered by Gemini 2.5 Flash.
"""

import os
import json
from flask import Blueprint, request, jsonify

agent_bp = Blueprint('agent', __name__, url_prefix='/api/agent')

# ── System instruction for the Gemini model ──────────────────────
SYSTEM_INSTRUCTION = (
    "You are an expert quantum computing tutor. Your student is building a quantum circuit "
    "visually using a drag-and-drop tool.\n"
    "I will provide you with the exact visual layout they have built, translated into the "
    "beginner-friendly `qcuit` Python syntax.\n"
    "Your job is to:\n"
    "1. Explain the quantum phenomena occurring in their circuit (e.g., superposition, entanglement).\n"
    "2. Show them how to write the exact circuit they built using the `qcuit` library.\n"
    "3. Keep explanations concise, encouraging, and academic. Do not use complex Qiskit syntax "
    "unless explicitly asked. Always prefer `Qubit()`, `Circuit()`, and `Apply()`.\n"
    "4. When showing code, use fenced code blocks with the `python` language tag.\n"
    "5. Format your responses in Markdown."
)

# ── Gate-type → qcuit name mapping ───────────────────────────────
_GATE_MAP = {
    'H': 'Hadamard', 'X': 'PauliX', 'Y': 'PauliY', 'Z': 'PauliZ',
    'S': 'S', 'S†': 'Sdg', 'T': 'T', 'T†': 'Tdg', 'I': 'Identity',
    'RX': 'RX', 'RY': 'RY', 'RZ': 'RZ',
    'CNOT': 'CNOT', 'CZ': 'CZ', 'SWAP': 'SWAP', 'CCX': 'Toffoli',
}


def _qubit_name(index: int) -> str:
    """Return a readable qubit variable name: q0, q1, ..."""
    return f'q{index}'


def _circuit_state_to_qcuit(circuit_state: dict) -> str:
    """
    Translate the React CircuitState JSON into a readable qcuit Python
    representation that is fed to Gemini as context.
    """
    num_qubits = circuit_state.get('numQubits', 0)
    gates = circuit_state.get('gates', {})
    multi_gates = circuit_state.get('multiQubitGates', [])
    measurements = circuit_state.get('measurements', [])

    if num_qubits == 0:
        return '# Empty circuit — no qubits defined.'

    lines = ['from qcuit import Qubit, Circuit, Apply, Measure', '']

    # Declare qubits
    qubit_names = [_qubit_name(i) for i in range(num_qubits)]
    for name in qubit_names:
        lines.append(f'{name} = Qubit()')
    lines.append('')
    lines.append('circ = Circuit()')

    # Collect all operations and sort by timestep
    ops = []

    # Single gates
    for gate in gates.values():
        if isinstance(gate, dict):
            ops.append({
                'timestep': gate.get('timestep', 0),
                'type': 'single',
                'gate': gate,
            })

    # Multi-qubit gates
    for gate in multi_gates:
        if isinstance(gate, dict):
            ops.append({
                'timestep': gate.get('timestep', 0),
                'type': 'multi',
                'gate': gate,
            })

    # Measurements
    for m in measurements:
        if isinstance(m, dict):
            ops.append({
                'timestep': m.get('timestep', 0),
                'type': 'measurement',
                'gate': m,
            })

    ops.sort(key=lambda o: o['timestep'])

    for op in ops:
        g = op['gate']
        t = op['timestep']

        if op['type'] == 'single':
            gate_type = g.get('gateType', '?')
            qubit = g.get('qubit', 0)
            qcuit_name = _GATE_MAP.get(gate_type, gate_type)
            qname = _qubit_name(qubit)

            if gate_type in ('RX', 'RY', 'RZ'):
                theta = g.get('theta', 0)
                lines.append(
                    f'circ.add(Apply({qcuit_name}({theta:.4f}), target={qname}))  # t={t}'
                )
            else:
                lines.append(
                    f'circ.add(Apply({qcuit_name}, target={qname}))  # t={t}'
                )

        elif op['type'] == 'multi':
            gate_type = g.get('gateType', '?')
            controls = g.get('controls', [])
            targets = g.get('targets', [])
            qcuit_name = _GATE_MAP.get(gate_type, gate_type)

            if gate_type == 'SWAP' and len(targets) >= 2:
                lines.append(
                    f'circ.add(Apply({qcuit_name}, target={_qubit_name(targets[0])}, '
                    f'target2={_qubit_name(targets[1])}))  # t={t}'
                )
            elif gate_type == 'CCX' and len(controls) >= 2 and targets:
                lines.append(
                    f'circ.add(Apply({qcuit_name}, control={_qubit_name(controls[0])}, '
                    f'control2={_qubit_name(controls[1])}, '
                    f'target={_qubit_name(targets[0])}))  # t={t}'
                )
            elif controls and targets:
                lines.append(
                    f'circ.add(Apply({qcuit_name}, control={_qubit_name(controls[0])}, '
                    f'target={_qubit_name(targets[0])}))  # t={t}'
                )

        elif op['type'] == 'measurement':
            qubit = g.get('qubit', 0)
            cbit = g.get('classicalBit', 0)
            lines.append(
                f'circ.add(Measure(qubit={_qubit_name(qubit)}, cbit=c{cbit}))  # t={t}'
            )

    return '\n'.join(lines)


def _get_gemini_model():
    """Lazy-initialize the Gemini generative model."""
    try:
        import google.generativeai as genai
    except ImportError:
        return None

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return None

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        model_name='gemini-1.5-flash',
        system_instruction=SYSTEM_INSTRUCTION,
    )
    return model


@agent_bp.route('/tutor', methods=['POST'])
def tutor():
    """
    Accepts:
      - user_message (str): The student's question.
      - circuit_state (dict): Current CircuitState from React.
      - chat_history (list): Previous turns [{role, parts}].
    Returns:
      - reply (str): Gemini's Markdown response.
      - qcuit_code (str): The translated circuit context.
    """
    data = request.get_json(silent=True) or {}
    user_message = data.get('user_message', '').strip()
    circuit_state = data.get('circuit_state', {})
    chat_history = data.get('chat_history', [])

    if not user_message:
        return jsonify({'error': 'user_message is required.'}), 400

    # Translate the visual circuit to qcuit code
    qcuit_code = _circuit_state_to_qcuit(circuit_state)

    # Build the contextual user prompt
    contextual_prompt = (
        f"Here is the student's current circuit, translated into `qcuit` Python:\n"
        f"```python\n{qcuit_code}\n```\n\n"
        f"Student's question: {user_message}"
    )

    model = _get_gemini_model()
    if model is None:
        return jsonify({
            'error': 'Gemini API is not configured. Set GEMINI_API_KEY environment variable.',
            'qcuit_code': qcuit_code,
        }), 503

    try:
        # Build chat history for the SDK
        history = []
        for turn in chat_history:
            role = turn.get('role', 'user')
            parts = turn.get('parts', '')
            if isinstance(parts, str):
                parts = [parts]
            history.append({'role': role, 'parts': parts})

        chat = model.start_chat(history=history)
        response = chat.send_message(contextual_prompt)

        return jsonify({
            'reply': response.text,
            'qcuit_code': qcuit_code,
        })

    except Exception as e:
        return jsonify({
            'error': f'Gemini API error: {str(e)}',
            'qcuit_code': qcuit_code,
        }), 500
