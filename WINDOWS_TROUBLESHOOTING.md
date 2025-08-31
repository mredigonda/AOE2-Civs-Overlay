# Windows Troubleshooting Guide

## Issue: "cv2 module not exist" or "No module named 'cv2'"

This error occurs when the Python virtual environment is not properly activated or the modules are not installed correctly.

## Quick Fix Steps

### Step 1: Verify Virtual Environment Setup

Run the debug script to check your setup:

```bash
# In Git Bash
node debug-windows-python.js

# Or in Command Prompt
node debug-windows-python.js
```

### Step 2: Reinstall Virtual Environment

If the debug shows issues, recreate the virtual environment:

```bash
# Remove old virtual environment
rm -rf python-experiment-tesseract/.venv

# Run setup script
./python-experiment-tesseract/setup-windows.sh
```

### Step 3: Test Individual Components

Test each component separately:

```bash
# Test Python
cd python-experiment-tesseract
source .venv/Scripts/activate
python --version

# Test cv2
python -c "import cv2; print('cv2 version:', cv2.__version__)"

# Test tesserocr
python -c "import tesserocr; print('tesserocr version:', tesserocr.__version__)"

# Test tesseract locator
python tesseract_locator.py

# Test full script
python process.py test-screenshot.png
```

### Step 4: Test OCR Service

Test the Node.js integration:

```bash
# From project root
node test-ocr-service-windows.js
```

## Common Issues and Solutions

### Issue 1: Virtual Environment Not Found

**Symptoms:**

-   `Virtual environment Python not found!`
-   `python-experiment-tesseract/.venv/Scripts/python.exe` doesn't exist

**Solution:**

```bash
cd python-experiment-tesseract
python -m venv .venv
source .venv/Scripts/activate  # Git Bash
# OR
.venv\Scripts\activate.bat     # Command Prompt
pip install -r requirements.txt
```

### Issue 2: cv2 Installation Failed

**Symptoms:**

-   `ModuleNotFoundError: No module named 'cv2'`
-   `ImportError: DLL load failed`

**Solutions:**

1. **Reinstall OpenCV:**

    ```bash
    pip uninstall opencv-python
    pip install opencv-python==4.12.0.88
    ```

2. **Install Visual C++ Redistributable:**

    - Download: https://aka.ms/vs/17/release/vc_redist.x64.exe
    - Install both x86 and x64 versions

3. **Use pre-compiled wheels:**
    ```bash
    pip install --only-binary=all opencv-python
    ```

### Issue 3: tesserocr Installation Failed

**Symptoms:**

-   `RuntimeError: Tesseract library not found`
-   `ImportError: DLL load failed`

**Solutions:**

1. **Install Tesseract first:**

    ```bash
    # Using Chocolatey
    choco install tesseract

    # Using winget
    winget install UB-Mannheim.TesseractOCR

    # Manual download
    # https://github.com/UB-Mannheim/tesseract/wiki
    ```

2. **Reinstall tesserocr:**

    ```bash
    pip uninstall tesserocr
    pip install tesserocr==2.8.0
    ```

3. **Use pre-compiled wheels:**
    ```bash
    pip install --only-binary=all tesserocr
    ```

### Issue 4: Environment Variables Not Set

**Symptoms:**

-   Python can't find modules even when installed
-   `PYTHONPATH` or `VIRTUAL_ENV` not set correctly

**Solutions:**

1. **Check environment variables:**

    ```bash
    echo $VIRTUAL_ENV
    echo $PYTHONPATH
    ```

2. **Set manually if needed:**
    ```bash
    export VIRTUAL_ENV="$(pwd)/python-experiment-tesseract/.venv"
    export PYTHONPATH="$VIRTUAL_ENV/Lib/site-packages:$PYTHONPATH"
    ```

### Issue 5: Architecture Mismatch

**Symptoms:**

-   `ImportError: DLL load failed`
-   Python and Tesseract have different architectures

**Solutions:**

1. **Check Python architecture:**

    ```bash
    python -c "import platform; print(platform.architecture())"
    ```

2. **Ensure 64-bit consistency:**
    - Use 64-bit Python
    - Use 64-bit Tesseract
    - Use 64-bit Visual C++ Redistributable

## Advanced Debugging

### Check Python Path Resolution

```bash
# Test Python path
python -c "import sys; print('\\n'.join(sys.path))"

# Test module locations
python -c "import cv2; print(cv2.__file__)"
python -c "import tesserocr; print(tesserocr.__file__)"
```

### Check Environment Variables

```bash
# In Git Bash
env | grep -i python
env | grep -i virtual

# In Command Prompt
set | findstr /i python
set | findstr /i virtual
```

### Test with Different Python Versions

If you have multiple Python versions:

```bash
# List available Python versions
where python
where python3

# Test specific version
python3.9 -m venv .venv-py39
python3.10 -m venv .venv-py310
```

## Getting Help

If you're still having issues:

1. **Run the debug script** and share the output
2. **Check the error messages** carefully
3. **Verify all prerequisites** are installed
4. **Try the setup script** again
5. **Check Windows Event Viewer** for system errors

## System Requirements

-   **Windows 10/11** (64-bit)
-   **Python 3.7+** (64-bit)
-   **Visual C++ Redistributable** (2015-2022)
-   **Tesseract OCR** (64-bit)
-   **Git Bash** or **Command Prompt**

## Alternative Setup Methods

### Using Conda (if available)

```bash
conda create -n aoe2-ocr python=3.9
conda activate aoe2-ocr
conda install -c conda-forge opencv tesserocr
```

### Using WSL (Windows Subsystem for Linux)

```bash
# Install WSL and Ubuntu
wsl --install

# In WSL
sudo apt update
sudo apt install python3-pip python3-venv tesseract-ocr
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
