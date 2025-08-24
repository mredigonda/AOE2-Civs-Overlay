const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const OCRService = require("./ocr-service.js");
const ImageAnalyzer = require("./image-analyzer.js");

const {
    DEFAULT_WINDOW_WIDTH,
    DEFAULT_WINDOW_HEIGHT,
} = require("./constants.js");

let mainWindow;
let isWindowVisible = true;

// Add console logging for debugging
console.log("Electron app starting...");

// Windows-specific always-on-top handling
const ensureAlwaysOnTop = () => {
    if (mainWindow && process.platform === "win32") {
        // Force always-on-top on Windows
        mainWindow.setAlwaysOnTop(true, "screen-saver");
        console.log("Ensured window is always on top (Windows)");
    }
};

// IPC handler for updating window size
ipcMain.handle("update-window-size", async (event, width, height) => {
    if (mainWindow) {
        mainWindow.setSize(width, height);
        return { success: true, width, height };
    }
    return { success: false, error: "Main window not found" };
});

// Screenshot counter for auto-incrementing filenames
let screenshotCounter = 1;

// IPC handler for screen capture
ipcMain.handle("capture-screen", async (event) => {
    try {
        const { desktopCapturer, screen } = require("electron");

        // Get the display where the main window is currently located
        const currentDisplay = screen.getDisplayNearestPoint(
            mainWindow.getBounds()
        );

        if (!currentDisplay) {
            throw new Error("Could not determine current display");
        }

        console.log(
            `Capturing from display: ${currentDisplay.id} (${currentDisplay.size.width}x${currentDisplay.size.height})`
        );

        // Get screen sources only (no audio) with higher resolution for better OCR
        const sources = await desktopCapturer.getSources({
            types: ["screen"],
            thumbnailSize: { width: 3840, height: 2160 }, // 4K resolution for better OCR accuracy
        });

        if (sources.length === 0) {
            throw new Error("No screen sources found");
        }

        // Find the source that matches our current display
        let targetSource = null;

        // On macOS, we can match by display ID
        if (process.platform === "darwin") {
            targetSource = sources.find(
                (source) => source.display_id === currentDisplay.id.toString()
            );
        }

        // On Windows, we can match by display bounds
        if (process.platform === "win32") {
            targetSource = sources.find((source) => {
                const sourceBounds = source.display_id
                    ? JSON.parse(source.display_id)
                    : null;
                if (sourceBounds) {
                    return (
                        sourceBounds.x === currentDisplay.bounds.x &&
                        sourceBounds.y === currentDisplay.bounds.y
                    );
                }
                return false;
            });
        }

        // Fallback to first source if we can't find a match
        if (!targetSource) {
            console.log(
                "Could not match display, using first available source"
            );
            targetSource = sources[0];
        }

        const HEIGHT_TO_CROP = 400;
        // Get the full screen image and crop it to top 400px using nativeImage
        const { nativeImage } = require("electron");
        const fullImage = nativeImage.createFromDataURL(
            targetSource.thumbnail.toDataURL()
        );

        // Get the original size
        const originalSize = fullImage.getSize();

        // Crop to top 400px (or full height if less than 400px)
        const cropHeight = Math.min(HEIGHT_TO_CROP, originalSize.height);
        const croppedImage = fullImage.crop({
            x: 0,
            y: 0,
            width: originalSize.width,
            height: cropHeight,
        });

        // Convert back to data URL
        const croppedImageData = croppedImage.toDataURL();

        console.log(
            `Cropped screenshot to top ${cropHeight}px and resized 4x: ${croppedImageData.length} characters`
        );

        return { success: true, imageData: croppedImageData };
    } catch (error) {
        console.error("Screen capture failed:", error);
        return { success: false, error: error.message };
    }
});

// IPC handler for getting next screenshot filename
ipcMain.handle("get-next-screenshot-filename", async (event) => {
    const filename = `aoe2-civs-overlay-screenshot-${screenshotCounter
        .toString()
        .padStart(4, "0")}.png`;
    screenshotCounter++;
    return { success: true, filename };
});

// IPC handler for getting current display information
ipcMain.handle("get-current-display-info", async (event) => {
    try {
        const { screen } = require("electron");

        if (!mainWindow) {
            return { success: false, error: "Main window not found" };
        }

        const currentDisplay = screen.getDisplayNearestPoint(
            mainWindow.getBounds()
        );

        if (!currentDisplay) {
            return {
                success: false,
                error: "Could not determine current display",
            };
        }

        return {
            success: true,
            display: {
                id: currentDisplay.id,
                bounds: currentDisplay.bounds,
                size: currentDisplay.size,
                workArea: currentDisplay.workArea,
                scaleFactor: currentDisplay.scaleFactor,
                rotation: currentDisplay.rotation,
                internal: currentDisplay.internal,
                monochrome: currentDisplay.monochrome,
                colorDepth: currentDisplay.colorDepth,
                colorSpace: currentDisplay.colorSpace,
                depthPerComponent: currentDisplay.depthPerComponent,
            },
        };
    } catch (error) {
        console.error("Failed to get display info:", error);
        return { success: false, error: error.message };
    }
});

