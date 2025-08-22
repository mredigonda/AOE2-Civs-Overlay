#!/bin/bash

echo "Setting up Python environment for RapidOCR..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.7+ first."
    exit 1
fi

# Check Python version
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "Found Python version: $python_version"

# Navigate to the python-experiment-rapidocr directory
cd python-experiment-rapidocr

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Python environment setup complete!"
echo "To activate the environment manually, run:"
echo "  cd python-experiment-rapidocr"
echo "  source .venv/bin/activate"
