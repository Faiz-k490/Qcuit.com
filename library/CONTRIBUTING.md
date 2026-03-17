# Contributing to the Qcuit Python Library

## Getting Started

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com/library
pip install -e .
python examples/hello_quantum.py
```

## How to Add a New Gate

1. **Define the gate matrix** in `qcuit/gates.py`:

```python
class MyGate(Gate):
    """Description of what the gate does."""
    name = "MyGate"
    symbol = "MG"
    matrix = np.array([
        [1, 0],
        [0, 1]
    ], dtype=complex)
```

2. **Export it** in `qcuit/__init__.py`:

```python
from qcuit.gates import MyGate
```

3. **Add an example** in `examples/` showing the gate in use.

4. **Test it**:

```python
from qcuit import Qubit, Circuit, Apply, MyGate
from qcuit.backend import run_simulation

q = Qubit("test")
circ = Circuit(q)
circ.add(Apply(MyGate, target=q))
circ.measure_all()
print(run_simulation(circ))
```

## Code Style

- Type hints on all public functions
- Docstrings on all classes and public methods
- Friendly error messages via `QcuitError` (not raw exceptions)
- Keep imports minimal — the library should stay lightweight

## File Guide

| File | What It Does |
|------|-------------|
| `qcuit/__init__.py` | Public API surface — everything users import |
| `qcuit/core.py` | `Qubit`, `Circuit`, `Apply` classes |
| `qcuit/gates.py` | All gate definitions and their matrices |
| `qcuit/backend.py` | Qiskit AerSimulator wrapper |

## Pull Request Process

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/add-my-gate`
3. Make changes in `library/` only
4. Test locally with `python examples/hello_quantum.py`
5. Open a PR with a clear description of what the gate does and why

## Design Principles

- **Plain English first** — users should never need to think in matrices
- **Friendly errors** — every exception should suggest the fix
- **Minimal API** — `Qubit`, `Apply`, `Circuit` are the only three concepts needed
- **Qiskit under the hood** — we translate, not reinvent
