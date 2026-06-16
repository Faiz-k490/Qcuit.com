.PHONY: help setup frontend frontend-build frontend-test backend backend-test library-test library-demo wheel verify

help:
	@echo "Qcuit contributor commands"
	@echo ""
	@echo "  make setup           Install local Python/Node dependencies"
	@echo "  make frontend        Start React frontend on PORT=3001 by default"
	@echo "  make frontend-build  Build the frontend"
	@echo "  make backend         Start the local API on :5001"
	@echo "  make backend-test    Run Flask/API tests"
	@echo "  make library-test    Run Python library tests"
	@echo "  make library-demo    Run the LieEQGNN smoke benchmark"
	@echo "  make wheel           Build the qcuit wheel"
	@echo "  make verify          Run library tests, backend tests, and frontend build"

setup:
	bash scripts/setup_dev.sh

frontend:
	cd website/frontend && PORT=$${PORT:-3001} BROWSER=none npm start

frontend-build:
	cd website/frontend && npm run build

frontend-test:
	cd website/frontend && npm test -- --watchAll=false

backend:
	cd website && PYTHONPATH=. python3 api/index.py

backend-test:
	cd website && PYTHONPATH=. python3 -m pytest api/tests

library-test:
	cd library && python3 -m pytest tests

library-demo:
	cd library && PYTHONPATH=. python3 examples/quark_gluon_lie_eqgnn_demo.py

wheel:
	cd library && python3 -m build --wheel

verify: library-test backend-test frontend-build
