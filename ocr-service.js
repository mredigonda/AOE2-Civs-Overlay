const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class OCRService {
    constructor() {
        this.pythonPath = null;
        this.scriptPath = path.join(
            __dirname,
            "python-experiment-rapidocr",
            "ocr_service.py"
        );
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Try to find Python executable
            this.pythonPath = await this.findPythonPath();
            this.isInitialized = true;
            console.log(
                "OCR Service initialized with Python path:",
                this.pythonPath
            );
        } catch (error) {
            console.error("Failed to initialize OCR Service:", error);
            throw error;
        }
    }

    async findPythonPath() {
        // First, check if virtual environment Python exists (Unix/Linux/macOS)
        const venvPythonPath = path.join(
            __dirname,
            "python-experiment-rapidocr",
            ".venv",
            "bin",
            "python"
        );
        if (fs.existsSync(venvPythonPath)) {
            return venvPythonPath;
        }

        // Check for Windows virtual environment Python
        const venvPythonPathWindows = path.join(
            __dirname,
            "python-experiment-rapidocr",
            ".venv",
            "Scripts",
            "python.exe"
        );
        if (fs.existsSync(venvPythonPathWindows)) {
            return venvPythonPathWindows;
        }

        // Fallback to system Python
        const pythonNames = ["python3", "python", "py"];

        for (const name of pythonNames) {
            try {
                const result = await this.runCommand(name, ["--version"]);
                if (result.success) {
                    return name;
                }
            } catch (error) {
                // Continue to next option
            }
        }

        throw new Error(
            "Python executable not found. Please ensure Python 3.7+ is installed and in PATH"
        );
    }

    async runCommand(command, args, inputData = null) {
        return new Promise((resolve, reject) => {
            console.log(
                `🔧 runCommand called with: ${command} ${args.join(" ")}`
            );
            if (inputData) {
                console.log(
                    `📤 Input data provided: ${inputData.length} characters`
                );
            }

            // Get the path to the virtual environment's Python executable (Unix/Linux/macOS)
            const venvPythonPath = path.join(
                __dirname,
                "python-experiment-rapidocr",
                ".venv",
                "bin",
                "python"
            );
            // Get the path to the virtual environment's Python executable (Windows)
            const venvPythonPathWindows = path.join(
                __dirname,
                "python-experiment-rapidocr",
                ".venv",
                "Scripts",
                "python.exe"
            );

            // Use the virtual environment Python if it exists, otherwise fall back to system Python
            let pythonExecutable = command;
            if (fs.existsSync(venvPythonPath)) {
                pythonExecutable = venvPythonPath;
                console.log(
                    `✅ Using virtual environment Python: ${pythonExecutable}`
                );
            } else if (fs.existsSync(venvPythonPathWindows)) {
                pythonExecutable = venvPythonPathWindows;
                console.log(
                    `✅ Using Windows virtual environment Python: ${pythonExecutable}`
                );
            } else {
                console.log(`⚠️ Using system Python: ${pythonExecutable}`);
            }

            console.log(
                `🚀 Spawning process: ${pythonExecutable} ${args.join(" ")}`
            );
            const process = spawn(pythonExecutable, args, {
                stdio: ["pipe", "pipe", "pipe"],
            });

            console.log(`📊 Process spawned with PID: ${process.pid}`);

            let stdout = "";
            let stderr = "";

            process.stdout.on("data", (data) => {
                const chunk = data.toString();
                stdout += chunk;
                console.log(
                    `📄 Python stdout chunk (${
                        chunk.length
                    } chars): ${chunk.substring(0, 100)}${
                        chunk.length > 100 ? "..." : ""
                    }`
                );
            });

            process.stderr.on("data", (data) => {
                const chunk = data.toString();
                stderr += chunk;
                console.log(
                    `⚠️ Python stderr chunk (${
                        chunk.length
                    } chars): ${chunk.substring(0, 100)}${
                        chunk.length > 100 ? "..." : ""
                    }`
                );
            });

            process.on("close", (code) => {
                console.log(`🔚 Process closed with code: ${code}`);
                if (code === 0) {
                    console.log(`✅ Command completed successfully`);
                    resolve({ success: true, stdout, stderr });
                } else {
                    console.error(`❌ Command failed with code ${code}`);
                    reject(
                        new Error(`Command failed with code ${code}: ${stderr}`)
                    );
                }
            });

            process.on("error", (error) => {
                console.error(`💥 Process error:`, error);
                reject(error);
            });

            // Send input data to stdin if provided
            if (inputData) {
                console.log(`📤 Sending input data to Python process...`);
                process.stdin.write(inputData);
                process.stdin.end();
                console.log(`📤 Input data sent and stdin closed`);
            }

            // Add timeout handling
            const timeout = setTimeout(() => {
                console.error(
                    `⏰ Process timeout after 30 seconds, killing process ${process.pid}`
                );
                process.kill("SIGKILL");
                reject(new Error("Process timeout after 30 seconds"));
            }, 30000);

            process.on("close", () => {
                clearTimeout(timeout);
            });
        });
    }

    async performOCR(imageBuffer) {
        console.log("🔍 Starting OCR processing...");

        if (!this.isInitialized) {
            console.log("⚠️ OCR Service not initialized, initializing now...");
            await this.initialize();
        }

        try {
            console.log("📊 Converting image buffer to base64...");
            // Convert buffer to base64
            const base64Image = imageBuffer.toString("base64");
            console.log(
                `📊 Image converted to base64 (${base64Image.length} characters)`
            );

            // Prepare input data
            console.log("📝 Preparing input data for Python script...");
            const inputData = JSON.stringify({
                image: base64Image,
            });
            console.log(
                `📝 Input data prepared (${inputData.length} characters)`
            );

            // Run Python OCR script
            console.log(
                `🐍 Spawning Python process: ${this.pythonPath} ${this.scriptPath}`
            );
            console.log("⏳ Waiting for Python OCR script to complete...");

            const startTime = Date.now();
            const result = await this.runCommand(
                this.pythonPath,
                [this.scriptPath],
                inputData
            );
            const endTime = Date.now();

            console.log(
                `✅ Python OCR script completed in ${endTime - startTime}ms`
            );
            console.log(
                `📄 Python stdout length: ${result.stdout.length} characters`
            );
            console.log(
                `⚠️ Python stderr length: ${result.stderr.length} characters`
            );

            if (result.stderr) {
                console.log("⚠️ Python stderr output:", result.stderr);
            }

            // Parse the result
            console.log("🔍 Parsing Python OCR result...");
            const ocrResult = JSON.parse(result.stdout);
            console.log("✅ Python OCR result parsed successfully");

            if (!ocrResult.success) {
                console.error(
                    "❌ Python OCR script returned error:",
                    ocrResult.error
                );
                throw new Error(ocrResult.error || "OCR processing failed");
            }

            console.log(`✅ OCR completed successfully!`);
            console.log(
                `📝 Detected text length: ${ocrResult.text.length} characters`
            );
            console.log(`📊 Average confidence: ${ocrResult.confidence}`);
            console.log(
                `🔢 Number of detections: ${
                    ocrResult.detections ? ocrResult.detections.length : 0
                }`
            );

            return {
                text: ocrResult.text,
                confidence: ocrResult.confidence,
                detections: ocrResult.detections || [],
            };
        } catch (error) {
            console.error("❌ OCR processing failed:", error);
            throw error;
        }
    }
}

module.exports = OCRService;
