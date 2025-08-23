# Windows Deployment Guide

This guide explains how to deploy the AOE2 Civs Overlay application on Windows with the integrated RapidOCR system.

## 🎯 Deployment Strategy

We use **PyInstaller** to bundle the Python OCR service into a standalone executable, which is then packaged with the Electron app. This ensures:

-   ✅ **No Python installation required** on end-user machines
-   ✅ **Single executable file** for easy distribution
-   ✅ **All dependencies included** in the package
-   ✅ **Cross-platform compatibility** maintained

## 🚀 Quick Deployment

### For Developers (Building the App)

1. **Setup Python Environment**:

    ```bash
    # On Windows
    setup-python-windows.bat

    # On macOS/Linux
    ./setup-python.sh
    ```

2. **Build for Windows**:
    ```bash
    npm run dist-windows
    ```

This will:

-   Bundle the Python OCR service into an executable
-   Package everything into a portable Windows executable
-   Create `dist/AOE2 Civs Overlay.exe`

### For End Users

1. **Download** the `AOE2 Civs Overlay.exe` file
2. **Run** the executable (no installation required)
3. **Use** the application normally

## 🔧 Technical Details

### Build Process

1. **Python Bundling**: PyInstaller creates `dist/python-ocr/ocr_service.exe`
2. **Electron Packaging**: electron-builder includes the Python executable
3. **Final Output**: Single portable executable with everything included

### File Structure in Distribution

```
AOE2 Civs Overlay.exe
├── resources/
│   ├── app.asar (Electron app)
│   └── dist/
│       └── python-ocr/
│           └── ocr_service.exe (Bundled Python OCR)
└── [other Electron files]
```

## 📋 Requirements

### Development Machine

-   **Python 3.7+** (for building)
-   **Node.js** (for Electron)
-   **Windows** (for Windows builds)

### End User Machine

-   **Windows 10/11** (64-bit)
-   **No Python required**
-   **No additional dependencies**

## 🛠️ Troubleshooting

### Build Issues

**"PyInstaller not found"**:

```bash
cd python-experiment-rapidocr
source .venv/bin/activate  # or .venv\Scripts\activate.bat on Windows
pip install pyinstaller
```

**"OCR service not working"**:

-   Check that `dist/python-ocr/ocr_service.exe` exists
-   Verify the executable has proper permissions
-   Test the Python script directly first

### Runtime Issues

**"OCR service failed to start"**:

-   Ensure the executable is included in the build
-   Check Windows Defender isn't blocking the executable
-   Verify the path in `ocr-service.js` is correct

## 🔄 Development vs Production

### Development Mode

-   Uses Python script directly
-   Requires Python environment
-   Faster iteration for development

### Production Mode

-   Uses bundled executable
-   No Python required
-   Optimized for distribution

The app automatically detects the mode based on `NODE_ENV` environment variable.

## 📦 Alternative Approaches

If PyInstaller doesn't work, consider:

1. **Docker Container**: Package Python in a container
2. **Web Service**: Run OCR as a separate web service
3. **Native OCR**: Use a native Windows OCR library
4. **Cloud OCR**: Use cloud-based OCR services

## 🎉 Benefits of This Approach

-   **User-Friendly**: Single executable, no installation
-   **Reliable**: All dependencies bundled
-   **Fast**: Local OCR processing
-   **Secure**: No external dependencies
-   **Portable**: Works on any Windows machine

