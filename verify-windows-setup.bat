@echo off
echo ========================================
echo AOE2 Civs Overlay - Setup Verification
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo ✅ Found package.json
echo.

:: Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found in PATH
    echo Please install Node.js from: https://nodejs.org/
) else (
    for /f "tokens=*" %%i in ('node --version') do echo ✅ Node.js: %%i
)

:: Check npm
echo [2/4] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo ✅ npm: %%i
)

:: Check Python
echo [3/4] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found in PATH
    echo Please install Python from: https://www.python.org/downloads/
) else (
    for /f "tokens=*" %%i in ('python --version') do echo ✅ Python: %%i
)

:: Check Python virtual environment
echo [4/4] Checking Python environment...
if not exist "python-experiment-rapidocr\.venv" (
    echo ❌ Python virtual environment not found
    echo Run setup-windows.bat to create it
) else (
    echo ✅ Python virtual environment exists
    
    :: Test if it can be activated
    cd python-experiment-rapidocr
    call .venv\Scripts\activate.bat >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Cannot activate virtual environment
    ) else (
        echo ✅ Virtual environment can be activated
        
        :: Test Python dependencies
        python -c "import rapidocr_onnxruntime; import PIL; print('✅ Python dependencies working')" >nul 2>&1
        if %errorlevel% neq 0 (
            echo ❌ Python dependencies not installed
            echo Run: pip install -r requirements.txt
        ) else (
            echo ✅ Python dependencies working
        )
        
        deactivate
    )
    cd ..
)

echo.
echo ========================================
echo Verification complete!
echo ========================================
echo.
echo If you see any ❌ errors above, please:
echo 1. Install missing software
echo 2. Run setup-windows.bat
echo 3. Run this verification script again
echo.
pause
