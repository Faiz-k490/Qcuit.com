# Qcuit Repository Map

Qcuit has one primary product surface: the Python library. The browser companion exists to document, teach, visualize, and locally inspect that library.

## Ownership Rule

| Question | Go here |
|----------|---------|
| Does it change importable `qcuit` behavior? | `library/` |
| Does it explain the package or provide optional browser support? | `website/frontend/` |
| Does it serve local browser panels or simulations? | `website/api/` |
| Is it historical content or retired direction? | `docs/_archive/` |

## Main Areas

| Area | Path | Purpose | Common command |
|------|------|---------|----------------|
| Python package | `library/` | `qcuit` pip library, HEP data, models, benchmarks | `make library-test` |
| Browser companion | `website/frontend/` | Package landing page, docs UI, Learn, Visualizer, QML Lab | `make frontend` |
| Local API | `website/api/` | Simulation, notebook, QNN, noise, QEC routes | `make backend` |
| Project docs | `docs/` | Architecture, deployment, repo map | edit Markdown |
| Setup scripts | `scripts/` | Local bootstrap utilities | `make setup` |

## Website Information Architecture

| Route | Purpose | Tone |
|-------|---------|------|
| `/` | Package landing page for QML researchers | concise, install-first |
| `/docs` | Install guide and function reference | searchable reference |
| `/explore` | Guided lessons | teaching support |
| `/visualizer` | Circuit intuition and exports | optional companion |
| `/lab` | Browser checks for QML/noise/QNN/QEC/pulse tools | local support |

## Contributor Fast Paths

### Add a HEP data feature

1. Edit `library/qcuit/hep/`.
2. Add tests in `library/tests/`.
3. Run `make library-test`.
4. Update `library/USAGE.md` and website docs if the public API changed.

### Add or improve a model

1. Edit `library/qcuit/models/` or `library/qcuit/quantum/`.
2. Add model shape/forward tests in `library/tests/test_models.py`.
3. Run `make library-test`.
4. Add a minimal usage snippet to `library/README.md`.

### Improve the Visualizer

1. Edit `website/frontend/src/App.v5.tsx` or `website/frontend/src/components/`.
2. Run `make frontend-build`.
3. Verify `/visualizer` at `http://localhost:3001/visualizer`.
4. Check desktop and mobile widths for horizontal overflow.

### Improve Learn or QML Lab

1. Edit `website/frontend/src/pages/Exploratorium.tsx`, `website/frontend/src/pages/Lab.tsx`, or shared flow components in `website/frontend/src/components/`.
2. Keep the public path coherent: Learn, Visualize, QML Lab, Docs.
3. Run `make frontend-build`.
4. Verify `/explore`, `/visualizer`, and `/lab` at `http://localhost:3001`.

### Improve the website/docs

1. Edit `website/frontend/src/pages/LandingPage.tsx` or `Documentation.tsx`.
2. Run `make frontend-build`.
3. Verify `/` and `/docs`.

## Verification Standard

Before opening a PR, run:

```bash
make verify
```

For library-only changes, `make library-test` is enough. For frontend-only changes, `make frontend-build` is enough.
For visualizer or QML Lab connectivity changes, run `make backend-test` or at minimum:

```bash
cd website
PYTHONPATH=. python3 -m pytest api/tests/test_visualizer_connectivity.py
```
