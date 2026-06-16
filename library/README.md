# Qcuit

> Pip-first quantum ML tooling for HEP jet graphs, Lorentz-aware models, QNNs, differentiable circuits, and readable beginner circuits.

Qcuit is being built as a research-friendly Python package first. The web app
at `qcuit.com` is a companion for documentation, teaching, visualization, and
local checks; it is not required for notebooks, CI jobs, SLURM scripts, or HPC
cluster runs.

The near-term research target is high-energy physics QML: jet graph datasets,
Lorentz-aware neural networks, hybrid quantum/classical layers, and reproducible
benchmarks that can be compared against classical baselines.

## Install

```bash
pip install qcuit
```

The base install is intentionally light and only requires NumPy. Add extras for
heavier research stacks:

```bash
pip install "qcuit[qiskit]"           # Qiskit Aer circuit simulation
pip install "qcuit[hep]"              # Torch + SciPy + scikit-learn
pip install "qcuit[hep,hep-io]"       # ROOT/HDF5 loaders with uproot/awkward/h5py
pip install "qcuit[hep,pyg]"          # PyTorch Geometric export
pip install "qcuit[hep,qml]"          # PennyLane-backed quantum layers
pip install "qcuit[all]"              # Full local research stack
```

Requires Python 3.10+.

## What Is In The Package?

| Module | Status | Purpose |
|--------|--------|---------|
| `qcuit` | stable alpha | Beginner circuit API: `Qubit`, `Circuit`, `Apply`, `Hadamard`, `CNOT` |
| `qcuit.backend` | optional | Qiskit Aer simulator bridge, installed with `qcuit[qiskit]` |
| `qcuit.diff` | package-native | NumPy statevector circuits, Hamiltonians, Adam/SGD, parameter-shift training |
| `qcuit.qnn` | package-native | Encoders, ansatze, toy datasets, QNN training, PennyLane/Qiskit-ML exporters |
| `qcuit.hep` | package-native | Jet datasets, Lorentz math, ROOT/HDF5 loaders, HEP metrics |
| `qcuit.models` | package-native | `LorentzNet`, `LGEB`, `LieEQGNN`, `QLieGEB` |
| `qcuit.quantum` | package-native | `DressedQuantumLayer` with `torch`, `pennylane`, or `auto` backends |
| `qcuit.benchmarks` | package-native | Headless classifier trainer and JSON benchmark reports |
| `qcuit.io` | package-native | Notebook/run artifact helpers shared with the website API |
| `qcuit.noise`, `qcuit.qec`, `qcuit.pulse` | prototype | Website-API backed mirrors; not yet standalone package surfaces |

## Quick Start: Bell State

Install the Qiskit extra first:

```bash
pip install "qcuit[qiskit]"
```

```python
from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

a, b = Qubit("a"), Qubit("b")

circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))
circ.add(Apply(CNOT, target=b, control=a))
circ.measure_all()

print(run_simulation(circ, shots=1024))
# Example: {"00": 510, "11": 514}
```

## Quick Start: Train A Tiny QNN

This path is package-native and runs with NumPy only.

```python
import numpy as np
from qcuit.qnn import parity_preset, qnn_train, to_pennylane

preset = parity_preset(seed=42)
events = list(qnn_train(
    preset["model"],
    preset["dataset"]["X"],
    preset["dataset"]["y"],
    preset["init_theta"],
    iterations=10,
    seed=preset["seed"],
))

final = events[-1]
print(final["loss"], final["accuracy"])
print(to_pennylane(preset["model"], np.asarray(final["params"])))
```

## Quick Start: QAOA / Differentiable Training

```python
from qcuit.diff import Adam, qaoa_maxcut_preset, train

cfg = qaoa_maxcut_preset(seed=42)
steps = list(train(
    circuit_fn=cfg["circuit_fn"],
    init_params=cfg["init_params"],
    observable=cfg["observable"],
    optimizer=Adam(lr=0.05),
    iterations=cfg["max_iter"],
    seed=cfg["seed"],
))

print(steps[-1])
```

## HEP / LieEQGNN Quick Start

```bash
pip install "qcuit[hep]"
```

```python
from qcuit.hep import toy_quark_gluon_jets
from qcuit.models import LieEQGNN
from qcuit.benchmarks import benchmark_classifier, set_seed

set_seed(11)
data = toy_quark_gluon_jets(num_jets=64, n_nodes=6)

model = LieEQGNN(
    n_scalar=data.n_scalar,
    n_hidden=4,
    n_layers=2,
    quantum_blocks=["phi_e"],
    quantum_backend="torch",  # use "pennylane" after installing qcuit[hep,qml]
)

report = benchmark_classifier(model, data, epochs=5, batch_size=8)
print(report.metrics)
```

`report.metrics` includes accuracy, ROC AUC, loss, wall-clock time,
`background_rejection@0.3`, `background_rejection@0.5`, and trainable
parameter count.

This workflow is designed for collider-style graph data and research questions
around Lorentz structure, parameter efficiency, and hybrid quantum/classical
blocks. It is not a claim of quantum advantage; it is a reproducible starting
point for comparison against strong classical baselines.

## Real Dataset Loading

With `qcuit[hep,hep-io]`, Qcuit can load common local HEP file formats:

```python
from qcuit.hep import load_top_tagging, load_jetclass

top = load_top_tagging(
    "/data/top-tagging/train.h5",
    max_nodes=200,
    limit=50_000,
)

jets = load_jetclass(
    "/data/JetClass/Pythia8_qcd.root",
    max_nodes=128,
    max_jets=50_000,
)

train_loader, val_loader, test_loader = jets.dataloaders(batch_size=32)
```

