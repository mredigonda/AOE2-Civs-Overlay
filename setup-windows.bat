@echo off
setlocal enabledelayedexpansion

echo ========================================
echo AOE2 Civs Overlay - Windows Setup
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo ✅ Found package.json - we're in the right directory
echo.

:: Step 1: Check Node.js
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from: https://nodejs.org/
    echo Make sure to check "Add to PATH" during installation
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%
echo.

:: Step 2: Check npm
echo [2/6] Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    echo Please reinstall Node.js to include npm
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm version: %NPM_VERSION%
echo.

:: Step 3: Check Python
echo [3/6] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from: https://www.python.org/downloads/
    echo Make sure to check "Add to PATH" during installation
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✅ Python version: %PYTHON_VERSION%
echo.

:: Step 4: Install Node.js dependencies
echo [4/6] Installing Node.js dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node.js dependencies
    echo Try running: npm cache clean --force
    pause
    exit /b 1
)
echo ✅ Node.js dependencies installed
echo.

:: Step 5: Setup Python environment
echo [5/6] Setting up Python environment...
if not exist "python-experiment-rapidocr" (
    echo ❌ Python experiment directory not found
    pause
    exit /b 1
)

cd python-experiment-rapidocr

:: Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo ❌ Failed to create Python virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

:: Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo ❌ Failed to activate virtual environment
    pause
    exit /b 1
)

:: Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

:: Install PyInstaller
echo Installing PyInstaller...
pip install pyinstaller
if %errorlevel% neq 0 (
    echo ❌ Failed to install PyInstaller
    pause
    exit /b 1
)

:: Test Python imports
echo Testing Python dependencies...
python -c "import rapidocr_onnxruntime; import PIL; print('✅ Python dependencies working correctly')"
if %errorlevel% neq 0 (
    echo ❌ Python dependencies test failed
    echo Try reinstalling: pip install --upgrade -r requirements.txt
    pause
    exit /b 1
)

:: Deactivate virtual environment
deactivate

:: Return to project root
cd ..
echo ✅ Python environment setup complete
echo.

:: Step 6: Test build process
echo [6/6] Testing build process...
echo Building Python OCR service...
npm run build-python-win
if %errorlevel% neq 0 (
    echo ❌ Failed to build Python OCR service
    echo Check the error messages above
    pause
    exit /b 1
)

echo ✅ Build test successful!
echo.

echo ========================================
echo 🎉 Setup completed successfully!
echo ========================================
echo.
echo You can now:
echo - Run the app: npm start
echo - Build Windows executable: npm run dist-windows
echo - Test Windows features: npm run start-test
echo.
echo The executable will be created in the 'dist' folder.
echo.
pause
