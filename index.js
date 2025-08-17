const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const {
    DEFAULT_WINDOW_WIDTH,
    DEFAULT_WINDOW_HEIGHT,
} = require("./constants.js");

let mainWindow;

// IPC handler for updating window size
ipcMain.handle("update-window-size", async (event, width, height) => {
    if (mainWindow) {
        mainWindow.setSize(width, height);
        return { success: true, width, height };
    }
    return { success: false, error: "Main window not found" };
});

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: DEFAULT_WINDOW_WIDTH,
        height: DEFAULT_WINDOW_HEIGHT,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        hasShadow: false,
        fullscreenable: false,
        focusable: false,
        roundedCorners: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    mainWindow.loadFile("civ-selector.html");

    // Open dev tools for development
    // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
    createWindow();

    // Register global shortcut for making window interactive
    globalShortcut.register("CommandOrControl+Shift+P", () => {
        if (mainWindow) {
            // Make window interactive
            mainWindow.setFocusable(true);
            mainWindow.setAlwaysOnTop(false);
            mainWindow.webContents.send("make-interactive");

            // Revert after 5 seconds
            setTimeout(() => {
                mainWindow.setFocusable(false);
                mainWindow.setAlwaysOnTop(true);
                mainWindow.webContents.send("make-non-interactive");
            }, 5000);
        }
    });
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
