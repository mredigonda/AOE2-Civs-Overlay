# Windows Testing Guide

## Issues Fixed

1. **Path Resolution**: Now using `path.join(__dirname, 'civ-selector.html')` instead of relative paths
2. **Window Focus**: Changed `focusable: false` to `focusable: true` for Windows compatibility
3. **Window Visibility**: Added `show: false` and `ready-to-show` event to prevent invisible windows
4. **Console Logging**: Added extensive logging for debugging
5. **Error Handling**: Added proper error handlers for window loading failures
6. **Windows App Behavior**: Fixed `window-all-closed` event to not quit the app on Windows

## Testing Steps

### 1. Build the Application

```bash
npm run dist-windows
```

### 2. Test with Console Output

Use one of these methods:

**Option A: PowerShell (Recommended)**

```powershell
.\test-windows.ps1
```

**Option B: Batch File**

```cmd
test-windows.bat
```

**Option C: Manual PowerShell**

```powershell
cd "path\to\your\project"
.\dist\"AOE2 Civs Overlay.exe"
```

### 3. Debug Build (if needed)

```bash
npm run dist-windows-debug
```

### 4. Test Development Version

```bash
npm run start-test
```

## What to Look For

1. **Console Output**: You should see logs like:

    - "Electron app starting..."
    - "App is ready, creating window..."
    - "Creating main window..."
    - "Loading HTML file from: [path]"
    - "Window ready to show"

2. **Window Behavior**:

    - Window should appear and be visible
    - Window should be interactive (not click-through)
    - Window should stay on top

3. **Error Messages**: Look for any error messages in the console output

## Common Issues and Solutions

### Issue: "Executable not found"

-   Make sure you ran `npm run dist-windows` first
-   Check that the `dist/` folder exists and contains the .exe file

### Issue: "Failed to load window"

-   Check that `civ-selector.html` exists in the project root
-   Verify all required files are included in the build

### Issue: Window appears but is invisible

-   The window might be created off-screen
-   Check that `show: true` is set or `ready-to-show` event is working

### Issue: Window is not interactive

-   Verify `focusable: true` is set
-   Check that `setIgnoreMouseEvents` is not blocking interaction

## Architecture Mismatch

If you still get architecture errors, try:

```bash
npm run dist-windows
```

This explicitly targets x64 architecture which is most common on Windows PCs.

## Additional Debugging

If the app still doesn't work, uncomment this line in `index.js`:

```javascript
mainWindow.webContents.openDevTools({ mode: "detach" });
```

This will open the developer tools in a separate window, allowing you to see any JavaScript errors.
