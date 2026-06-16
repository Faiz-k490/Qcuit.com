<div align="center">

# Qcuit

*Open-source Python tooling for quantum ML, Lorentz-aware HEP workflows, and reproducible benchmarks.*

[![CI](https://github.com/Faiz-k490/Qcuit.com/actions/workflows/ci.yml/badge.svg)](https://github.com/Faiz-k490/Qcuit.com/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-C5A059.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-0A1F1C.svg)](https://python.org)
[![Website](https://img.shields.io/badge/qcuit.com-live-C5A059.svg)](https://qcuit.com)

[Website](https://qcuit.com) · [PyPI](https://pypi.org/project/qcuit) · [GitHub](https://github.com/Faiz-k490/Qcuit.com)

</div>

---

Qcuit is a pip-first quantum ML toolkit. The active project centers on importable Python modules for readable circuits, HEP jet graph workflows, Lorentz-aware models, hybrid quantum layers, and benchmark reports. The browser app is optional support for docs, teaching, visualization, and local checks.

## Project Surfaces

Open the repo with this mental model:

| Surface | Directory | Role |
|---------|-----------|------|
| Python package | [`library/`](library/) | The product: `qcuit`, HEP data, models, quantum layers, benchmarks |
| Browser companion | [`website/`](website/) | Website, docs UI, visualizer, QML Lab, local API helpers |
| Contributor docs | [`docs/`](docs/) | Architecture, repo map, deployment, historical archive |
| Developer scripts | [`scripts/`](scripts/) | Local bootstrap utilities |

If a change affects importable research behavior, start in `library/`. If it only helps explain, teach, visualize, or locally inspect the library, start in `website/`. Retired content lives only in `docs/_archive/`.

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

### HEP / QML Benchmark

```bash
cd library
pip install -e ".[hep,qml,dev]"
qcuit-lie-eqgnn-demo --epochs 10 --backend torch
```

### Optional Browser Companion

```bash
make frontend
```

Then open `http://localhost:3001`. The public information architecture is:

```text
/          Package landing page for QML researchers
/docs      Install guide and API reference
/explore   Guided lessons
/visualizer Optional circuit visualizer
/lab       Browser companion for QML checks
```

## Architecture

```text
Qcuit.com/
├── library/             Python package (pip install qcuit)
│   ├── qcuit/           core.py · hep/ · models/ · quantum/ · benchmarks.py
│   ├── examples/
│   └── pyproject.toml
│
├── website/              Browser companion
│   ├── api/             Backend routes — simulation, notebooks, QNN, QEC
│   │   ├── kernels/     Statevector engine, noise model, Clifford
│   │   ├── optimizer/   DAG-based gate cancellation + merging
│   │   ├── transpiler/  SABRE routing for hardware topologies
│   │   └── routes/      Simulation, trainer, noise, QNN, QEC, pulse
│   └── frontend/        React — package site, docs, visualizer, lab
│       └── src/
│           ├── pages/       Landing, Docs, Learn, Visualizer, QML Lab
│           ├── components/  CircuitCanvas, QSphere, BlochSphere, Explainer
│           └── store/       CircuitContext (React Context)
│
├── api/                 Vercel serverless entry (index.py wraps the Flask app)
├── docs/                Architecture, deployment, repo map
│   └── _archive/        Retired notes, old journal frontend, historical docs
├── scripts/             setup_dev.sh
├── vercel.json          Vercel build + routing (frontend + /api function)
└── Procfile             Heroku (alternative container hosting)
```

The simulation pipeline: the frontend sends a circuit description via `POST /api/simulate`. The backend normalizes gate formats, selects a kernel (statevector for small circuits, Clifford for stabilizer circuits), optionally applies noise, generates equivalent code in Qiskit/Braket/OpenQASM, and returns probabilities alongside exportable source.

For a deeper walkthrough, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Deployment

The companion site deploys as a **single Vercel project** — the React build is served as static assets and the Flask API runs as a Python serverless function. All secrets live in environment variables; nothing is committed to the repository.

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend + Backend | Vercel | [`vercel.json`](vercel.json) at repo root |
| Serverless entry | Vercel Function | [`api/index.py`](api/index.py) wraps the Flask app |
| Database (auth/blog) | Postgres (Vercel/Neon) | Set `DATABASE_URL` env var |

The quantum tools (simulate, explain, QNN, QEC, pulse, noise) run without a database; only auth/blog need `DATABASE_URL`. A Heroku `Procfile` is also kept for container-style hosting. Step-by-step instructions: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/REPO_MAP.md](docs/REPO_MAP.md) for the full guide. The short version:

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com
make help
make verify
```

`make verify` runs library tests, Flask/API tests, and a production frontend build.
To add Python library features, see [library/CONTRIBUTING.md](library/CONTRIBUTING.md). To improve the visualizer or website, start in `website/frontend/src/`.

---

## License

[MIT](LICENSE)

---

Built by [Faizan](https://github.com/Faiz-k490).
