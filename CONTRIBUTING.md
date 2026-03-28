# Contributing to Qcuit

Thank you for considering contributing to Qcuit. This document outlines the process and points you to the right place depending on what you'd like to work on.

---

## Where to Contribute

| Area | Directory | Guide |
|------|-----------|-------|
| Python library (gates, core abstractions) | `library/` | [library/CONTRIBUTING.md](library/CONTRIBUTING.md) |
| Web app (Studio, frontend, backend API) | `studio/` | [studio/README.md](studio/README.md) |
| Journal articles | `journal/` | [journal/README.md](journal/README.md) |
| Documentation | `docs/` | Direct edits welcome |

---

## Getting Started

```bash
git clone https://github.com/Faiz-k490/Qcuit.com.git
cd Qcuit.com
bash scripts/setup_dev.sh
```

This installs all Python and Node dependencies, creates a virtual environment, and sets up your `.env` file.

---

## Development Workflow

1. Fork the repository and create a branch from `main`.
2. Make your changes in the appropriate directory.
3. Test locally — the setup script prints instructions for starting the backend and frontend.
4. Open a pull request with a clear description of what changed and why.

---

## Code Style

- **Python:** Type hints on all public functions. Docstrings on all classes. Friendly error messages via `QcuitError` — no raw tracebacks for the user.
- **TypeScript/React:** Functional components. State managed via `CircuitContext`. No inline styles where a CSS class would suffice.
- **Commits:** Present tense, imperative mood. `Add bell state preset`, not `Added bell state preset`.

---

## Reporting Issues

Open an issue using the appropriate template:

- **Bug report** — something is broken or behaving unexpectedly
- **Feature request** — an idea for improvement

---

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you agree to uphold a respectful, inclusive environment.
