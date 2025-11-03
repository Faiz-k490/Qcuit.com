from flask import Flask, request, jsonify
from flask_cors import CORS
from .simulator import run_simulation
from .code_generator import generate_qiskit_code, generate_braket_code, generate_openqasm_code

app = Flask(__name__)
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
        gates = data['gates']
        multi_gates = data['multiQubitGates']
        measurements = data['measurements']

        # 2. Combine all operations into a single list and sort by timestep
        all_ops = (
            list(gates.values()) +  # Convert dict to list of gates
            multi_gates +           # Add multi-qubit gates
            measurements           # Add measurement operations
        )
        processed_steps = sorted(all_ops, key=lambda op: op['timestep'])

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
