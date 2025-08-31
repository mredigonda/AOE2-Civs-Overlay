Based on my analysis of the current system and the new tesseract implementation, here are all the necessary changes to switch from PaddleOCR to tesseract:

## Required Changes

### 1. **Modify the tesseract script to accept image input**

**File**: `python-experiment-tesseract/process.py`

The current script is hardcoded to use `test-screenshot.png`. We need to modify it to:
- Accept image data via stdin (like the current PaddleOCR script)
- Accept base64 encoded images
- Return JSON output in the same format as the current system

### 2. **Update OCR service paths and initialization**

**File**: `src/ocr-service.js`

Change the script path from:
```javascript
this.scriptPath = path.join(
    __dirname,
    "..",
    "python-experiment-rapidocr",
    "ocr_service.py"
);
```

To:
```javascript
this.scriptPath = path.join(
    __dirname,
    "..",
    "python-experiment-tesseract",
    "process.py"
);
```

### 3. **Update virtual environment paths**

**File**: `src/ocr-service.js`

Change all references from `python-experiment-rapidocr` to `python-experiment-tesseract`:
- Virtual environment Python paths
- Environment variable setup
- PYTHONPATH configuration

### 4. **Update the performOCRV2 method**

**File**: `src/ocr-service.js`

The `performOCRV2` method currently just logs "Not implemented yet". This should be updated to call the tesseract script instead of the current PaddleOCR implementation.

### 5. **Update the main OCR function call**

**File**: `src/index.js`

Change the OCR function call from `performOCR` to `performOCRV2` in the `ocrScreenshot` function.

### 6. **Handle image cropping in the tesseract script**

The current system crops the screenshot to the top 400px in `src/index.js`. The tesseract script needs to handle this cropping internally since it's designed to work with the full HUD area.

### 7. **Update dependencies and requirements**

**File**: `python-experiment-tesseract/requirements.txt`

Create a requirements.txt file for the tesseract dependencies (tesserocr, opencv-python, numpy, PIL).

### 8. **Update setup scripts**

**Files**: `setup-python.sh`, `setup-windows.bat`

Update these scripts to install tesseract dependencies instead of PaddleOCR dependencies.

## Implementation Priority

1. **First**: Modify `process.py` to accept stdin input and return JSON output
2. **Second**: Update `ocr-service.js` paths and initialization
3. **Third**: Update the main OCR function call in `index.js`
4. **Fourth**: Update setup scripts and requirements
5. **Fifth**: Test and debug the integration

The key insight is that the tesseract script needs to be modified to match the interface expected by the current system - accepting base64 image data via stdin and returning JSON results via stdout, while handling the image cropping internally.