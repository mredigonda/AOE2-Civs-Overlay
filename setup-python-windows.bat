@echo off
echo Setting up Python environment for RapidOCR on Windows...

REM Check if Python 3 is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python 3 is not installed. Please install Python 3.7+ first.
    echo Download from: https://python.org
    pause
    exit /b 1
)

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo Found Python version: %PYTHON_VERSION%

REM Navigate to the python-experiment-rapidocr directory
cd python-experiment-rapidocr

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

REM Install requirements
echo Installing Python dependencies...
pip install -r requirements.txt

echo Python environment setup complete!
echo To activate the environment manually, run:
echo   cd python-experiment-rapidocr
echo   .venv\Scripts\activate.bat
pause

