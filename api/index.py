from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from circuit_executor import run_simulation
from code_generator import generate_qiskit_code, generate_braket_code, generate_openqasm_code
from optimizer import optimize_circuit
from transpiler import Transpiler, estimate_resources
from dynamic_circuits import run_dynamic_simulation

# Serve React build from frontend/build
static_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'build')
app = Flask(__name__, static_folder=static_folder, static_url_path='')


def normalize_gate(gate):
    """Normalize gate format from frontend (control/target) to backend (controls/targets)."""
    normalized = dict(gate)
    if 'control' in normalized and 'controls' not in normalized:
        normalized['controls'] = [normalized.pop('control')]
    if 'target' in normalized and 'targets' not in normalized:
        normalized['targets'] = [normalized.pop('target')]
    if 'control2' in normalized:
        if 'controls' not in normalized:
            normalized['controls'] = []
        normalized['controls'].append(normalized.pop('control2'))
    return normalized

CORS(app)

@app.route("/api/simulate", methods=["POST"])
def simulate():
    try:
        # 1. Get the new state object from the frontend
        data = request.json
        num_qubits = data['numQubits']
        num_classical = data['numClassical']
        # Extract and normalize noise level from request; accept 0-1 or 0-100
        noise_level_raw = data.get('noiseLevel', 0.0)
        try:
            noise_level = float(noise_level_raw)
        except (TypeError, ValueError):
            noise_level = 0.0
        # If value looks like a percentage (e.g., 10 for 10%), convert to 0.1
        if noise_level > 1.0:
            noise_level = noise_level / 100.0
        # Clamp to [0,1]
        noise_level = max(0.0, min(1.0, noise_level))
        gates = data.get('gates', {})
        multi_gates = data.get('multiQubitGates', [])
        measurements = data.get('measurements', [])

        # 2. Combine all operations into a single list and sort by timestep
        all_ops = (
            [normalize_gate(g) for g in gates.values()] +
            [normalize_gate(g) for g in multi_gates] +
            [normalize_gate(m) for m in measurements]
        )
        processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))

        # 3. Run the simulation with the processed steps
        probabilities, final_state = run_simulation(num_qubits, processed_steps, noise_level)

        # 4. Generate code (pass num_classical for measurement registers)
        code_qiskit = generate_qiskit_code(num_qubits, num_classical, processed_steps)
        code_braket = generate_braket_code(num_qubits, num_classical, processed_steps)
        code_openqasm = generate_openqasm_code(num_qubits, num_classical, processed_steps)

        # 5. Send the results back
        return jsonify({
            "probabilities": probabilities,
            "code": {
                "qiskit": code_qiskit,
                "braket": code_braket,
                "openqasm": code_openqasm
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/optimize", methods=["POST"])
def optimize():
    """Optimize a circuit using DAG-based passes."""
    try:
        data = request.json
        gates = data.get('gates', {})
        multi_gates = data.get('multiQubitGates', [])
        level = data.get('level', 1)
        
        all_ops = list(gates.values()) + multi_gates
        processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
        
        optimized = optimize_circuit(processed_steps, level=level)
        
        return jsonify({
            "original_count": len(processed_steps),
            "optimized_count": len(optimized),
            "gates_removed": len(processed_steps) - len(optimized),
            "optimized_circuit": optimized
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/transpile", methods=["POST"])
def transpile():
    """Transpile circuit for a hardware backend."""
    try:
        data = request.json
        gates = data.get('gates', {})
        multi_gates = data.get('multiQubitGates', [])
        num_qubits = data.get('numQubits', 5)
        backend = data.get('backend', 'linear')
        
        all_ops = list(gates.values()) + multi_gates
        processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
        
        transpiler = Transpiler(backend=backend)
        result = transpiler.transpile(processed_steps, num_qubits)
        
        # Convert gates to serializable format
        transpiled_gates = [
            {
                'gateType': g.gate_type,
                'qubits': g.qubits,
                'timestep': g.timestep,
                'params': g.params
            }
            for g in result.gates
        ]
        
        return jsonify({
            "backend": result.backend,
            "num_swaps": result.num_swaps,
            "original_depth": result.original_depth,
            "transpiled_depth": result.transpiled_depth,
            "transpiled_circuit": transpiled_gates,
            "layout": result.layout.logical_to_physical
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/estimate", methods=["POST"])
def estimate():
    """Estimate hardware resources for a circuit."""
    try:
        data = request.json
        gates = data.get('gates', {})
        multi_gates = data.get('multiQubitGates', [])
        num_qubits = data.get('numQubits', 5)
        backend = data.get('backend', 'ibm_brisbane')
        
        all_ops = list(gates.values()) + multi_gates
        
        result = estimate_resources(all_ops, num_qubits, backend)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/statevector", methods=["POST"])
def get_statevector():
    """Get the full statevector for visualization."""
    try:
        data = request.json
        num_qubits = data['numQubits']
        gates = data.get('gates', {})
        multi_gates = data.get('multiQubitGates', [])
        
        all_ops = [normalize_gate(g) for g in gates.values()] + [normalize_gate(g) for g in multi_gates]
        processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
        
        probabilities, statevector = run_simulation(num_qubits, processed_steps, 0.0)
        
        # Convert to Q-Sphere format (magnitude and phase for each basis state)
        qsphere_data = []
        for i, amplitude in enumerate(statevector):
            magnitude = abs(amplitude)
            if magnitude > 1e-10:
                phase = float(import_cmath().phase(amplitude))
                bitstring = format(i, f'0{num_qubits}b')
                qsphere_data.append({
                    'state': bitstring,
                    'magnitude': float(magnitude),
                    'phase': phase,
                    'probability': float(magnitude ** 2)
                })
        
        return jsonify({
            "qsphere": qsphere_data,
            "num_states": len(qsphere_data)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


def import_cmath():
    import cmath
    return cmath


@app.route("/api/dynamic", methods=["POST"])
def dynamic():
    """Run a dynamic circuit with mid-circuit measurement."""
    try:
        data = request.json
        num_qubits = data['numQubits']
        num_classical = data.get('numClassical', num_qubits)
        gates = data.get('gates', {})
        multi_gates = data.get('multiQubitGates', [])
        measurements = data.get('measurements', [])
        shots = data.get('shots', 1000)
        
        all_ops = list(gates.values()) + multi_gates + measurements
        processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
        
        probabilities, counts = run_dynamic_simulation(
            num_qubits, num_classical, processed_steps, shots
        )
        
        return jsonify({
            "probabilities": probabilities,
            "counts": counts,
            "shots": shots
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# Serve React App - catch-all route for client-side routing
@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
