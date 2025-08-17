# 🏰 Age of Empires 2 Civilization Overlay

![Screenshot showcasing the app at work](./demo.png)

A sleek, always-on-top overlay application that provides instant access to Age of Empires 2 civilization information during gameplay. Perfect for anyone who wants a quick reference without a second monitor or alt-tabbing.

Note: you need to run Age of Empires II in "Full Desktop" in Options → Graphics → Display Mode.

![AOE2 Overlay](https://img.shields.io/badge/Age%20of%20Empires%202-Overlay-brightgreen)
![Electron](https://img.shields.io/badge/Electron-37.3.0-blue)
![Windows](https://img.shields.io/badge/Windows-Supported-green)

## ✨ Features

### 🎯 Core Functionality

-   **Instant Civilization Lookup**: Search and select any of the 50 civilizations instantly
-   **Comprehensive Civ Information**: View detailed bonuses, unique units, technologies, and more
-   **Always-On-Top**: Stays visible above your game window without interrupting gameplay
-   **Non-Intrusive**: Transparent overlay that doesn't steal focus from your current application

### 🎮 Gaming Optimizations

-   **Click-Through Design**: Only the drag icon and civ selector are interactive - everything else ignores clicks
-   **Focus-Friendly**: Keyboard shortcuts don't interrupt your current application
-   **Windows Optimized**: Uses Windows-specific window types for maximum compatibility
-   **Periodic Enforcement**: Ensures always-on-top behavior persists during long gaming sessions

### 🎨 User Experience

-   **Small Drag Icon**: 16x16px golden icon for easy window repositioning
-   **Smooth Animations**: Hover effects and transitions for better visual feedback
-   **Responsive Design**: Automatically resizes to match content
-   **Golden Theme**: Styled to match Age of Empires 2's aesthetic

### ⌨️ Keyboard Shortcuts

-   **`Ctrl+Alt+\``**: Toggle overlay visibility (doesn't steal focus)

## 📦 Installation

The quickest way will be to download the `.exe` file from the [releases section](https://github.com/mredigonda/AOE2-Civs-Overlay/releases) in this repo.

If you instead prefer to build it from the sorce code, read below.

## 🚀 Quick Start

### Prerequisites

-   **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
-   **Windows 10/11** (primary target platform)

### Local Development

1. **Clone the repository**

    ```bash
    git clone <repository-url>
    cd aoe2-civs-overlay
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Run the application**

    ```bash
    npm start
    ```

### Building the Executable

1. **Open a terminal with admin permissions in Windows**

2. **Install dependencies and build**

    ```bash
    npm install
    npm run dist-windows
    ```

3. **Find your executable**
    - Navigate to the `dist` folder
    - Look for `AOE2 Civs Overlay.exe`
    - Double-click to run

### Build Options

-   **Portable Build**: `npm run dist-windows` (recommended)
-   **Debug Build**: `npm run dist-windows-debug` (for troubleshooting)

## 🎯 How to Use

1. **Launch the overlay** - The window will appear in the top-right corner
2. **Position it** - Click and drag the golden icon (⋮⋮) to move it anywhere on screen
3. **Search civilizations** - Type in the search box to find any civilization
4. **View details** - Click on a civilization to see comprehensive information
5. **Toggle visibility** - Use `Ctrl+Alt+\`` to show/hide the overlay during gameplay

## 🏛️ Civilization Information

Each civilization displays:

-   **Focus**: Primary gameplay focus
-   **Team Bonus**: Bonus shared with allies
-   **Civilization Bonuses**: Unique advantages
-   **Unique Units**: Special military units
-   **Unique Technologies**: Special upgrades
-   **Unique Buildings**: Special structures (where applicable)

## 🔧 Technical Details

### Architecture

-   **Frontend**: Vanilla JavaScript with modern CSS
-   **Backend**: Electron for cross-platform desktop functionality
-   **Data**: JSON-based civilization database
-   **Styling**: Custom CSS with Age of Empires 2 theming

### Windows Optimizations

-   **Window Type**: Uses `toolbar` window type for better always-on-top behavior
-   **Always-On-Top Level**: `screen-saver` level for maximum compatibility
-   **Focus Management**: `showInactive()` prevents focus stealing
-   **Periodic Enforcement**: 5-second intervals ensure persistent behavior

### Performance

-   **Lightweight**: Minimal resource usage
-   **Fast Search**: Instant civilization lookup
-   **Smooth Dragging**: Native window dragging via CSS
-   **Memory Efficient**: No unnecessary background processes

## 📞 Support

If you encounter any issues or have suggestions:

-   Open an issue on GitHub

---

**Happy gaming! 🎮⚔️**

_May your civilizations prosper and your strategies prevail!_

(yes, the above, and in fact, the whole project, was super vibe-coded)
