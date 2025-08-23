#!/bin/bash

echo "========================================"
echo "AOE2 Civs Overlay - Windows Setup (Git Bash)"
echo "========================================"
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "✅ Found package.json - we're in the right directory"
echo

# Step 1: Check Node.js
echo "[1/6] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Make sure to check 'Add to PATH' during installation"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"
echo

# Step 2: Check npm
echo "[2/6] Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not available"
    echo "Please reinstall Node.js to include npm"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo "✅ npm version: $NPM_VERSION"
echo

# Step 3: Check Python
echo "[3/6] Checking Python installation..."
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed or not in PATH"
    echo "Please install Python 3.8+ from: https://www.python.org/downloads/"
    echo "Make sure to check 'Add to PATH' during installation"
    exit 1
fi

PYTHON_VERSION=$(python --version 2>&1)
echo "✅ Python version: $PYTHON_VERSION"
echo

# Step 4: Install Node.js dependencies
echo "[4/6] Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Node.js dependencies"
    echo "Try running: npm cache clean --force"
    exit 1
fi
echo "✅ Node.js dependencies installed"
echo

# Step 5: Setup Python environment
echo "[5/6] Setting up Python environment..."
if [ ! -d "python-experiment-rapidocr" ]; then
    echo "❌ Python experiment directory not found"
    exit 1
fi

cd python-experiment-rapidocr

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv .venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create Python virtual environment"
        exit 1
    fi
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/Scripts/activate
if [ $? -ne 0 ]; then
    echo "❌ Failed to activate virtual environment"
    exit 1
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Install PyInstaller
echo "Installing PyInstaller..."
pip install pyinstaller
if [ $? -ne 0 ]; then
    echo "❌ Failed to install PyInstaller"
    exit 1
fi

# Test Python imports
echo "Testing Python dependencies..."
python -c "import rapidocr_onnxruntime; import PIL; print('✅ Python dependencies working correctly')"
if [ $? -ne 0 ]; then
    echo "❌ Python dependencies test failed"
    echo "Try reinstalling: pip install --upgrade -r requirements.txt"
    exit 1
fi

# Deactivate virtual environment
deactivate

# Return to project root
cd ..
echo "✅ Python environment setup complete"
echo

# Step 6: Test build process
echo "[6/6] Testing build process..."
echo "Building Python OCR service..."
npm run build-python-win
if [ $? -ne 0 ]; then
    echo "❌ Failed to build Python OCR service"
    echo "Check the error messages above"
    exit 1
fi

echo "✅ Build test successful!"
echo

echo "========================================"
echo "🎉 Setup completed successfully!"
echo "========================================"
echo
echo "You can now:"
echo "- Run the app: npm start"
echo "- Build Windows executable: npm run dist-windows"
echo "- Test Windows features: npm run start-test"
echo
echo "The executable will be created in the 'dist' folder."
echo
