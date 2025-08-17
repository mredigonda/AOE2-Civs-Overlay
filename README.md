# 🏰 Age of Empires 2 Civilization Overlay

![Screenshot showcasing the app at work](./demo.png)

A sleek, always-on-top overlay application that provides instant access to Age of Empires 2 civilization information during gameplay. Perfect for streamers, competitive players, and anyone who wants quick reference to civ bonuses without alt-tabbing.

![AOE2 Overlay](https://img.shields.io/badge/Age%20of%20Empires%202-Overlay-brightgreen)
![Electron](https://img.shields.io/badge/Electron-37.3.0-blue)
![Windows](https://img.shields.io/badge/Windows-Supported-green)

## ✨ Features

### 🎯 Core Functionality

-   **Instant Civilization Lookup**: Search and select any of the 42+ civilizations instantly
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
-   **Drag Icon**: Click and drag to move the overlay anywhere on screen

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

4. **Test the Windows build**
    ```bash
    npm run start-test
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

## 🐛 Troubleshooting

### Common Issues

**Overlay not staying on top:**

-   Ensure you're running as administrator
-   Check Windows security settings
-   Try the `Ctrl+Alt+\`` shortcut to refresh

**Shortcut not working:**

-   Make sure no other application is using the same shortcut
-   Try restarting the application

**Window not draggable:**

-   Look for the small golden icon (⋮⋮) in the top-right corner
-   Ensure the window is visible (not hidden)

### Debug Mode

Run with debug information:

```bash
npm run dist-windows-debug
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   **Age of Empires 2 Community** - For the inspiration and feedback
-   **Electron Team** - For the excellent desktop framework
-   **Civilization Data** - Compiled from official Age of Empires 2 sources

## 📞 Support

If you encounter any issues or have suggestions:

-   Open an issue on GitHub
-   Check the troubleshooting section above
-   Ensure you're running the latest version

---

**Happy gaming! 🎮⚔️**

_May your civilizations prosper and your strategies prevail!_
