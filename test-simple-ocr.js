const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

async function testSimpleOCR() {
    console.log("🔍 Testing Simple OCR Service Approach\n");

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
    const scriptPath = path.join(
        __dirname,
        "python-experiment-tesseract",
        "process.py"
    );

    console.log(`Virtual environment path: ${venvPath}`);
    console.log(`Virtual environment exists: ${fs.existsSync(venvPath)}`);
    console.log(`Python executable exists: ${fs.existsSync(venvPythonPath)}`);
    console.log(`Script path exists: ${fs.existsSync(scriptPath)}\n`);

    if (!fs.existsSync(venvPythonPath)) {
        console.log("❌ Virtual environment not found!");
        return;
    }

    // Test the exact same approach as the OCR service
    console.log("🧪 Testing OCR Service Approach");
    try {
        const result = await runOCRServiceStyle(venvPythonPath, [
            scriptPath,
            "test-screenshot.png",
        ]);
        console.log(
            `✅ OCR Service approach works:\n${result.stdout.substring(
                0,
                200
            )}...`
        );
    } catch (error) {
        console.log(`❌ OCR Service approach failed: ${error.message}`);
        console.log(`Error details: ${error.stderr}`);
    }
}

function runOCRServiceStyle(pythonPath, args) {
    return new Promise((resolve, reject) => {
        console.log(
            `🚀 Running OCR Service style: ${pythonPath} ${args.join(" ")}`
        );

        // Set up environment exactly like the OCR service does
        const env = { ...process.env };
        const venvPath = path.dirname(path.dirname(pythonPath));
        const sitePackagesPath = path.join(venvPath, "Lib", "site-packages");

        // Set VIRTUAL_ENV to help Python find the virtual environment
        env.VIRTUAL_ENV = venvPath;

        // Set PYTHONPATH to include site-packages
        env.PYTHONPATH = sitePackagesPath;

        console.log(`🔧 Set VIRTUAL_ENV: ${env.VIRTUAL_ENV}`);
        console.log(`🔧 Set PYTHONPATH: ${env.PYTHONPATH}`);

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
testSimpleOCR().catch(console.error);
