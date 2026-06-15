# Qcuit API Reference

Base URL: `http://localhost:5001` for local development. The React app on
`http://localhost:3001` proxies `/api/*` requests to that backend through
`website/frontend/package.json`.

---

## Local Health

### GET `/health`

Use this before debugging the frontend. If this endpoint is not reachable, the
visualizer cannot connect to the backend.

**Response (200):**
```json
{
  "status": "ok",
  "service": "qcuit-api",
  "version": "2.0.0",
  "environment": "development"
}
```

### Local smoke commands

```bash
make backend
curl -sS http://localhost:5001/health
curl -sS http://localhost:5001/api/health
```

---

## Simulation

### POST `/api/simulate`

Run a quantum circuit simulation.

**Request:**
```json
{
  "numQubits": 2,
  "numClassical": 2,
  "gates": {
    "h-0-0": { "id": "h-0-0", "gateType": "H", "target": 0, "timestep": 0 }
  },
  "multiQubitGates": [
    { "id": "cx1", "gateType": "CNOT", "control": 0, "target": 1, "timestep": 1 }
  ],
  "measurements": [],
  "noiseLevel": 0
}
```

**Response (200):**
```json
{
  "probabilities": { "00": 0.5, "11": 0.5 },
  "code": {
    "qiskit": "from qiskit import QuantumCircuit...",
    "braket": "from braket.circuits import Circuit...",
    "openqasm": "OPENQASM 3.0;..."
  }
}
```

The backend also accepts normalized payloads with `qubit`, `controls`, and
`targets`. The frontend often sends `target`/`control`; the API normalizes that
shape before simulation, code export, optimization, transpilation, and resource
estimation.

### POST `/api/statevector`

Get statevector and Q-Sphere data.

**Request:**
```json
{
  "numQubits": 2,
  "gates": { "h-0-0": { "id": "h1", "gateType": "H", "target": 0, "timestep": 0 } },
  "multiQubitGates": []
}
```

**Response (200):**
```json
{
  "qsphere": [
    { "state": "00", "magnitude": 0.707, "phase": 0, "probability": 0.5 },
    { "state": "01", "magnitude": 0.707, "phase": 0, "probability": 0.5 }
  ],
  "num_states": 2
}
```

### POST `/api/optimize`

Optimize a circuit's gate count.

**Request:**
```json
{
  "gates": { ... },
  "multiQubitGates": [ ... ],
  "level": 1
}
```

**Response (200):**
```json
{
  "original_count": 5,
  "optimized_count": 3,
  "gates_removed": 2,
  "optimized_circuit": [ ... ]
}
```

### POST `/api/transpile`

Transpile circuit for a hardware backend.

**Request:**
```json
{
  "gates": { ... },
  "multiQubitGates": [ ... ],
  "numQubits": 5,
  "backend": "linear"
}
```

**Response (200):**
```json
{
  "backend": "linear",
  "num_swaps": 2,
  "original_depth": 4,
  "transpiled_depth": 6,
  "transpiled_circuit": [ ... ],
  "layout": { "0": 2, "1": 3 }
}
```

### POST `/api/estimate`

Estimate hardware resources.

**Request:**
```json
{
  "gates": { ... },
  "multiQubitGates": [ ... ],
  "numQubits": 5,
  "backend": "ibm_brisbane"
}
```

**Response (200):**
```json
{
  "backend": "ibm_brisbane",
  "num_qubits": 5,
  "gate_count": 7,
  "single_qubit_gates": 5,
  "two_qubit_gates": 2,
  "estimated_time_ns": 780,
  "estimated_fidelity": 0.98,
  "circuit_depth": 4
}
```

### POST `/api/dynamic`

Run a dynamic circuit with mid-circuit measurement.

**Request:**
```json
{
  "numQubits": 2,
  "numClassical": 2,
  "gates": { ... },
  "multiQubitGates": [ ... ],
  "measurements": [ ... ],
  "shots": 1000
}
```

**Response (200):**
```json
{
  "probabilities": { "00": 0.5, "11": 0.5 },
  "counts": { "00": 512, "11": 488 },
  "shots": 1000
}
```

## Deterministic Circuit Explainer

### POST `/api/explain`

Analyze the current circuit without an external AI service. This endpoint is
pure Python, deterministic, and local-only.

**Request:**
```json
{
  "numQubits": 2,
  "numClassical": 2,
  "gates": { "h-0-0": { "id": "h-0-0", "gateType": "H", "target": 0, "timestep": 0 } },
  "multiQubitGates": [
    { "id": "cx1", "gateType": "CNOT", "control": 0, "target": 1, "timestep": 1 }
  ]
}
```

**Response (200):**
```json
{
  "verdict": "2-qubit entangled state",
  "columns": [ ... ],
  "entanglement_edges": [ ... ],
  "top_outcomes": [ ... ]
}
```

---

## Legacy content endpoints

Older deployments may still expose `/api/posts`, but the active public frontend now routes people
to the library docs, Learn, Visualizer, and QML Lab instead of a publishing surface.

---

## Authentication

### POST `/api/auth/register`

```json
{ "username": "alice", "email": "alice@example.com", "password": "securepass" }
```

### POST `/api/auth/login`

```json
{ "email": "alice@example.com", "password": "securepass" }
```

**Response:** `{ "token": "eyJ..." }`

### GET `/api/auth/me`

**Header:** `Authorization: Bearer <token>`

**Response:** `{ "user_id": 1, "username": "alice", "role": "user" }`
