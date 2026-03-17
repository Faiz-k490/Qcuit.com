# Qcuit

> Write quantum code in plain English. Built on Qiskit. 100% open source.

**Website:** [qcuit.com](https://qcuit.com) · **PyPI:** [pypi.org/project/qcuit](https://pypi.org/project/qcuit) · **GitHub:** [Faiz-k490/Qcuit.com](https://github.com/Faiz-k490/Qcuit.com)

---

## Repository

| Directory | What | Docs |
|-----------|------|------|
| [`library/`](library/) | Python package (`pip install qcuit`) | [README](library/README.md) · [CONTRIBUTING](library/CONTRIBUTING.md) |
| [`studio/`](studio/) | Web app — circuit builder, simulator, AI tutor | [README](studio/README.md) |
| [`journal/`](journal/) | Article drafts & publishing tools | [README](journal/README.md) |
| [`docs/`](docs/) | Architecture, deployment, API reference | [ARCHITECTURE](docs/ARCHITECTURE.md) · [DEPLOYMENT](docs/DEPLOYMENT.md) · [API](docs/API_REFERENCE.md) |

---

## Quick Start

### Python Library

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

### Studio (Local Development)

```bash
bash scripts/setup_dev.sh        # One-command setup

# Or manually:
pip install -r studio/requirements.txt
cd studio && PYTHONPATH=. python3 api/index.py   # Backend :5001
cd studio/frontend && npm start                   # Frontend :3000
```

### Publish an Article

```bash
PYTHONPATH=studio python3 journal/scripts/publish_article.py \
  --draft journal/drafts/my-article.md \
  --title "My Article" --category Tutorial
```

---

## Deployment

- **Backend:** Heroku — `Procfile` at repo root
- **Frontend:** Vercel — `vercel.json` at repo root
- **Secrets:** All API keys via environment variables (never in code)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step instructions.

---

## Contributing

**Want to add gates to the Python library?** See [library/CONTRIBUTING.md](library/CONTRIBUTING.md).

**Want to improve the Studio?** See [studio/README.md](studio/README.md).

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com
bash scripts/setup_dev.sh
```

---

## License

MIT

---

Built by [Faizan](https://github.com/Faiz-k490)
