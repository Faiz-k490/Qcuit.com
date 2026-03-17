# Qcuit API Reference

Base URL: `https://YOUR-HEROKU-APP.herokuapp.com` (production) or `http://localhost:5001` (dev)

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
    "q_0-0": { "id": "h1", "gateType": "H", "qubit": 0, "timestep": 0 }
  },
  "multiQubitGates": [
    { "id": "cx1", "gateType": "CNOT", "controls": [0], "targets": [1], "timestep": 1 }
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
    "openqasm": "OPENQASM 2.0;..."
  }
}
```

### POST `/api/statevector`

Get statevector and Q-Sphere data.

**Request:**
```json
{
  "numQubits": 2,
  "gates": { "q_0-0": { "id": "h1", "gateType": "H", "qubit": 0, "timestep": 0 } },
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

---

## AI Tutor

### POST `/api/agent/tutor`

Chat with the Gemini-powered quantum tutor.

**Request:**
```json
{
  "message": "What is superposition?",
  "circuit_context": {
    "numQubits": 2,
    "gates": { ... }
  }
}
```

**Response (200):**
```json
{
  "response": "Superposition is a fundamental quantum principle...",
  "qcuit_code": "from qcuit import ..."
}
```

**Response (503):** Gemini API key not configured.

---

## Journal

### GET `/api/posts`

List published articles.

**Query params:** `page` (default 1), `per_page` (default 10), `category`, `topic`

**Response (200):**
```json
{
  "posts": [
    {
      "id": 3,
      "title": "Understanding Noise-Aware Circuits",
      "slug": "understanding-noise-aware-circuits",
      "abstract": "A brief introduction...",
      "author": { "name": "Faizan", "affiliation": "Qcuit" },
      "category": "Tutorial",
      "topics": ["noise", "circuits"],
      "reading_time": 1,
      "published_at": "2026-03-17T06:08:37"
    }
  ],
  "total": 1,
  "page": 1,
  "pages": 1
}
```

### GET `/api/posts/<slug>`

Get a single article by slug.

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
