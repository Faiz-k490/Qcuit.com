# Qcuit Studio

> Visual quantum circuit builder with real-time simulation and code export.

**Live:** [qcuit.com/simulator](https://qcuit.com/simulator)

## Features

- Drag-and-drop gate placement on circuit canvas
- Real-time statevector simulation with configurable noise
- Code export: Qiskit, Braket, OpenQASM
- Visualization: probabilities, Q-Sphere, Bloch sphere, entanglement graph
- AI Tutor powered by Google Gemini
- Resource estimation and circuit optimization

## Run Locally

```bash
# From repo root
cd studio

# Backend
pip install -r requirements.txt
PYTHONPATH=. python3 api/index.py     # Flask on :5001

# Frontend (separate terminal)
cd frontend && npm install
npm start                              # React on :3000
```

The frontend proxies API requests to `:5001` via the `proxy` field in `package.json`.

## Architecture

### Backend (`api/`)

```
api/
├── __init__.py           # Flask app factory + simulation routes
├── index.py              # Entry point
├── config.py             # Environment configs (dev/test/prod)
├── models.py             # SQLAlchemy models (User, BlogPost, Post, Comment)
├── circuit_executor.py   # Simulation orchestrator (kernel selection)
├── code_generator.py     # Qiskit/Braket/OpenQASM code generation
├── optimizer.py          # DAG-based circuit optimization
├── transpiler.py         # Hardware-aware transpilation (SABRE routing)
├── simulator.py          # Alternative simulation engine
├── dynamic_circuits.py   # Mid-circuit measurement support
├── kernels/
│   ├── statevector.py    # Exact statevector kernel (bit-masking)
│   ├── kernel_manager.py # Kernel selection strategy pattern
│   └── noise_model.py    # Depolarizing, T1/T2 noise simulation
└── routes/
    ├── auth.py           # JWT authentication (register/login)
    ├── blog.py           # Journal article API (read-only)
    ├── user.py           # User profiles
    └── agent.py          # Gemini AI tutor endpoint
```

### Frontend (`frontend/src/`)

```
src/
├── AppRouter.tsx          # Pathname-based routing
├── App.v5.tsx             # Studio main component (4-zone layout)
├── pages/
│   ├── LandingPage.tsx    # Homepage with hero + quick start
│   ├── QHubJournal.tsx    # Journal archive + article reader
│   ├── Documentation.tsx  # Developer documentation
│   └── Exploratorium.tsx  # Interactive quantum learning
├── components/
│   ├── CircuitCanvas.tsx  # Konva-based canvas for circuit editing
│   ├── OutputDisplay.tsx  # Simulation results display
│   ├── QSphere.tsx        # 3D Q-Sphere (Three.js)
│   ├── BlochSphere.tsx    # Bloch sphere visualization
│   ├── SmartPopover.tsx   # Viewport-aware tooltips
│   └── HeroSection.tsx    # Landing page hero
├── store/
│   └── CircuitContext.tsx # React context for circuit state
└── hooks/
    └── useHoverPosition.ts # Smart positioning hook
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/simulate` | Run circuit simulation |
| POST | `/api/statevector` | Get statevector + Q-Sphere data |
| POST | `/api/optimize` | Optimize gate count |
| POST | `/api/transpile` | Transpile for hardware topology |
| POST | `/api/estimate` | Resource estimation |
| POST | `/api/dynamic` | Dynamic circuit simulation |
| POST | `/api/agent/tutor` | AI tutor chat |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API for AI Tutor |
| `SECRET_KEY` | Flask session signing |
| `JWT_SECRET_KEY` | JWT token signing |
| `DATABASE_URL` | Database connection (production) |
| `FLASK_ENV` | `development` or `production` |

## Deployment

- **Backend:** Heroku (`Procfile` at repo root)
- **Frontend:** Vercel (`vercel.json` at repo root)

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for detailed instructions.
