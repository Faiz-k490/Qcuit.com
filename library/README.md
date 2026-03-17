# Qcuit Python Library

> The most beginner-friendly quantum computing library. Write quantum code in plain English.

## Install

```bash
pip install qcuit
```

Requires Python 3.10+ · Built on Qiskit

## Quick Start

```python
from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

a = Qubit("a")
b = Qubit("b")

circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))
circ.add(Apply(CNOT, target=b, control=a))

circ.measure_all()
results = run_simulation(circ)
print(results)  # {"00": ~512, "11": ~512}
```

## Project Structure

```
library/
├── qcuit/
│   ├── __init__.py    # Public API: Qubit, Circuit, Apply, gates
│   ├── core.py        # Qubit, Circuit, Apply classes
│   ├── gates.py       # Gate definitions (Hadamard, PauliX, CNOT, etc.)
│   └── backend.py     # Qiskit AerSimulator integration
├── examples/
│   └── hello_quantum.py
├── pyproject.toml     # Package metadata
└── CONTRIBUTING.md    # How to contribute
```

## API

| Class | Purpose |
|-------|---------|
| `Qubit(name)` | Named qubit register |
| `Circuit(*qubits)` | Container: `.add()`, `.measure_all()`, `.draw()` |
| `Apply(gate, target, control=None)` | Gate application |
| `run_simulation(circuit, shots=1024)` | Execute on AerSimulator |

## Gates

**Single-qubit:** `Hadamard`, `PauliX`, `PauliY`, `PauliZ`, `S`, `T`, `RX`, `RY`, `RZ`

**Multi-qubit:** `CNOT`, `SWAP`, `Toffoli`

## Error Messages

Qcuit provides friendly errors:

```python
Apply(CNOT, target=q)       # QcuitError: Try: Apply(CNOT, target=q_b, control=q_a)
Qubit("")                   # QcuitError: Try: Qubit("my_qubit")
run_simulation(circ)        # QcuitError: Try: circ.measure_all()
```

## Development

```bash
cd library
pip install -e .
python examples/hello_quantum.py
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add gates and submit PRs.