PyTorch Geometric export is available with `qcuit[hep,pyg]`:

```python
pyg_graphs = jets.to_pyg_data_list()
```

## CLI

```bash
qcuit-lie-eqgnn-demo --epochs 10 --backend torch
qcuit-lie-eqgnn-demo --epochs 10 --backend pennylane --out report.json
```

Useful flags:

| Flag | Purpose |
|------|---------|
| `--jets` | Number of toy jets |
| `--nodes` | Maximum nodes per jet |
| `--epochs` | Training epochs |
| `--batch-size` | Batch size |
| `--hidden` | Hidden dimension |
| `--layers` | LieEQGNN depth |
| `--backend` | `torch`, `pennylane`, or `auto` |
| `--out` | Optional JSON report path |

## Core API Reference

### Beginner Circuits

| API | Description |
|-----|-------------|
| `Qubit(name)` | Named quantum bit |
| `Circuit(*qubits)` | Circuit container |
| `Circuit.add(operation)` | Append a validated gate operation |
| `Circuit.measure_all()` | Measure every qubit at the end |
| `Circuit.draw()` | Print an ASCII circuit diagram |
| `Apply(gate, target, control=None)` | Gate application wrapper |
| `Hadamard`, `PauliX`, `CNOT` | Current base gates |
| `run_simulation(circuit, shots=1024)` | Execute through Qiskit Aer |

### Differentiable Circuits

| API | Description |
|-----|-------------|
| `Hamiltonian.from_terms(...)` | Weighted Pauli-string observable |
| `Hamiltonian.from_string(...)` | Parse strings like `"0.5 Z0 Z1 + X0"` |
| `expectation(...)` | Compute `<psi(theta)|H|psi(theta)>` |
| `parameter_shift_gradient(...)` | Exact two-shift gradient for Pauli rotations |
| `Adam`, `SGD` | Small optimizers |
| `train(...)` | Streaming optimization loop |
| `vqe_h2_preset(...)` | Compact H2 VQE preset |
| `qaoa_maxcut_preset(...)` | Four-node MaxCut preset |
| `bloch_state_fit_preset(...)` | One-qubit state-fitting preset |

### QNN

| API | Description |
|-----|-------------|
| `angle_encoder(...)` | RY angle encoder |
| `amplitude_encoder(...)` | Direct amplitude embedding |
| `zz_feature_map(...)` | ZZ quantum-kernel feature map |
| `real_amplitudes_ansatz(...)` | RY ansatz with CNOT chain |
| `hardware_efficient_ansatz(...)` | RZ-RY-RZ ansatz with CNOT ring |
| `QNNModel` | Encoder + ansatz + observable classifier |
| `qnn_train(...)` | Parameter-shift QNN training loop |
| `xor_preset(...)`, `parity_preset(...)`, `moons_preset(...)` | Toy QNN configs |
| `to_pennylane(...)`, `to_qiskit_ml(...)` | Export trained model code |

### HEP / Models

| API | Description |
|-----|-------------|
| `JetDataset` | Torch-compatible jet graph dataset |
| `JetDataset.from_arrays(...)` | Build from tensors/arrays |
| `JetDataset.from_kinematics(...)` | Build from `pt`, `eta`, `phi`, `mass` |
| `load_top_tagging(...)`, `load_jetclass(...)` | Local benchmark file loaders |
| `toy_quark_gluon_jets(...)` | Small deterministic smoke dataset |
| `minkowski_dot(...)`, `minkowski_norm(...)` | Lorentz geometry helpers |
| `lorentz_boost(...)`, `apply_lorentz_transform(...)` | Four-vector transforms |
| `build_roc(...)`, `background_rejection(...)`, `binary_classification_metrics(...)` | HEP classification metrics, including fixed-efficiency background rejection |
| `LorentzNet`, `LieEQGNN` | Classical and hybrid graph classifiers |
| `DressedQuantumLayer` | Hybrid Torch/PennyLane layer |
| `benchmark_classifier(...)` | Headless train/evaluate loop |

See `USAGE.md` in the source repository for a longer walkthrough.

## Repository Layout

```text
Qcuit.com/
├── library/          # This pip package
│   ├── qcuit/        # Importable source
│   ├── tests/        # Package tests
│   ├── examples/     # Runnable Python examples
│   ├── notebooks/    # Research demo notebooks
│   └── pyproject.toml
├── website/          # qcuit.com, docs UI, visualizer, QML Lab, local API
├── docs/             # Architecture, deployment, contributor map
└── scripts/          # Local setup scripts
```

Start in `library/` for anything that changes importable Python behavior.
Start in `website/` only for docs UI, visualizer, QML Lab, or local API panels.

## Development

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com/library
pip install -e ".[hep,qml,qiskit,dev]"
python3 -m pytest tests
python3 examples/quark_gluon_lie_eqgnn_demo.py
```

From the repository root:

```bash
make library-test
make wheel
make verify
```

## Project Status

Qcuit is alpha research software. The package surfaces listed as
package-native above are intended to be importable without the website. The
browser companion is useful for teaching and inspection, but research workflows
should be reproducible from Python alone.

## Links

- Website: https://qcuit.com
- Documentation: https://qcuit.com/docs
- Source: https://github.com/Faiz-k490/Qcuit.com
- Issues: https://github.com/Faiz-k490/Qcuit.com/issues
- License: MIT
