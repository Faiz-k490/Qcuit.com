# Qcuit Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Qcuit Platform                        │
├────────────────────────────┬────────────────────────────┤
│   Library                  │   Browser Companion        │
│  (Python package)          │  (Website + Visualizer)    │
│                            │                            │
│  qcuit/                    │  React Frontend            │
│  - core.py                 │  - Landing + Docs          │
│  - hep/                    │  - Learn                   │
│  - models/                 │  - Visualizer              │
│  - quantum/                │  - QML Lab                 │
│  - benchmarks.py           │  Flask API for local tools │
└────────────────────────────┴────────────────────────────┘
```

## Repository Structure

```
Qcuit.com/
├── library/           # Python package (pip install qcuit)
│   ├── qcuit/         # Source: core.py, gates.py, backend.py
│   ├── examples/      # Usage examples
│   └── pyproject.toml # Package config
│
├── website/            # Web application
│   ├── frontend/      # React SPA
│   └── api/           # Flask backend
├── docs/              # Documentation + historical archive
├── Procfile           # Heroku deployment
└── vercel.json        # Vercel deployment
```

## Backend (Flask)

### App Factory Pattern

`website/api/__init__.py` → `create_app()` builds the Flask app:

1. Load config from environment (`development` / `production`)
2. Initialize CORS
3. Initialize SQLAlchemy (if DB URI configured)
4. Register Blueprints for auth, simulation, notebooks, QML trainers, QNNs, QEC, noise, and pulse tools
5. Register simulation routes via `_register_simulation_routes(app)`
6. Add catch-all for React client-side routing

### Simulation Pipeline

```
Frontend POST /api/simulate
    ↓
normalize_gate()          # Normalize frontend gate format
    ↓
circuit_executor.py       # Orchestrator
    ↓
KernelManager             # Selects optimal kernel
    ↓
StatevectorKernel         # Executes gates on statevector
    ↓
NoiseModel (optional)     # Applies depolarizing noise
    ↓
code_generator.py         # Generates Qiskit/Braket/OpenQASM
    ↓
JSON response             # {probabilities, code}
```

### Database Schema

**Users** — JWT auth, role-based access
- `id`, `username`, `email`, `password_hash`, `role` (user/admin)

Legacy blog and comment tables may exist in older deployments, but they are not part of the active public QML-library frontend.

## Frontend (React)

### Routing

`AppRouter.tsx` — pathname-based routing (no react-router):

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `LandingPage` | Homepage |
| `/simulator` | `App.v5` | Legacy alias for the Visualizer |
| `/visualizer` | `App.v5` | Circuit visualizer |
| `/docs` | `Documentation` | Docs |
| `/explore` | `Exploratorium` | Learning |
| `/lab` | `Lab` | QML Lab |

### Visualizer Layout (App.v5.tsx)

```
┌──────────────────────────────────────┐
│           Top Menu Bar               │
├──────┬───────────────────┬───────────┤
│ Left │    Center         │   Right   │
│ Ops  │    Circuit        │   Code    │
│ Cat. │    Canvas         │   Tabs    │
│      ├───────────────────┤           │
│      │  Bottom Viz Dock  │           │
└──────┴───────────────────┴───────────┘
```

### State Management

`CircuitContext.tsx` — React Context providing:
- Circuit state (qubits, gates, measurements)
- Simulation results (probabilities, statevector)
- Actions (addGate, removeGate, simulate, etc.)

## Design System

**Aesthetic:** Progressive Old Money / Digital Heritage

| Token | Value | Usage |
|-------|-------|-------|
| Deep Jungle | `#0A1F1C` | Backgrounds |
| Isabelline | `#F5F2EA` | Text, cards |
| Vegas Gold | `#C5A059` | Accents, CTAs |
| Charcoal | `#1C2329` | Secondary bg |

**Typography:** Playfair Display (display), Inter (body), JetBrains Mono (code)