// IPC handler for saving screenshot directly to file system
ipcMain.handle("save-screenshot", async (event, imageData) => {
    try {
        // Generate filename
        const filename = `aoe2-civs-overlay-screenshot-${screenshotCounter
            .toString()
            .padStart(4, "0")}.png`;
        screenshotCounter++;

        // Get downloads folder path
        const downloadsPath = path.join(os.homedir(), "Downloads");
        const filePath = path.join(downloadsPath, filename);

        // Remove data URL prefix to get base64 data
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");

        // Write file directly to downloads folder
        fs.writeFileSync(filePath, base64Data, "base64");

        return { success: true, filename, filePath };
    } catch (error) {
        console.error("Failed to save screenshot:", error);
        return { success: false, error: error.message };
    }
});

// Initialize OCR service and image analyzer
let ocrService = null;
let imageAnalyzer = null;

// Enhanced OCR function using RapidOCR
async function ocrScreenshot(imageBuffer) {
    try {
        // Initialize OCR service if not already done
        if (!ocrService) {
            ocrService = new OCRService();
            await ocrService.initialize();
        }

        // Perform OCR using RapidOCR
        const result = await ocrService.performOCR(imageBuffer);

        return {
            text: result.text,
            confidence: result.confidence,
            detections: result.detections || [],
            preprocessedImage: null, // RapidOCR handles preprocessing internally
        };
    } catch (error) {
        console.error("RapidOCR failed:", error);
        throw error;
    }
}

// IPC handler for OCR text extraction
ipcMain.handle("extract-text-from-screenshot", async (event, imageData) => {
    console.log("🔄 OCR request received from renderer process");
    const startTime = Date.now();

    try {
        console.log("🖼️ Converting base64 image data to buffer...");
        // Convert base64 image data to buffer
        const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        console.log(`🖼️ Image buffer created: ${imageBuffer.length} bytes`);

        console.log("🔍 Calling OCR service...");
        // Use enhanced OCR function
        const { text, confidence, detections, preprocessedImage } =
            await ocrScreenshot(imageBuffer);

        // Initialize image analyzer if not already done
        if (!imageAnalyzer) {
            imageAnalyzer = new ImageAnalyzer();
        }

        // Analyze detections to find resource words
        console.log("🔍 Analyzing OCR detections for resource words...");
        const analysisResult = imageAnalyzer.analyzeDetections(detections);

        console.log(
            `🎯 Image analysis result: ${imageAnalyzer.getSummary(
                analysisResult
            )}`
        );

        // Save preprocessed image to file (when preprocessing is enabled)
        if (preprocessedImage) {
            try {
                const preprocessedBase64 = preprocessedImage.replace(
                    /^data:image\/png;base64,/,
                    ""
                );
                const preprocessedFilename = `aoe2-civs-overlay-screenshot-${(
                    screenshotCounter - 1
                )
                    .toString()
                    .padStart(4, "0")}-preprocessed.png`;
                const downloadsPath = path.join(os.homedir(), "Downloads");
                const preprocessedFilePath = path.join(
                    downloadsPath,
                    preprocessedFilename
                );

                fs.writeFileSync(
                    preprocessedFilePath,
                    preprocessedBase64,
                    "base64"
                );
                console.log(
                    `Preprocessed image saved to: ${preprocessedFilePath}`
                );
            } catch (error) {
                console.error("Failed to save preprocessed image:", error);
            }
        }

        const endTime = Date.now();
        console.log(
            `✅ OCR completed in ${
                endTime - startTime
            }ms with confidence: ${confidence}%`
        );
        console.log(
            `📝 Extracted text: ${text.substring(0, 100)}${
                text.length > 100 ? "..." : ""
            }`
        );

        return {
            success: true,
            text,
            confidence,
            detections,
            analysisResult,
        };
    } catch (error) {
        const endTime = Date.now();
        console.error(`❌ OCR failed after ${endTime - startTime}ms:`, error);
        return { success: false, error: error.message };
    }
});

