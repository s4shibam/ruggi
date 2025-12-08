#!/bin/bash

set -e  # Exit on error

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR=".venv"
REQUIREMENTS_FILE="requirements.txt"

# Skip entirely on Vercel (frontend-only deployments)
if [ "$VERCEL" = "1" ]; then
    echo "Skipping API installation on Vercel..."
    exit 0
fi

# Check if virtual environment exists, create if not
if [ ! -d "$VENV_DIR" ] || [ ! -f "$VENV_DIR/bin/python" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Install requirements
echo "Installing dependencies..."
pip install -r "$REQUIREMENTS_FILE"

echo "✓ Installation complete!"

