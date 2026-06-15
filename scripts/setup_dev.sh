#!/bin/bash
# Qcuit Development Environment Setup
# Run from the repo root: bash scripts/setup_dev.sh

set -e

echo "================================================"
echo "  Qcuit — Development Environment Setup"
echo "================================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is required. Install Python 3.10+"
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "Error: node is required. Install Node.js 18+"
    exit 1
fi

# Python virtual environment
echo "[1/4] Setting up Python virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "  Created .venv"
else
    echo "  .venv already exists"
fi
source .venv/bin/activate

# Install Python dependencies
echo "[2/4] Installing Python dependencies..."
pip install -q -r website/requirements.txt

# Install frontend dependencies
echo "[3/4] Installing frontend dependencies..."
cd website/frontend && npm install --silent && cd ../..

# Create .env if missing
echo "[4/4] Setting up environment..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
    echo "  >> Edit .env only if you need custom local secrets"
else
    echo "  .env already exists"
fi

echo ""
echo "================================================"
echo "  Setup complete!"
echo ""
echo "  Start backend:  cd website && PYTHONPATH=. python3 api/index.py"
echo "  Start frontend: cd website/frontend && npm start"
echo ""
echo "  Or from repo root:"
echo "    PYTHONPATH=website python3 website/api/index.py"
echo "================================================"
