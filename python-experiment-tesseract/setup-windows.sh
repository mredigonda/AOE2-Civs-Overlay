#!/bin/bash

echo "========================================"
echo "Setting up Tesseract OCR Environment"
echo "========================================"

echo ""
echo "Step 1: Checking if Python is installed..."
python --version
if [ $? -ne 0 ]; then
    echo "ERROR: Python is not installed or not in PATH"
    echo "Please install Python 3.7+ from https://python.org"
    read -p "Press Enter to continue..."
    exit 1
fi

echo ""
echo "Step 2: Creating virtual environment..."
python -m venv .venv
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create virtual environment"
    read -p "Press Enter to continue..."
    exit 1
fi

echo ""
echo "Step 3: Activating virtual environment..."
source .venv/Scripts/activate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to activate virtual environment"
    read -p "Press Enter to continue..."
    exit 1
fi

echo ""
echo "Step 4: Upgrading pip..."
python -m pip install --upgrade pip

echo ""
echo "Step 5: Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo ""
    echo "WARNING: Some dependencies may have failed to install"
    echo "This might be due to missing Tesseract library"
    echo ""
    echo "Please ensure Tesseract is installed on your system:"
    echo "1. Download from: https://github.com/UB-Mannheim/tesseract/wiki"
    echo "2. Install to C:/Program Files/Tesseract-OCR"
    echo "3. Add to PATH environment variable"
    echo ""
    echo "Or use Chocolatey: choco install tesseract"
    echo ""
    read -p "Press Enter to continue..."
fi

echo ""
echo "Step 6: Testing Tesseract installation..."
python -c "import tesserocr; print('Tesseract version:', tesserocr.get_tesseract_version())"
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Tesseract library not found!"
    echo ""
    echo "Please install Tesseract OCR:"
    echo "1. Download from: https://github.com/UB-Mannheim/tesseract/wiki"
    echo "2. Install to C:/Program Files/Tesseract-OCR"
    echo "3. Add to PATH environment variable"
    echo ""
    echo "Or use Chocolatey: choco install tesseract"
    echo ""
    read -p "Press Enter to continue..."
    exit 1
fi

echo ""
echo "========================================"
echo "Setup completed successfully!"
echo "========================================"
echo ""
echo "To activate the environment in the future:"
echo "  source .venv/Scripts/activate"
echo ""
echo "To test the OCR system:"
echo "  python process.py test-screenshot.png"
echo ""
read -p "Press Enter to continue..."
