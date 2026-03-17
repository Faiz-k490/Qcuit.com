"""
Qcuit Platform — Application Factory
Creates and configures the Flask application using the factory pattern.
"""

import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS


def create_app(config_name=None):
    """Application Factory: create and configure the Flask app."""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    # Resolve static folder for serving React build
    static_folder = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'build'
    )

    app = Flask(__name__, static_folder=static_folder, static_url_path='')

    # Load configuration
    from api.config import config_by_name
    app.config.from_object(config_by_name.get(config_name, config_by_name['development']))

    # Initialize extensions
    CORS(app)

    # Initialize database (only if SQLAlchemy URI is configured)
    if app.config.get('SQLALCHEMY_DATABASE_URI'):
        from api.models import db
        db.init_app(app)
        with app.app_context():
            db.create_all()

    # Register Blueprints
    from api.routes.auth import auth_bp
    from api.routes.blog import blog_bp
    from api.routes.user import user_bp
    from api.routes.agent import agent_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(blog_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(agent_bp)

    # ── Simulation API routes (preserved from original index.py) ──
    _register_simulation_routes(app)

    # ── Catch-all for React client-side routing ──
    @app.route('/')
    def serve():
        if app.static_folder and os.path.exists(
            os.path.join(app.static_folder, 'index.html')
        ):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({
            'status': 'API running',
            'message': "Frontend build not found. Run 'npm run build' in frontend/",
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        if app.static_folder and os.path.exists(
            os.path.join(app.static_folder, 'index.html')
        ):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({'error': 'Not found'}), 404

    return app


def _register_simulation_routes(app):
    """Register the original quantum simulation API routes on the app."""
    from flask import request as flask_request

    
    def normalize_gate(gate):
        """Normalize gate format from frontend to backend."""
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

    def _import_cmath():
        import cmath
        return cmath

    @app.route('/api/simulate', methods=['POST'])
    def simulate():
        from api.circuit_executor import run_simulation
        from api.code_generator import (
            generate_qiskit_code, generate_braket_code, generate_openqasm_code
        )
        try:
            data = flask_request.json
            num_qubits = data['numQubits']
            num_classical = data['numClassical']
            noise_level_raw = data.get('noiseLevel', 0.0)
            try:
                noise_level = float(noise_level_raw)
            except (TypeError, ValueError):
                noise_level = 0.0
            if noise_level > 1.0:
                noise_level = noise_level / 100.0
            noise_level = max(0.0, min(1.0, noise_level))
            gates = data.get('gates', {})
            multi_gates = data.get('multiQubitGates', [])
            measurements = data.get('measurements', [])

            all_ops = (
                [normalize_gate(g) for g in gates.values()] +
                [normalize_gate(g) for g in multi_gates] +
                [normalize_gate(m) for m in measurements]
            )
            processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
            probabilities, final_state = run_simulation(
                num_qubits, processed_steps, noise_level
            )

            code_qiskit = generate_qiskit_code(num_qubits, num_classical, processed_steps)
            code_braket = generate_braket_code(num_qubits, num_classical, processed_steps)
            code_openqasm = generate_openqasm_code(num_qubits, num_classical, processed_steps)

            return jsonify({
                'probabilities': probabilities,
                'code': {
                    'qiskit': code_qiskit,
                    'braket': code_braket,
                    'openqasm': code_openqasm,
                },
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/optimize', methods=['POST'])
    def optimize():
        from api.optimizer import optimize_circuit
        try:
            data = flask_request.json
            gates = data.get('gates', {})
            multi_gates = data.get('multiQubitGates', [])
            level = data.get('level', 1)
            all_ops = list(gates.values()) + multi_gates
            processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
            optimized = optimize_circuit(processed_steps, level=level)
            return jsonify({
                'original_count': len(processed_steps),
                'optimized_count': len(optimized),
                'gates_removed': len(processed_steps) - len(optimized),
                'optimized_circuit': optimized,
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/transpile', methods=['POST'])
    def transpile():
        from api.transpiler import Transpiler, estimate_resources
        try:
            data = flask_request.json
            gates = data.get('gates', {})
            multi_gates = data.get('multiQubitGates', [])
            num_qubits = data.get('numQubits', 5)
            backend = data.get('backend', 'linear')
            all_ops = list(gates.values()) + multi_gates
            processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
            transpiler = Transpiler(backend=backend)
            result = transpiler.transpile(processed_steps, num_qubits)
            transpiled_gates = [
                {
                    'gateType': g.gate_type,
                    'qubits': g.qubits,
                    'timestep': g.timestep,
                    'params': g.params,
                }
                for g in result.gates
            ]
            return jsonify({
                'backend': result.backend,
                'num_swaps': result.num_swaps,
                'original_depth': result.original_depth,
                'transpiled_depth': result.transpiled_depth,
                'transpiled_circuit': transpiled_gates,
                'layout': result.layout.logical_to_physical,
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/estimate', methods=['POST'])
    def estimate():
        from api.transpiler import Transpiler, estimate_resources
        try:
            data = flask_request.json
            gates = data.get('gates', {})
            multi_gates = data.get('multiQubitGates', [])
            num_qubits = data.get('numQubits', 5)
            backend = data.get('backend', 'ibm_brisbane')
            all_ops = list(gates.values()) + multi_gates
            result = estimate_resources(all_ops, num_qubits, backend)
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/statevector', methods=['POST'])
    def get_statevector():
        from api.circuit_executor import run_simulation
        try:
            data = flask_request.json
            num_qubits = data['numQubits']
            gates = data.get('gates', {})
            multi_gates = data.get('multiQubitGates', [])
            all_ops = (
                [normalize_gate(g) for g in gates.values()] +
                [normalize_gate(g) for g in multi_gates]
            )
            processed_steps = sorted(all_ops, key=lambda op: op.get('timestep', 0))
            probabilities, statevector = run_simulation(num_qubits, processed_steps, 0.0)
            qsphere_data = []
            for i, amplitude in enumerate(statevector):
                magnitude = abs(amplitude)
                if magnitude > 1e-10:
                    phase = float(_import_cmath().phase(amplitude))
                    bitstring = format(i, f'0{num_qubits}b')
                    qsphere_data.append({
                        'state': bitstring,
                        'magnitude': float(magnitude),
                        'phase': phase,
                        'probability': float(magnitude ** 2),
                    })
            return jsonify({
                'qsphere': qsphere_data,
                'num_states': len(qsphere_data),
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 400

    @app.route('/api/dynamic', methods=['POST'])
    def dynamic():
        from api.dynamic_circuits import run_dynamic_simulation
        try:
            data = flask_request.json
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
                'probabilities': probabilities,
                'counts': counts,
                'shots': shots,
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 400
