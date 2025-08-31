const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

async function testActivationApproach() {
    console.log("🔍 Testing Virtual Environment Activation Approach\n");

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
    const activateScript = path.join(venvPath, "Scripts", "activate.bat");

    console.log(`Virtual environment path: ${venvPath}`);
    console.log(`Virtual environment exists: ${fs.existsSync(venvPath)}`);
    console.log(`Python executable exists: ${fs.existsSync(venvPythonPath)}`);
    console.log(`Activation script exists: ${fs.existsSync(activateScript)}\n`);

    if (!fs.existsSync(venvPythonPath)) {
        console.log("❌ Virtual environment not found!");
        return;
    }

    // Test 1: Direct Python with minimal environment
    console.log("🧪 Test 1: Direct Python (minimal env)");
    try {
        const result = await runPythonDirect(venvPythonPath, [
            "-c",
            'import sys; print("Python executable:", sys.executable); print("Python path:"); [print(f"  {p}") for p in sys.path[:3]]',
        ]);
        console.log(`✅ Direct Python:\n${result.stdout}`);
    } catch (error) {
        console.log(`❌ Direct Python failed: ${error.message}`);
    }

    // Test 2: Try importing cv2 directly
    console.log("\n🧪 Test 2: Import cv2 directly");
    try {
        const result = await runPythonDirect(venvPythonPath, [
            "-c",
            'import cv2; print("cv2 version:", cv2.__version__)',
        ]);
        console.log(`✅ cv2 import successful: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ cv2 import failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }

    // Test 3: Check if cv2 is actually installed
    console.log("\n🧪 Test 3: Check cv2 installation");
    const sitePackagesPath = path.join(venvPath, "Lib", "site-packages");
    console.log(`Site-packages path: ${sitePackagesPath}`);
    console.log(`Site-packages exists: ${fs.existsSync(sitePackagesPath)}`);

    if (fs.existsSync(sitePackagesPath)) {
        const files = fs.readdirSync(sitePackagesPath);
        const cv2Files = files.filter(
            (f) => f.includes("cv2") || f.includes("opencv")
        );
        console.log(`cv2-related files: ${cv2Files.join(", ")}`);

        if (cv2Files.length === 0) {
            console.log("❌ No cv2 files found in site-packages!");
            console.log(
                "This means cv2 is not installed in the virtual environment."
            );
            console.log(
                "Please run: cd python-experiment-tesseract && source .venv/Scripts/activate && pip install opencv-python==4.12.0.88"
            );
        }
    }

    // Test 4: Try with explicit site-packages path
    console.log("\n🧪 Test 4: Python with explicit site-packages");
    try {
        const result = await runPythonWithSitePackages(venvPythonPath, [
            "-c",
            'import cv2; print("cv2 version:", cv2.__version__)',
        ]);
        console.log(`✅ cv2 with explicit path: ${result.stdout.trim()}`);
    } catch (error) {
        console.log(`❌ cv2 with explicit path failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }
}

function runPythonDirect(pythonPath, args) {
    return new Promise((resolve, reject) => {
        console.log(`🚀 Running: ${pythonPath} ${args.join(" ")}`);

        // Use minimal environment - just inherit from parent
        const env = { ...process.env };

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

function runPythonWithSitePackages(pythonPath, args) {
    return new Promise((resolve, reject) => {
        console.log(
            `🚀 Running with site-packages: ${pythonPath} ${args.join(" ")}`
        );

        // Set up environment with explicit site-packages
        const env = { ...process.env };
        const venvPath = path.dirname(path.dirname(pythonPath));
        const sitePackagesPath = path.join(venvPath, "Lib", "site-packages");

        // Set PYTHONPATH to include site-packages
        env.PYTHONPATH = sitePackagesPath;
        env.VIRTUAL_ENV = venvPath;

        console.log(`🔧 PYTHONPATH: ${env.PYTHONPATH}`);
        console.log(`🔧 VIRTUAL_ENV: ${env.VIRTUAL_ENV}`);

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
testActivationApproach().catch(console.error);
