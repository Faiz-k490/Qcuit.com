# Contributing to the Qcuit Python Library

The Python package is the core product. Anything importable as `qcuit.*` lives
here and should work without the website running.

## Setup

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com/library
pip install -e ".[hep,qml,qiskit,dev]"
python3 -m pytest tests
```

From the repository root, the equivalent command is:

```bash
make library-test
```

## Package Map

| Path | Purpose | Add tests in |
|------|---------|--------------|
| `qcuit/core.py`, `qcuit/gates.py` | Beginner circuit objects and gates | `tests/` |
| `qcuit/backend.py` | Optional Qiskit simulator bridge | `tests/` or example smoke tests |
| `qcuit/diff/` | NumPy differentiable circuits, Hamiltonians, optimizers | new `tests/test_diff.py` |
| `qcuit/qnn/` | Encoders, ansatze, datasets, QNN training, exporters | new `tests/test_qnn.py` |
| `qcuit/hep/` | Jet datasets, Lorentz math, HEP metrics/loaders | `tests/test_hep_*.py` |
| `qcuit/models/` | LorentzNet, LGEB, LieEQGNN, QLieGEB | `tests/test_models.py` |
| `qcuit/quantum/` | Hybrid Torch/PennyLane layers | `tests/test_models.py` |
| `qcuit/benchmarks.py` | Headless training/evaluation reports | `tests/test_benchmarks.py` |
| `examples/` | Runnable scripts | command smoke test in PR description |
| `notebooks/` | Research demos | keep small; avoid committing large outputs |

The prototype modules `qcuit.noise`, `qcuit.qec`, and `qcuit.pulse` currently
mirror website API code and are not yet standalone package surfaces. If you make
one standalone, move the implementation into `library/qcuit/<module>/`, add
tests, and remove the website-backed import fallback.

## Common Contribution Paths

### Add a HEP data loader

1. Add the parser in `qcuit/hep/data.py`.
2. Keep optional dependencies behind extras such as `hep-io` or `pyg`.
3. Add a tiny fixture or synthetic smoke path in `tests/test_hep_data.py`.
4. Document the public function in `README.md` and `USAGE.md`.

### Add a model or quantum block

1. Add the implementation in `qcuit/models/` or `qcuit/quantum/`.
2. Keep Torch imports optional where possible.
3. Add shape, forward-pass, and parameter-count tests.
4. Add a minimal example if the API is user-facing.

### Add a QNN or differentiable-circuit primitive

1. Add package-native code under `qcuit/qnn/` or `qcuit/diff/`.
2. Do not import from `website/api`; package code must stand alone.
3. Add tests covering numerical shape, deterministic output, and exporter text.
4. Add a short PyPI README snippet if the primitive is public.

### Add a beginner circuit gate

1. Define the gate in `qcuit/gates.py`.
2. Export it from `qcuit/__init__.py`.
3. Teach `qcuit/backend.py` how to translate it to Qiskit if it is simulatable.
4. Add a smoke example and a regression test.

## Design Rules

- Package code cannot depend on the website path.
- The base install should stay light; put heavy tools behind extras.
- Public functions need type hints and docstrings.
- Errors should tell users how to fix the problem.
- HEP/QML claims should be reproducible and benchmarked against sensible baselines.
- Avoid large datasets, generated notebooks, model weights, and local reports in git.

## Verification

Run the narrow check for your area before opening a PR:

```bash
python3 -m pytest tests
python3 examples/quark_gluon_lie_eqgnn_demo.py
python3 -m build --wheel
```

Or from the repository root:

```bash
make library-test
make wheel
```

For changes that also touch the website docs or QML Lab, run:

```bash
make frontend-build
```

## PyPI Release Checklist

Before cutting a release:

1. Update `version` in `pyproject.toml`.
2. Verify `README.md` renders correctly as the PyPI long description.
3. Run `python3 -m pytest tests`.
4. Run `python3 -m build --wheel --sdist`.
5. Inspect the wheel contents for `qcuit/py.typed` and expected modules.
6. Publish to TestPyPI first when possible.

## Pull Request Checklist

- State whether the PR changes `library/`, `website/`, or docs.
- Include the exact commands you ran.
- Add tests for importable behavior.
- Update `README.md`, `USAGE.md`, or website docs for public API changes.
- Keep unrelated formatting and generated files out of the PR.
