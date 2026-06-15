# Qcuit Usage Guide

Qcuit is now structured as an open-source Python library first. The web
visualizer is optional: useful for intuition, but not required for notebooks,
CI, SLURM jobs, or HPC cluster runs.

## Install

```bash
pip install qcuit
pip install "qcuit[qiskit]"
pip install "qcuit[hep]"
pip install "qcuit[hep,hep-io]"
pip install "qcuit[hep,pyg]"
pip install "qcuit[hep,qml]"
pip install "qcuit[all]"
```

Use the base install for the lightest package. Add extras only when needed:

- `qiskit`: beginner circuit simulation with Qiskit Aer.
- `hep`: Torch, SciPy, and scikit-learn for HEP graph models.
- `hep-io`: uproot, awkward, and h5py for local ROOT/HDF5 datasets.
- `pyg`: PyTorch Geometric export from `JetDataset`.
- `qml`: PennyLane for real quantum nodes.
- `all`: everything.

For local development:

```bash
cd library
pip install -e ".[hep,qml,qiskit,dev]"
```

## Beginner Circuit API

```python
from qcuit import Qubit, Circuit, Apply, Hadamard, CNOT
from qcuit.backend import run_simulation

a, b = Qubit("a"), Qubit("b")
circ = Circuit(a, b)
circ.add(Apply(Hadamard, target=a))
circ.add(Apply(CNOT, target=b, control=a))
circ.measure_all()
circ.draw()

counts = run_simulation(circ, shots=1024)
print(counts)
```

Core functions/classes:

- `Qubit(name)`: named qubit object.
- `Circuit(*qubits)`: circuit container.
- `Circuit.add(operation)`: append a validated operation.
- `Circuit.measure_all()`: mark all qubits for measurement.
- `Circuit.draw()`: print an ASCII circuit.
- `Apply(gate, target, control=None)`: gate operation wrapper.
- `Hadamard`, `PauliX`, `CNOT`: supported base gates.
- `run_simulation(circuit, shots=1024)`: Qiskit Aer execution.

## HEP / LieEQGNN API

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
    quantum_backend="torch",
)

report = benchmark_classifier(model, data, epochs=10, batch_size=8)
print(report.metrics)
```

Replace `quantum_backend="torch"` with `quantum_backend="pennylane"` after
installing `qcuit[hep,qml]`.

HEP functions/classes:

- `JetDataset`: Torch-compatible jet graph dataset.
- `JetDataset.from_arrays(...)`: build from p4s/scalars/labels arrays.
- `JetDataset.from_kinematics(...)`: build from jagged `pt/eta/phi/mass` arrays.
- `JetDataset.from_npz(path)`: build from NPZ data.
- `JetDataset.from_top_tagging(path)`: build from local Top Tagging-style HDF5/NPZ.
- `JetDataset.from_jetclass(path)`: build from local JetClass-style ROOT TTrees.
- `load_top_tagging(path)`: functional loader for local HDF5/NPZ benchmark files.
- `load_jetclass(path)`: functional loader for ROOT files through uproot/awkward.
- `four_vectors_from_ptetaphim(...)`: convert kinematics into `[E, px, py, pz]`.
- `JetDataset.split(...)`: deterministic train/val/test split.
- `JetDataset.dataloaders(...)`: model-ready dataloaders.
- `JetDataset.to_pyg_data_list()`: export PyTorch Geometric `Data` objects.
- `collate_jets(samples)`: flatten graph batches.
- `JetBatch.to(device)`: move batch tensors.
- `toy_quark_gluon_jets(...)`: smoke-test toy data.
- `minkowski_metric()`, `minkowski_dot(...)`, `minkowski_norm(...)`: Lorentz geometry.
- `lorentz_boost(...)`, `apply_lorentz_transform(...)`: four-vector transforms.
- `check_metric_invariance(...)`: Lie generator metric check.
- `invariant_metric_from_generators(...)`: learned invariant metric helper.
- `build_roc(...)`, `background_rejection(...)`, `binary_classification_metrics(...)`: HEP metrics.
- `parameter_count(model)`: trainable parameter count.

## Models and Benchmarks

- `LorentzNet`: classical Lorentz-equivariant graph classifier.
- `LGEB`: Lorentz Group Equivariant Block.
- `LieEQGNN`: quantum graph classifier with optional quantum submodules.
- `QLieGEB`: LieEQGNN block with quantum `phi_e`, `phi_h`, `phi_x`, or `phi_m`.
- `DressedQuantumLayer`: Torch module with `torch`, `pennylane`, or `auto` backend.
- `entangling_layer(qml, n_qubits)`: staggered CNOT pattern.
- `benchmark_classifier(...)`: train/evaluate a classifier.
- `BenchmarkReport.to_dict()`: serialize report in memory.
- `BenchmarkReport.to_json(path)`: save report to disk.
- `set_seed(seed)`: seed Python, NumPy, Torch, and CUDA.

## CLI

```bash
qcuit-lie-eqgnn-demo --epochs 10 --backend torch
qcuit-lie-eqgnn-demo --epochs 10 --backend pennylane --out report.json
```

Important options:

- `--jets`: number of toy jets.
- `--nodes`: maximum nodes per jet.
- `--epochs`: training epochs.
- `--batch-size`: batch size.
- `--hidden`: hidden dimension.
- `--layers`: LieEQGNN depth.
- `--backend`: `torch`, `pennylane`, or `auto`.
- `--out`: optional JSON report path.

## Visualizer

If someone is not sold on quantum yet, send them to the visualizer:

```text
/visualizer
```

The visualizer is an optional browser companion surface. It lets users
drag gates, simulate circuits, inspect probabilities, and export code. It is not
required for the pip package.
