const { app, BrowserWindow } = require("electron");
const path = require("path");

console.log("=== WINDOWS TEST BUILD ===");
console.log("Node version:", process.version);
console.log("Platform:", process.platform);
console.log("Architecture:", process.arch);
console.log("Current directory:", __dirname);

let mainWindow;

const createWindow = () => {
    console.log("Creating test window...");

    mainWindow = new BrowserWindow({
        width: 400,
        height: 300,
        show: false,
        backgroundColor: "#ffffff",
        alwaysOnTop: true,
        skipTaskbar: true,
        type: process.platform === "win32" ? "toolbar" : undefined,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    const htmlPath = path.join(__dirname, "civ-selector.html");
    console.log("Loading HTML from:", htmlPath);

    mainWindow.loadFile(htmlPath);

    mainWindow.once("ready-to-show", () => {
        console.log("Window ready to show");
        mainWindow.show();
        // Ensure always-on-top on Windows
        if (process.platform === "win32") {
            mainWindow.setAlwaysOnTop(true, "screen-saver");
            console.log("Set always-on-top for Windows test window");
        }
        // Open dev tools for debugging
        mainWindow.webContents.openDevTools({ mode: "detach" });
    });

    mainWindow.on("closed", () => {
        console.log("Window closed");
        mainWindow = null;
    });

    mainWindow.webContents.on(
        "did-fail-load",
        (event, errorCode, errorDescription) => {
            console.error("Failed to load:", errorCode, errorDescription);
        }
    );
};

app.whenReady().then(() => {
    console.log("App ready, creating window...");
    createWindow();
});

app.on("window-all-closed", () => {
    console.log("All windows closed");
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    console.log("App activated");
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Enable logging
app.commandLine.appendSwitch("enable-logging");
app.commandLine.appendSwitch("v", "1");
