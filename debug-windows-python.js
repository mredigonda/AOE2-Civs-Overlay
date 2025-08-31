const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

async function debugWindowsPython() {
    console.log("🔍 Debugging Windows Python Environment...\n");

    // Check if we're on Windows
    console.log(`Platform: ${process.platform}`);
    console.log(`Architecture: ${process.arch}\n`);

    // Check for tesseract virtual environment
    const venvPath = path.join(
        __dirname,
        "python-experiment-tesseract",
        ".venv"
    );
    const venvPythonPath = path.join(venvPath, "Scripts", "python.exe");

    console.log(`Virtual environment path: ${venvPath}`);
    console.log(`Virtual environment exists: ${fs.existsSync(venvPath)}`);
    console.log(`Python executable path: ${venvPythonPath}`);
    console.log(`Python executable exists: ${fs.existsSync(venvPythonPath)}\n`);

    if (!fs.existsSync(venvPythonPath)) {
        console.log("❌ Virtual environment Python not found!");
        console.log("Please run the setup script first:");
        console.log("  setup-windows.bat");
        return;
    }

    // Test Python version
    console.log("📋 Testing Python version...");
    try {
        const result = await runCommand(venvPythonPath, ["--version"]);
        console.log(`Python version: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ Error getting Python version: ${error.message}`);
        return;
    }

    // Test importing cv2
    console.log("\n📋 Testing cv2 import...");
    try {
        const result = await runCommand(venvPythonPath, [
            "-c",
            'import cv2; print("cv2 version:", cv2.__version__)',
        ]);
        console.log(`✅ cv2 import successful: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ cv2 import failed: ${error.message}`);
        console.log(`stderr: ${error.stderr}`);
    }

    // Test importing tesserocr
    console.log("\n📋 Testing tesserocr import...");
    try {
        const result = await runCommand(venvPythonPath, [
            "-c",
            'import tesserocr; print("tesserocr version:", tesserocr.__version__)',
        ]);
        console.log(`✅ tesserocr import successful: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ tesserocr import failed: ${error.message}`);
        console.log(`stderr: ${error.stderr}`);
    }

    // Test the tesseract locator
    console.log("\n📋 Testing tesseract locator...");
    try {
        const result = await runCommand(venvPythonPath, [
            "tesseract_locator.py",
        ]);
        console.log(`✅ Tesseract locator output:\n${result.stdout}`);
    } catch (error) {
        console.log(`❌ Tesseract locator failed: ${error.message}`);
        console.log(`stderr: ${error.stderr}`);
    }

    // Test the full process.py script
    console.log("\n📋 Testing process.py script...");
    try {
        const result = await runCommand(venvPythonPath, [
            "process.py",
            "test-screenshot.png",
        ]);
        console.log(
            `✅ Process script output:\n${result.stdout.substring(0, 500)}...`
        );
    } catch (error) {
        console.log(`❌ Process script failed: ${error.message}`);
        console.log(`stderr: ${error.stderr}`);
    }
}

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Running: ${command} ${args.join(" ")}`);

        // Set up environment
        const env = { ...process.env };
        const venvPath = path.dirname(path.dirname(command));
        env.VIRTUAL_ENV = venvPath;

        // For Windows, set PYTHONPATH
        if (process.platform === "win32") {
            const sitePackagesPath = path.join(
                venvPath,
                "Lib",
                "site-packages"
            );
            if (env.PYTHONPATH) {
                env.PYTHONPATH = `${sitePackagesPath};${env.PYTHONPATH}`;
            } else {
                env.PYTHONPATH = sitePackagesPath;
            }
            console.log(`🔧 Set PYTHONPATH: ${env.PYTHONPATH}`);
        }

        const childProcess = spawn(command, args, {
            stdio: ["pipe", "pipe", "pipe"],
            env: env,
        });

        let stdout = "";
        let stderr = "";

        childProcess.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        childProcess.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        childProcess.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(
                    new Error(
                        `Process exited with code ${code}. stderr: ${stderr}`
                    )
                );
            }
        });

        childProcess.on("error", (error) => {
            reject(error);
        });
    });
}

// Run the debug
debugWindowsPython().catch(console.error);
