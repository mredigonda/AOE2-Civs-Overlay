const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const path = require("path");
const {
    DEFAULT_WINDOW_WIDTH,
    DEFAULT_WINDOW_HEIGHT,
} = require("./constants.js");

let mainWindow;
let isWindowVisible = true;

// Add console logging for debugging
console.log("Electron app starting...");

// IPC handler for updating window size
ipcMain.handle("update-window-size", async (event, width, height) => {
    if (mainWindow) {
        mainWindow.setSize(width, height);
        return { success: true, width, height };
    }
    return { success: false, error: "Main window not found" };
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
        focusable: true, // Changed from false to true for Windows compatibility
        roundedCorners: false,
        show: false, // Don't show until ready
        backgroundColor: "#00000000", // Transparent background
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
        mainWindow.show();
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

    // Register global shortcut for making window interactive
    globalShortcut.register("CommandOrControl+Alt+Y", () => {
        if (mainWindow) {
            console.log("Making window interactive");
            // Make window interactive
            mainWindow.setFocusable(true);
            mainWindow.setAlwaysOnTop(false);
            mainWindow.webContents.send("make-interactive");

            // Revert after 5 seconds
            setTimeout(() => {
                mainWindow.setFocusable(true); // Keep focusable true for Windows
                mainWindow.setAlwaysOnTop(true);
                mainWindow.webContents.send("make-non-interactive");
            }, 5000);
        }
    });

    // Register global shortcut for toggling window visibility
    globalShortcut.register("CommandOrControl+Alt+`", () => {
        if (mainWindow) {
            if (isWindowVisible) {
                mainWindow.hide();
                isWindowVisible = false;
                console.log("Window hidden");
            } else {
                mainWindow.show();
                isWindowVisible = true;
                console.log("Window shown");
            }
        }
    });
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
