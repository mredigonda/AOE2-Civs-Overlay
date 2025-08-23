# RapidOCR Integration Setup

This document explains how to set up the RapidOCR integration for the AOE2 Civs Overlay application.

## Overview

The application now uses RapidOCR (a Python-based OCR engine) instead of Tesseract.js for better text recognition accuracy. This requires Python 3.7+ to be installed on your system.

## Prerequisites

1. **Python 3.7+**: Make sure Python 3 is installed on your system

    - Windows: Download from https://python.org
    - macOS: `brew install python3` or download from https://python.org
    - Linux: `sudo apt install python3` (Ubuntu/Debian)

2. **Node.js**: Already required for the Electron app

## Setup Instructions

### Option 1: Automatic Setup (Recommended)

Run the setup script:

```bash
./setup-python.sh
```

This script will:

-   Check if Python 3 is installed
-   Create a virtual environment
-   Install the required Python dependencies

### Option 2: Manual Setup

1. Navigate to the python-experiment-rapidocr directory:

    ```bash
    cd python-experiment-rapidocr
    ```

2. Create a virtual environment:

    ```bash
    python3 -m venv .venv
    ```

3. Activate the virtual environment:

    ```bash
    source .venv/bin/activate  # On macOS/Linux
    # or
    .venv\Scripts\activate     # On Windows
    ```

4. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Running the Application

After setup, you can run the application normally:

```bash
npm start
```

The application will automatically:

1. Detect the Python executable
2. Use the RapidOCR service for text recognition
3. Provide better OCR accuracy compared to the previous Tesseract.js implementation

## Troubleshooting

### Python Not Found

If you get an error about Python not being found:

-   Ensure Python 3.7+ is installed and in your PATH
-   On Windows, you may need to add Python to your PATH environment variable

### Virtual Environment Issues

If the virtual environment setup fails:

-   Try running the setup script manually
-   Ensure you have write permissions in the project directory
-   On Windows, you might need to run as administrator

### Dependencies Installation Issues

If pip install fails:

-   Update pip: `python3 -m pip install --upgrade pip`
-   Try installing with `--user` flag: `pip install --user -r requirements.txt`

## Performance Notes

-   RapidOCR provides better accuracy for UI text recognition
-   The first OCR operation may take a few seconds as the model loads (typically 2-3 seconds)
-   Subsequent operations will be faster due to model caching
-   The Python process is spawned on-demand and terminated after each OCR operation
-   The service automatically uses the virtual environment Python executable to ensure all dependencies are available
-   Processing time scales with image size - larger images take longer to process

## Files Changed

-   `index.js`: Updated to use RapidOCR instead of Tesseract.js
-   `ocr-service.js`: New Node.js module for Python communication
-   `python-experiment-rapidocr/ocr_service.py`: Python OCR service
-   `python-experiment-rapidocr/requirements.txt`: Python dependencies
-   `package.json`: Removed Tesseract.js dependency
-   `setup-python.sh`: Setup script for Python environment
