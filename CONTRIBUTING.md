# Contributing to Qcuit

Thanks for helping improve Qcuit. The project is now organized around a pip-first quantum ML library plus an optional browser visualizer.

## Start Here

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com
make help
```

If this is your first setup:

```bash
make setup
```

## Repo Map

Read [docs/REPO_MAP.md](docs/REPO_MAP.md) for the fastest path through the codebase.

| Goal | Start in | Verify with |
|------|----------|-------------|
| Improve the pip library | `library/qcuit/` | `make library-test` |
| Add HEP/QML data or models | `library/qcuit/hep/`, `library/qcuit/models/` | `make library-test` |
| Improve the Visualizer | `website/frontend/src/App.v5.tsx`, `website/frontend/src/components/` | `make frontend-build` |
| Improve Learn or QML Lab | `website/frontend/src/pages/Exploratorium.tsx`, `website/frontend/src/pages/Lab.tsx` | `make frontend-build` |
| Improve docs/website | `website/frontend/src/pages/`, `docs/`, `library/USAGE.md` | `make frontend-build` |
| Work on local API routes | `website/api/` | `make backend` |

## Common Commands

```bash
make frontend        # React app, PORT=3001 by default
make backend         # API on :5001
make backend-test    # Flask/API tests
make library-test    # Python library tests
make library-demo    # LieEQGNN smoke benchmark
make frontend-build  # Production frontend build
make verify          # Library tests + API tests + frontend build
```

## Pull Request Checklist

- Keep changes scoped to one area when possible.
- Add or update tests for Python library behavior.
- Run `make verify`, or the narrower command for your area.
- Update docs when public APIs, install commands, routes, or workflows change.
- Include screenshots or a short screen recording for visualizer/frontend changes.

## Code Style

- Python: type hints on public functions, clear errors, and small tests near the changed behavior.
- React/TypeScript: functional components, accessible buttons/labels, no layout that creates mobile horizontal overflow.
- Docs: prefer runnable commands and exact paths over abstract descriptions.

## Related Guides

- [library/CONTRIBUTING.md](library/CONTRIBUTING.md) for Python package details.
- [website/README.md](website/README.md) for the web app.
- [docs/REPO_MAP.md](docs/REPO_MAP.md) for contributor orientation across the active library and frontend surfaces.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be direct, kind, and useful.
