@echo off
echo Testing AOE2 Civs Overlay Windows Build
echo ========================================
echo.

echo Current directory: %CD%
echo.

echo Looking for executable...
if exist "dist\AOE2 Civs Overlay.exe" (
    echo Found: dist\AOE2 Civs Overlay.exe
    echo.
    echo Running executable...
    echo ========================================
    "dist\AOE2 Civs Overlay.exe"
    echo ========================================
    echo.
    echo Executable finished running.
) else (
    echo ERROR: Executable not found in dist\ folder
    echo.
    echo Available files in dist\:
    dir dist\
)

echo.
echo Press any key to exit...
pause >nul
