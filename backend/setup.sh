#!/usr/bin/env bash
# Recreate the virtual environment using Python 3.12 and install dependencies.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Removing existing venv (if any)..."
rm -rf venv

echo "Creating venv with Python 3.12..."
python3.12 -m venv venv

echo "Activating venv and installing dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "Done. Activate the environment with:"
echo "  source backend/venv/bin/activate"
