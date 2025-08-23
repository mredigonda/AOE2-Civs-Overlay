#!/bin/bash

echo "========================================"
echo "AOE2 Civs Overlay - Setup Verification (Git Bash)"
echo "========================================"
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "✅ Found package.json"
echo

# Check Node.js
echo "[1/4] Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js not found in PATH"
    echo "Please install Node.js from: https://nodejs.org/"
fi

# Check npm
echo "[2/4] Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm not found"
fi

# Check Python
echo "[3/4] Checking Python..."
if command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1)
    echo "✅ Python: $PYTHON_VERSION"
else
    echo "❌ Python not found in PATH"
    echo "Please install Python from: https://www.python.org/downloads/"
fi

# Check Python virtual environment
echo "[4/4] Checking Python environment..."
if [ ! -d "python-experiment-rapidocr/.venv" ]; then
    echo "❌ Python virtual environment not found"
    echo "Run ./setup-windows.sh to create it"
else
    echo "✅ Python virtual environment exists"
    
    # Test if it can be activated
    cd python-experiment-rapidocr
    if source .venv/Scripts/activate &> /dev/null; then
        echo "✅ Virtual environment can be activated"
        
        # Test Python dependencies
        if python -c "import rapidocr_onnxruntime; import PIL; print('✅ Python dependencies working')" &> /dev/null; then
            echo "✅ Python dependencies working"
        else
            echo "❌ Python dependencies not installed"
            echo "Run: pip install -r requirements.txt"
        fi
        
        deactivate
    else
        echo "❌ Cannot activate virtual environment"
    fi
    cd ..
fi

echo
echo "========================================"
echo "Verification complete!"
echo "========================================"
echo
echo "If you see any ❌ errors above, please:"
echo "1. Install missing software"
echo "2. Run ./setup-windows.sh"
echo "3. Run this verification script again"
echo
