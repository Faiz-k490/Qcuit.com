<div align="center">

# Qcuit

*Write quantum circuits in plain English. Simulate them in your browser. Learn as you build.*

[![License: MIT](https://img.shields.io/badge/License-MIT-C5A059.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-0A1F1C.svg)](https://python.org)
[![Website](https://img.shields.io/badge/qcuit.com-live-C5A059.svg)](https://qcuit.com)

[Website](https://qcuit.com) · [PyPI](https://pypi.org/project/qcuit) · [GitHub](https://github.com/Faiz-k490/Qcuit.com)

</div>

---

Qcuit is an open-source platform for quantum computing education. It pairs a Python library that reads like English with a browser-based circuit studio — drag gates, see probabilities, export production code. Every piece is designed so that a student encountering quantum mechanics for the first time can follow along without prior knowledge, and a researcher can still find it useful.

## Reading Order

The repository is structured so you can read it front to back. Each layer builds on the one before it.

| # | Directory | Purpose | Start here |
|---|-----------|------------|------------|
| I | [`docs/`](docs/) | Architecture, deployment guide, API reference | [ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| II | [`library/`](library/) | The core Python package — `pip install qcuit` | [README](library/README.md) |
| III | [`studio/`](studio/) | Web application: circuit builder, simulator, AI tutor | [README](studio/README.md) |
| IV | [`journal/`](journal/) | Article drafts and publishing tools | [README](journal/README.md) |
| V | [`scripts/`](scripts/) | Developer setup and utilities | [setup_dev.sh](scripts/setup_dev.sh) |

**`docs/`** explains how everything fits together. **`library/`** is the foundation — a small Python package where `Qubit`, `Circuit`, and `Apply` are the only three concepts you need. **`studio/`** wraps that foundation in a visual interface: a Flask backend handles simulation, a React frontend handles the circuit canvas. **`journal/`** is the content layer — Markdown articles published to the Q-Hub. **`scripts/`** ties it all together for local development.

---

## Quick Start

### The Python Library

```bash
pip install qcuit
```

```python
from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

a, b = Qubit("a"), Qubit("b")
circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))
circ.add(Apply(CNOT, target=b, control=a))
circ.measure_all()

print(run_simulation(circ))  # {"00": ~512, "11": ~512}
```

Three classes. One import. A Bell state in six lines.

### The Studio

```bash
# One-command setup (installs Python + Node dependencies, creates .env)
bash scripts/setup_dev.sh

# Then in two terminals:
cd studio && PYTHONPATH=. python3 api/index.py    # Backend on :5001
cd studio/frontend && npm start                    # Frontend on :3000
```

### Publishing an Article

```bash
PYTHONPATH=studio python3 journal/scripts/publish_article.py \
  --draft journal/drafts/my-article.md \
  --title "My Article" --category Tutorial
```

---

## Architecture

```text
Qcuit.com/
├── library/             Python package (pip install qcuit)
│   ├── qcuit/           core.py · gates.py · backend.py
│   ├── examples/
│   └── pyproject.toml
│
├── studio/              Web application
│   ├── api/             Flask backend — simulation, auth, AI tutor
│   │   ├── kernels/     Statevector engine, noise model, Clifford
│   │   ├── optimizer/   DAG-based gate cancellation + merging
│   │   ├── transpiler/  SABRE routing for hardware topologies
│   │   └── routes/      Auth, blog, agent endpoints
│   └── frontend/        React — circuit canvas, Q-Sphere, Bloch sphere
│       └── src/
│           ├── pages/       Landing, Studio, Journal, Docs, Exploratorium
│           ├── components/  CircuitCanvas, QSphere, BlochSphere, TutorChat
│           └── store/       CircuitContext (React Context)
│
├── journal/             Article management
│   ├── drafts/          Markdown drafts + template
│   └── scripts/         publish_article.py CLI
│
├── docs/                Architecture, deployment, API reference
├── scripts/             setup_dev.sh
└── Procfile             Heroku (backend)
```

The simulation pipeline: the frontend sends a circuit description via `POST /api/simulate`. The backend normalizes gate formats, selects a kernel (statevector for small circuits, Clifford for stabilizer circuits), optionally applies noise, generates equivalent code in Qiskit/Braket/OpenQASM, and returns probabilities alongside exportable source.

For a deeper walkthrough, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Deployment

The backend runs on Heroku. The frontend is served by Vercel. All secrets live in environment variables — nothing is committed to the repository.

| Component | Platform | Config |
|-----------|----------|--------|
| Backend | Heroku | `Procfile` at repo root |
| Frontend | Vercel | Configured in dashboard |
| Database | SQLite (dev) / Postgres (prod) | Automatic via `DATABASE_URL` |

Step-by-step instructions: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide. The short version:

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com
bash scripts/setup_dev.sh
```

To add a quantum gate to the Python library, see [library/CONTRIBUTING.md](library/CONTRIBUTING.md).
To improve the Studio interface, see [studio/README.md](studio/README.md).

---

## License

[MIT](LICENSE)

---

Built by [Faizan](https://github.com/Faiz-k490).
