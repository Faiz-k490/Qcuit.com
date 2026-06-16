# Qcuit Browser Companion

> Website, docs, visualizer, and QML Lab for the `qcuit` Python library.

**Live:** [qcuit.com](https://qcuit.com)

## Features

- Professional landing page for the open-source pip library
- Searchable documentation and function reference
- Integrated Learn -> Visualize -> QML Lab workflow
- Drag-and-drop gate placement on circuit canvas
- Real-time statevector simulation with configurable noise
- Code export: Qiskit, Braket, OpenQASM
- Visualizations: probabilities, Q-Sphere, Bloch sphere, entanglement graph
- QML Lab panels for trainers, QNNs, notebook artifacts, noise, QEC, and pulse tools

## Run Locally

```bash
# From repo root
make frontend      # React on :3001
make backend       # Flask on :5001
```

Manual setup is also available:

```bash
cd website
pip install -r requirements.txt
PYTHONPATH=. python3 api/index.py

cd frontend && npm install
npm start
```

The frontend proxies API requests to `:5001` via the `proxy` field in `package.json`.
Start both processes for the visualizer, QML Lab, notebook panel, state views,
resource panel, and deterministic circuit explainer to work locally.

## Architecture

### Backend (`api/`)

```
api/
├── __init__.py           # Flask app factory + simulation routes
├── index.py              # Entry point
├── config.py             # Environment configs (dev/test/prod)
├── models.py             # SQLAlchemy models for optional auth/legacy DB use
├── circuit_executor.py   # Simulation orchestrator (kernel selection)
├── code_generator.py     # Qiskit/Braket/OpenQASM code generation
├── optimizer/            # DAG-based circuit optimization
├── transpiler/           # Hardware-aware transpilation (SABRE routing)
├── simulator.py          # Alternative simulation engine
├── dynamic_circuits.py   # Mid-circuit measurement support
├── diffsim/              # Parameter-shift and differentiable simulation tools
├── noise/                # Calibration-aware noise utilities
├── notebook/             # Reproducible notebook/run artifacts
├── pulse/                # Pulse presets and solver helpers
├── qec/                  # Error-correction codes, decoders, simulator
├── qnn/                  # Encoders, ansatze, presets, exports
├── kernels/
│   ├── statevector.py    # Exact statevector kernel (bit-masking)
│   ├── kernel_manager.py # Kernel selection strategy pattern
│   └── noise_model.py    # Depolarizing, T1/T2 noise simulation
└── routes/
    ├── auth.py           # JWT authentication (register/login)
    ├── user.py           # User profiles
    ├── explain.py        # Circuit explanations
    ├── noise.py          # Noise Lab API
    ├── notebook.py       # Notebook artifacts
    ├── pulse.py          # Pulse Lab API
    ├── qec.py            # QEC API
    ├── qnn.py            # QNN Workbench API
    └── trainer.py        # QML Trainer API
```

### Frontend (`frontend/src/`)

```
src/
├── AppRouter.tsx          # Pathname-based routing
├── App.v5.tsx             # Visualizer workbench
├── pages/
│   ├── LandingPage.tsx    # Library homepage with quick start
│   ├── Documentation.tsx  # Developer documentation
│   ├── Exploratorium.tsx  # Learn surface
│   ├── Lab.tsx            # QML Lab shell
│   └── NotebookView.tsx   # Read-only notebook route
├── components/
│   ├── SiteNav.tsx        # Shared package-site navigation
│   ├── CircuitCanvas.tsx  # Konva-based canvas for circuit editing
│   ├── CircuitExplainer.tsx # Deterministic local explanation panel
│   ├── OutputDisplay.tsx  # Simulation results display
│   ├── QSphere.tsx        # 3D Q-Sphere (Three.js)
│   ├── BlochSphere.tsx    # Bloch sphere visualization
│   ├── SmartPopover.tsx   # Viewport-aware tooltips
│   └── widgets/           # Lesson widgets used by Learn
├── store/
│   └── CircuitContext.tsx # React context for circuit state
└── hooks/
    ├── useMode.ts         # Learn / Visualize / Lab mode persistence
    ├── useSSEStream.ts    # Streaming API helper
    └── useHoverPosition.ts # Smart positioning hook
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health`, `/api/health` | Local backend health check |
| POST | `/api/simulate` | Run circuit simulation |
| POST | `/api/statevector` | Get statevector + Q-Sphere data |
| POST | `/api/optimize` | Optimize gate count |
| POST | `/api/transpile` | Transpile for hardware topology |
| POST | `/api/estimate` | Resource estimation |
| POST | `/api/dynamic` | Dynamic circuit simulation |
| POST | `/api/explain` | Deterministic circuit explanation, no external AI |
| POST | `/api/noise/*` | Noise Lab helpers |
| POST | `/api/trainer/*` | QML training helpers |
| POST | `/api/qnn/*` | QNN workbench helpers |
| POST | `/api/qec/*` | Error-correction helpers |
| POST | `/api/pulse/*` | Pulse Lab helpers |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Flask session signing |
| `JWT_SECRET_KEY` | JWT token signing |
| `DATABASE_URL` | Optional Postgres connection for auth/user/blog routes |
| `FLASK_ENV` | `development` or `production` |

## Local Verification

```bash
make backend
curl -sS http://localhost:5001/health

cd website
PYTHONPATH=. python3 -m pytest api/tests/test_visualizer_connectivity.py
```

## Deployment

The browser companion deploys as one Vercel project:

- **Frontend:** static React build from `website/frontend`
- **Backend:** Python Serverless Function at root `api/index.py`
- **Routing:** `vercel.json` sends `/api/*` and `/health` to the function

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for detailed instructions.
