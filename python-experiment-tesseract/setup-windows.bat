@echo off
echo ========================================
echo Setting up Tesseract OCR Environment
echo ========================================

echo.
echo Step 1: Checking if Python is installed...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

echo.
echo Step 2: Creating virtual environment...
python -m venv .venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo.
echo Step 3: Activating virtual environment...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo.
echo Step 4: Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Step 5: Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Some dependencies may have failed to install
    echo This might be due to missing Tesseract library
    echo.
    echo Please ensure Tesseract is installed on your system:
    echo 1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
    echo 2. Install to C:\Program Files\Tesseract-OCR
    echo 3. Add to PATH environment variable
    echo.
    echo Or use Chocolatey: choco install tesseract
    echo.
    pause
)

echo.
echo Step 6: Testing Tesseract installation...
echo First, trying to locate Tesseract...
python tesseract_locator.py
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Tesseract not found!
    echo.
    echo Please install Tesseract OCR:
    echo 1. Download from: https://github.com/UB-Mannheim/tesseract/wiki
    echo 2. Install to C:\Program Files\Tesseract-OCR
    echo 3. Add to PATH environment variable
    echo.
    echo Or use Chocolatey: choco install tesseract
    echo.
    pause
    exit /b 1
)

echo.
echo Step 7: Testing tesserocr Python wrapper...
python -c "import tesserocr; print('Tesseract version:', tesserocr.get_tesseract_version())"
if %errorlevel% neq 0 (
    echo.
    echo ERROR: tesserocr Python wrapper failed!
    echo.
    echo This might be due to:
    echo 1. Missing Visual C++ Redistributable
    echo 2. Architecture mismatch (32-bit vs 64-bit)
    echo 3. Missing dependencies
    echo.
    echo Try installing Visual C++ Redistributable from:
    echo https://aka.ms/vs/17/release/vc_redist.x64.exe
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To activate the environment in the future:
echo   .venv\Scripts\activate.bat
echo.
echo To test the OCR system:
echo   python process.py test-screenshot.png
echo.
pause
