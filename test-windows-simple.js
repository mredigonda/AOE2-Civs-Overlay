const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

async function testWindowsPython() {
    console.log("🔍 Simple Windows Python Test\n");

    // Check if we're on Windows
    console.log(`Platform: ${process.platform}`);
    console.log(`Current directory: ${process.cwd()}\n`);

    // Check for virtual environment
    const venvPath = path.join(
        __dirname,
        "python-experiment-tesseract",
        ".venv"
    );
    const venvPythonPath = path.join(venvPath, "Scripts", "python.exe");

    console.log(`Looking for virtual environment at: ${venvPath}`);
    console.log(`Virtual environment exists: ${fs.existsSync(venvPath)}`);
    console.log(`Python executable exists: ${fs.existsSync(venvPythonPath)}\n`);

    if (!fs.existsSync(venvPythonPath)) {
        console.log("❌ Virtual environment not found!");
        console.log(
            "Please run: ./python-experiment-tesseract/setup-windows.sh"
        );
        return;
    }

    // Test 1: Basic Python
    console.log("🧪 Test 1: Basic Python");
    try {
        const result = await runPython(venvPythonPath, ["--version"]);
        console.log(`✅ Python works: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ Python failed: ${error.message}`);
        return;
    }

    // Test 2: Import cv2
    console.log("\n🧪 Test 2: Import cv2");
    try {
        const result = await runPython(venvPythonPath, [
            "-c",
            'import cv2; print("cv2 version:", cv2.__version__)',
        ]);
        console.log(`✅ cv2 works: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ cv2 failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }

    // Test 3: Import tesserocr
    console.log("\n🧪 Test 3: Import tesserocr");
    try {
        const result = await runPython(venvPythonPath, [
            "-c",
            'import tesserocr; print("tesserocr works")',
        ]);
        console.log(`✅ tesserocr works: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ tesserocr failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }

    // Test 4: Tesseract locator
    console.log("\n🧪 Test 4: Tesseract locator");
    try {
        const result = await runPython(venvPythonPath, [
            "tesseract_locator.py",
        ]);
        console.log(`✅ Tesseract locator works:\n${result.stdout}`);
    } catch (error) {
        console.log(`❌ Tesseract locator failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }

    // Test 5: Full process script
    console.log("\n🧪 Test 5: Full process script");
    const testImagePath = path.join(__dirname, "test-screenshot.png");
    if (fs.existsSync(testImagePath)) {
        try {
            const result = await runPython(venvPythonPath, [
                "process.py",
                testImagePath,
            ]);
            console.log(
                `✅ Process script works:\n${result.stdout.substring(
                    0,
                    200
                )}...`
            );
        } catch (error) {
            console.log(`❌ Process script failed: ${error.message}`);
            console.log(`Error details: ${error.stderr}`);
        }
    } else {
        console.log(
            "⚠️ test-screenshot.png not found, skipping process script test"
        );
    }
}

function runPython(pythonPath, args) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Running: ${pythonPath} ${args.join(" ")}`);

        // Set up environment
        const env = { ...process.env };
        const venvPath = path.dirname(path.dirname(pythonPath));
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
            console.log(`🔧 PYTHONPATH: ${env.PYTHONPATH}`);
        }

        const childProcess = spawn(pythonPath, args, {
            stdio: ["pipe", "pipe", "pipe"],
            env: env,
            cwd: path.join(__dirname, "python-experiment-tesseract"), // Set working directory
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

// Run the test
testWindowsPython().catch(console.error);
