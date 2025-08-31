const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

async function testEnvironmentDebug() {
    console.log("🔍 Testing Environment Variables\n");

    // Check if we're on Windows
    console.log(`Platform: ${process.platform}`);
    console.log(`Current directory: ${process.cwd()}\n`);

    // Check for tesseract virtual environment
    const venvPath = path.join(
        __dirname,
        "python-experiment-tesseract",
        ".venv"
    );
    const venvPythonPath = path.join(venvPath, "Scripts", "python.exe");

    console.log(`Virtual environment path: ${venvPath}`);
    console.log(`Virtual environment exists: ${fs.existsSync(venvPath)}`);
    console.log(`Python executable exists: ${fs.existsSync(venvPythonPath)}\n`);

    if (!fs.existsSync(venvPythonPath)) {
        console.log("❌ Virtual environment not found!");
        return;
    }

    // Test 1: Check what Python sees
    console.log("🧪 Test 1: Check Python environment");
    try {
        const result = await runPythonWithEnv(venvPythonPath, [
            "-c",
            'import sys; print("Python executable:", sys.executable); print("Python path:"); [print(f"  {p}") for p in sys.path]; print("Environment variables:"); import os; [print(f"  {k}={v}") for k, v in os.environ.items() if "PYTHON" in k or "VIRTUAL" in k]',
        ]);
        console.log(`✅ Environment check:\n${result.stdout}`);
    } catch (error) {
        console.log(`❌ Environment check failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }

    // Test 2: Check if cv2 can be found
    console.log("\n🧪 Test 2: Check cv2 availability");
    try {
        const result = await runPythonWithEnv(venvPythonPath, [
            "-c",
            'import sys; print("Looking for cv2 in:"); [print(f"  {p}") for p in sys.path]; import cv2; print("cv2 found at:", cv2.__file__)',
        ]);
        console.log(`✅ cv2 check:\n${result.stdout}`);
    } catch (error) {
        console.log(`❌ cv2 check failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }

    // Test 3: Check site-packages directory
    console.log("\n🧪 Test 3: Check site-packages");
    const sitePackagesPath = path.join(venvPath, "Lib", "site-packages");
    console.log(`Site-packages path: ${sitePackagesPath}`);
    console.log(`Site-packages exists: ${fs.existsSync(sitePackagesPath)}`);

    if (fs.existsSync(sitePackagesPath)) {
        const files = fs.readdirSync(sitePackagesPath);
        const cv2Files = files.filter(
            (f) => f.includes("cv2") || f.includes("opencv")
        );
        console.log(
            `cv2-related files in site-packages: ${cv2Files.join(", ")}`
        );
    }
}

function runPythonWithEnv(pythonPath, args) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Running: ${pythonPath} ${args.join(" ")}`);

        // Set up environment exactly like the OCR service does
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
            console.log(`🔧 Set VIRTUAL_ENV: ${env.VIRTUAL_ENV}`);
            console.log(`🔧 Set PYTHONPATH: ${env.PYTHONPATH}`);
        }

        const childProcess = spawn(pythonPath, args, {
            stdio: ["pipe", "pipe", "pipe"],
            env: env,
            cwd: path.join(__dirname, "python-experiment-tesseract"),
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
testEnvironmentDebug().catch(console.error);
