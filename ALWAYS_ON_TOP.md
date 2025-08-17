# Always-On-Top Functionality

This application implements always-on-top functionality specifically optimized for Windows.

## Features

### Automatic Always-On-Top

-   The window is automatically set to always-on-top when the application starts
-   Uses Windows-specific `toolbar` window type for better compatibility
-   Hidden from taskbar to avoid clutter

### Windows-Specific Optimizations

-   Uses `screen-saver` level always-on-top for maximum compatibility
-   Periodic enforcement every 5 seconds to ensure the setting persists
-   Proper window type configuration for Windows

### Keyboard Shortcuts

-   `Ctrl+Alt+\``: Toggle window visibility (doesn't steal focus from current application)

### Drag Icon

-   Small golden drag icon (⋮⋮) in the top-right corner
-   Always clickable and draggable
-   Minimal size (16x16px) to reduce misclick probability
-   Hover effects for better user feedback

## Technical Implementation

### Window Configuration

```javascript
{
    alwaysOnTop: true,
    skipTaskbar: true,
    type: process.platform === 'win32' ? 'toolbar' : undefined
}
```

### Always-On-Top Enforcement

-   Uses `setAlwaysOnTop(true, 'screen-saver')` for maximum compatibility
-   Periodic checks ensure the setting doesn't get overridden by other applications
-   Windows-specific handling to work around potential OS limitations

### Drag Icon Implementation

-   Small 16x16px icon positioned in top-right corner
-   Uses CSS `-webkit-app-region: drag` for native window dragging
-   Always visible and interactive
-   Golden color with hover effects for visibility

## Known Limitations

1. **Windows Security**: Some Windows security settings or group policies might prevent always-on-top behavior
2. **Fullscreen Applications**: Fullscreen applications (like games) may still appear above the overlay
3. **Administrator Rights**: Some applications running with elevated privileges might appear above the overlay

## Troubleshooting

If the always-on-top functionality isn't working:

1. Ensure the application has proper permissions
2. Try running the application as administrator
3. Check Windows security settings
4. Use the `Ctrl+Alt+T` shortcut to manually toggle always-on-top
5. Check the console logs for any error messages

## Testing

Use the test build to verify functionality:

```bash
npm run start-test
```

This will open a test window with always-on-top enabled and developer tools for debugging.