const createWindow = () => {
    console.log("Creating main window...");

    mainWindow = new BrowserWindow({
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        hasShadow: false,
        fullscreenable: false,
        focusable: true, // Always focusable since we have a small drag icon
        roundedCorners: false,
        show: false, // Don't show until ready
        backgroundColor: "#00000000", // Transparent background
        // Windows-specific settings for better always-on-top behavior
        skipTaskbar: true, // Hide from taskbar
        type: process.platform === "win32" ? "toolbar" : undefined, // Use toolbar window type on Windows
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    // Use proper path resolution for Windows
    const htmlPath = path.join(__dirname, "civ-selector.html");
    console.log("Loading HTML file from:", htmlPath);
    mainWindow.loadFile(htmlPath);

    // Show window when ready to prevent invisible window issues
    mainWindow.once("ready-to-show", () => {
        console.log("Window ready to show");
        mainWindow.showInactive();
        // Ensure always-on-top is set after window is shown
        ensureAlwaysOnTop();
    });

    // Open dev tools for debugging (uncomment for development)
    // mainWindow.webContents.openDevTools({ mode: 'detach' });

    // Handle window closed
    mainWindow.on("closed", () => {
        console.log("Main window closed");
        mainWindow = null;
    });

    // Handle window errors
    mainWindow.webContents.on(
        "did-fail-load",
        (event, errorCode, errorDescription) => {
            console.error(
                "Failed to load window:",
                errorCode,
                errorDescription
            );
        }
    );
};

app.whenReady().then(() => {
    console.log("App is ready, creating window...");
    createWindow();

    // Register global shortcut for toggling window visibility
    globalShortcut.register("CommandOrControl+Alt+`", () => {
        if (mainWindow) {
            if (isWindowVisible) {
                mainWindow.hide();
                isWindowVisible = false;
                console.log("Window hidden");
            } else {
                // Show window without focusing it
                mainWindow.showInactive();
                isWindowVisible = true;
                console.log("Window shown without focus");
            }
        }
    });

    // Windows-specific: Periodically ensure always-on-top stays active
    if (process.platform === "win32") {
        setInterval(() => {
            if (mainWindow && isWindowVisible) {
                ensureAlwaysOnTop();
            }
        }, 5000); // Check every 5 seconds
    }
});

// Handle window-all-closed event properly for Windows
app.on("window-all-closed", () => {
    console.log("All windows closed");
    // Don't quit the app on Windows when all windows are closed
    if (process.platform !== "darwin") {
        // On Windows, keep the app running but hide the window
        if (mainWindow) {
            mainWindow.hide();
            isWindowVisible = false;
        }
    }
});

/* Age of Empires 2 - Start */

const civs = [
    { code: "ARM", name: "Armenians" },
    { code: "AZT", name: "Aztecs" },
    { code: "BENG", name: "Bengalis" },
    { code: "BER", name: "Berbers" },
    { code: "BOH", name: "Bohemians" },
    { code: "BRI", name: "Britons" },
    { code: "BUL", name: "Bulgarians" },
    { code: "BURGU", name: "Burgundians" },
    { code: "BUR", name: "Burmese" },
    { code: "BYZ", name: "Byzantines" },
    { code: "CEL", name: "Celts" },
    { code: "CHI", name: "Chinese" },
    { code: "CUM", name: "Cumans" },
    { code: "DRAV", name: "Dravidians" },
    { code: "ETH", name: "Ethiopians" },
    { code: "FRK", name: "Franks" },
    { code: "GEO", name: "Georgians" },
    { code: "GOT", name: "Goths" },
    { code: "GURJ", name: "Gurjaras" },
    { code: "HIN", name: "Hindustanis" },
    { code: "HUN", name: "Huns" },
    { code: "INC", name: "Inca" },
    { code: "ITA", name: "Italians" },
    { code: "JAP", name: "Japanese" },
    { code: "JUR", name: "Jurchens" },
    { code: "KHI", name: "Khitans" },
    { code: "KHM", name: "Khmer" },
    { code: "KOR", name: "Koreans" },
    { code: "LIT", name: "Lithuanians" },
    { code: "MAG", name: "Magyars" },
    { code: "MALY", name: "Malay" },
    { code: "MAL", name: "Malians" },
    { code: "MAY", name: "Maya" },
    { code: "MON", name: "Mongols" },
    { code: "PER", name: "Persians" },
    { code: "POL", name: "Poles" },
    { code: "POR", name: "Portuguese" },
    { code: "ROM", name: "Romans" },
    { code: "SAR", name: "Saracens" },
    { code: "SHU", name: "Shu" },
    { code: "SIC", name: "Sicilians" },
    { code: "SLV", name: "Slavs" },
    { code: "SPN", name: "Spanish" },
    { code: "TAT", name: "Tatars" },
    { code: "TEU", name: "Teutons" },
    { code: "TUR", name: "Turks" },
    { code: "VIE", name: "Vietnamese" },
    { code: "VIK", name: "Vikings" },
    { code: "WEI", name: "Wei" },
    { code: "WU", name: "Wu" },
];

/* Age of Empires 2 - End */

// No custom window movement handling needed - using CSS -webkit-app-region: drag

// Cleanup when app is about to quit
app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});
