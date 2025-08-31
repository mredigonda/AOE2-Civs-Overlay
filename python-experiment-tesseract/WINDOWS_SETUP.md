# Windows Setup Guide for Tesseract OCR

This guide will help you set up the Tesseract OCR environment on Windows.

> **Note for Git Bash users**: This guide works with both Command Prompt and Git Bash. If you're using Git Bash, use the `.sh` scripts instead of `.bat` files for a more native experience.

## Prerequisites

1. **Python 3.7+** - Download from https://python.org
2. **Tesseract OCR Engine** - See installation options below

## Installing Tesseract OCR

### Option 1: Using Chocolatey (Recommended)

1. Install Chocolatey if you don't have it:

    ```powershell
    Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    ```

2. Install Tesseract:
    ```powershell
    choco install tesseract
    ```

### Option 2: Using winget

```powershell
winget install UB-Mannheim.TesseractOCR
```

### Option 3: Manual Installation

1. Download the installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Choose the appropriate version (32-bit or 64-bit)
3. Install to `C:\Program Files\Tesseract-OCR`
4. **Important**: Add to PATH environment variable

## Setting up the Python Environment

### Quick Setup (Recommended)

**For Command Prompt users:**

```cmd
setup-windows.bat
```

**For Git Bash users:**

```bash
chmod +x setup-windows.sh
./setup-windows.sh
```

### Manual Setup

1. **Create virtual environment:**

    ```cmd
    python -m venv .venv
    ```

2. **Activate virtual environment:**

    ```cmd
    .venv\Scripts\activate.bat
    ```

3. **Install dependencies:**

    ```cmd
    pip install -r requirements.txt
    ```

4. **Test installation:**
    ```cmd
    python -c "import tesserocr; print('Tesseract version:', tesserocr.get_tesseract_version())"
    ```

## Troubleshooting

### Error: "RuntimeError: Tesseract library not found in LIBPATH: []"

This error means the Tesseract library is not installed or not in your PATH.

**Solutions:**

1. **Check if Tesseract is installed:**

    ```cmd
    tesseract --version
    ```

2. **If not installed, install it using one of the methods above**

3. **If installed but not found, add to PATH:**

    - Open System Properties → Advanced → Environment Variables
    - Add `C:\Program Files\Tesseract-OCR` to the PATH variable
    - Restart your command prompt

4. **Verify PATH:**
    ```cmd
    echo %PATH%
    ```

### Error: "Microsoft Visual C++ 14.0 is required"

This error occurs when building tesserocr from source.

**Solutions:**

1. **Install Visual Studio Build Tools:**

    - Download from: https://visualstudio.microsoft.com/downloads/
    - Install "Build Tools for Visual Studio"
    - Include "C++ build tools"

2. **Or use pre-compiled wheels:**
    ```cmd
    pip install --only-binary=all tesserocr
    ```

### Error: "ImportError: DLL load failed"

This usually means a missing Visual C++ Redistributable.

**Solutions:**

1. **Install Visual C++ Redistributable:**

    - Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
    - Install both x86 and x64 versions

2. **Check Python architecture:**
    ```cmd
    python -c "import platform; print(platform.architecture())"
    ```
    - Make sure you're using 64-bit Python if you installed 64-bit Tesseract

### Error: "No module named 'cv2'"

This means OpenCV failed to install.

**Solutions:**

1. **Reinstall OpenCV:**

    ```cmd
    pip uninstall opencv-python
    pip install opencv-python
    ```

2. **Or try the headless version:**
    ```cmd
    pip install opencv-python-headless
    ```

## Testing the Installation

1. **Test Tesseract locator:**

    ```cmd
    python tesseract_locator.py
    ```

2. **Test Tesseract directly:**

    ```cmd
    tesseract --version
    ```

3. **Test Python wrapper:**

    ```cmd
    python -c "import tesserocr; print('Success!')"
    ```

4. **Test the OCR script:**
    ```cmd
    python process.py test-screenshot.png
    ```

## Environment Variables

If you need to set Tesseract path manually, you can set these environment variables:

```cmd
set TESSDATA_PREFIX=C:\Program Files\Tesseract-OCR\tessdata
set PATH=%PATH%;C:\Program Files\Tesseract-OCR
```

## Common Issues

### Issue: Different Python versions

Make sure you're using the same Python version for both the virtual environment and the main system.

### Issue: Antivirus blocking installation

Some antivirus software may block the installation. Temporarily disable it or add exceptions.

### Issue: Permission denied

Run the command prompt as Administrator if you encounter permission issues.

## Getting Help

If you're still having issues:

1. Check the error message carefully
2. Verify all prerequisites are installed
3. Try the setup script: `setup-windows.bat`
4. Check the troubleshooting section above
5. Ensure you're using the latest versions of Python and Tesseract
