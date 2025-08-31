const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

class OCRService {
    constructor() {
        this.pythonPath = null;
        this.scriptPath = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Check if we're in development or production
            const isDev = process.env.NODE_ENV !== "production";

            if (isDev) {
                // Development mode: use Python script
                this.pythonPath = await this.findPythonPath();
                this.scriptPath = path.join(
                    __dirname,
                    "..",
                    "python-experiment-rapidocr",
                    "ocr_service.py"
                );
                console.log("🔧 Development mode: Using Python script");
            } else {
                // Production mode: use bundled executable
                const executableName =
                    process.platform === "win32"
                        ? "ocr_service.exe"
                        : "ocr_service";
                this.pythonPath = path.join(
                    __dirname,
                    "..",
                    "resources",
                    "python-ocr",
                    executableName
                );
                this.scriptPath = null; // No script path needed for executable
                console.log("🚀 Production mode: Using bundled executable");
            }

            this.isInitialized = true;
            console.log("OCR Service initialized with path:", this.pythonPath);
        } catch (error) {
            console.error("Failed to initialize OCR Service:", error);
            throw error;
        }
    }

    async initializeV2() {
        try {
            // Check if we're in development or production
            const isDev = process.env.NODE_ENV !== "production";

            if (isDev) {
                // Development mode: use Tesseract Python script
                this.pythonPathV2 = await this.findPythonPathV2();
                this.scriptPathV2 = path.join(
                    __dirname,
                    "..",
                    "python-experiment-tesseract",
                    "process.py"
                );
                console.log(
                    "🔧 Development mode V2: Using Tesseract Python script"
                );
            } else {
                // Production mode: use bundled executable (same as V1 for now)
                const executableName =
                    process.platform === "win32"
                        ? "ocr_service.exe"
                        : "ocr_service";
                this.pythonPathV2 = path.join(
                    __dirname,
                    "..",
                    "resources",
                    "python-ocr",
                    executableName
                );
                this.scriptPathV2 = null; // No script path needed for executable
                console.log("🚀 Production mode V2: Using bundled executable");
            }

            this.isInitializedV2 = true;
            console.log(
                "OCR Service V2 initialized with path:",
                this.pythonPathV2
            );
        } catch (error) {
            console.error("Failed to initialize OCR Service V2:", error);
            throw error;
        }
    }

    async findPythonPath() {
        // First, check if virtual environment Python exists (Unix/Linux/macOS)
        const venvPythonPath = path.join(
            __dirname,
            "..",
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
            "..",
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

    async findPythonPathV2() {
        // First, check if virtual environment Python exists (Unix/Linux/macOS)
        const venvPythonPath = path.join(
            __dirname,
            "..",
            "python-experiment-tesseract",
            ".venv",
            "bin",
            "python"
        );
        if (fs.existsSync(venvPythonPath)) {
            console.log(
                `✅ Found Unix virtual environment Python: ${venvPythonPath}`
            );
            return venvPythonPath;
        }

        // Check for Windows virtual environment Python
        const venvPythonPathWindows = path.join(
            __dirname,
            "..",
            "python-experiment-tesseract",
            ".venv",
            "Scripts",
            "python.exe"
        );
        if (fs.existsSync(venvPythonPathWindows)) {
            console.log(
                `✅ Found Windows virtual environment Python: ${venvPythonPathWindows}`
            );
            return venvPythonPathWindows;
        }

        console.log(
            "⚠️ Virtual environment Python not found, checking system Python..."
        );

        // Fallback to system Python - use spawn directly to avoid circular dependency
        const pythonNames = ["python3", "python", "py"];
        const { spawn } = require("child_process");

        for (const name of pythonNames) {
            try {
                const result = await new Promise((resolve, reject) => {
                    const child = spawn(name, ["--version"], {
                        stdio: ["pipe", "pipe", "pipe"],
                    });

                    let stdout = "";
                    let stderr = "";

                    child.stdout.on(
                        "data",
                        (data) => (stdout += data.toString())
                    );
                    child.stderr.on(
                        "data",
                        (data) => (stderr += data.toString())
                    );

                    child.on("close", (code) => {
                        if (code === 0) {
                            resolve({ success: true, stdout, stderr });
                        } else {
                            reject(
                                new Error(`Process exited with code ${code}`)
                            );
                        }
                    });

                    child.on("error", (error) => {
                        reject(error);
                    });
                });

                if (result.success) {
                    console.log(`✅ Found system Python: ${name}`);
                    return name;
                }
            } catch (error) {
                console.log(`⚠️ Python ${name} not found: ${error.message}`);
                // Continue to next option
            }
        }

        throw new Error(
            "Python executable not found. Please ensure Python 3.7+ is installed and in PATH"
        );
    }

    async runCommand(command, args, inputData = null, customPythonPath = null) {
        return new Promise((resolve, reject) => {
            console.log(
                `🔧 runCommand called with: ${command} ${args.join(" ")}`
            );
            if (inputData) {
                console.log(
                    `📤 Input data provided: ${inputData.length} characters`
                );
            }

            // If a custom Python path is provided, use it directly
            let pythonExecutable = command;
            if (customPythonPath) {
                console.log(`✅ Using custom Python path: ${customPythonPath}`);
                pythonExecutable = customPythonPath;
            } else {
                // Get the path to the virtual environment's Python executable (Unix/Linux/macOS)
                const venvPythonPath = path.join(
                    __dirname,
                    "..",
                    "python-experiment-rapidocr",
                    ".venv",
                    "bin",
                    "python"
                );
                // Get the path to the virtual environment's Python executable (Windows)
                const venvPythonPathWindows = path.join(
                    __dirname,
                    "..",
                    "python-experiment-rapidocr",
                    ".venv",
                    "Scripts",
                    "python.exe"
                );

                // Use the virtual environment Python if it exists, otherwise fall back to system Python
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
            }

            console.log(
                `🚀 Spawning process: ${pythonExecutable} ${args.join(" ")}`
            );

            // Set up environment to ensure Python finds the virtual environment packages
            const env = { ...process.env };

            if (customPythonPath) {
                // For custom Python path, extract the venv path from the Python executable path
                const venvPath = customPythonPath
                    .replace(/\/bin\/python$/, "")
                    .replace(/\\Scripts\\python\.exe$/, "");
                env.VIRTUAL_ENV = path.resolve(venvPath);
                console.log(`🔧 Set VIRTUAL_ENV to: ${env.VIRTUAL_ENV}`);

                // For Windows, we need to explicitly set PYTHONPATH to include site-packages
                if (process.platform === "win32") {
                    const sitePackagesPath = path.join(
                        venvPath,
                        "Lib",
                        "site-packages"
                    );
                    if (env.PYTHONPATH) {
                        env.PYTHONPATH = `${sitePackagesPath}${path.delimiter}${env.PYTHONPATH}`;
                    } else {
                        env.PYTHONPATH = sitePackagesPath;
                    }
                    console.log(
                        `🔧 Windows: Set PYTHONPATH to: ${env.PYTHONPATH}`
                    );
                }
            } else {
                // Get the path to the virtual environment's Python executable (Unix/Linux/macOS)
                const venvPythonPath = path.join(
                    __dirname,
                    "..",
                    "python-experiment-rapidocr",
                    ".venv",
                    "bin",
                    "python"
                );
                // Get the path to the virtual environment's Python executable (Windows)
                const venvPythonPathWindows = path.join(
                    __dirname,
                    "..",
                    "python-experiment-rapidocr",
                    ".venv",
                    "Scripts",
                    "python.exe"
                );

                if (
                    fs.existsSync(venvPythonPath) ||
                    fs.existsSync(venvPythonPathWindows)
                ) {
                    const venvPath = fs.existsSync(venvPythonPath)
                        ? path.join(
                              __dirname,
                              "..",
                              "python-experiment-rapidocr",
                              ".venv"
                          )
                        : path.join(
                              __dirname,
                              "..",
                              "python-experiment-rapidocr",
                              ".venv"
                          );

                    // Set VIRTUAL_ENV environment variable (critical for both platforms)
                    env.VIRTUAL_ENV = path.resolve(venvPath);

                    // For Windows, we need to explicitly set PYTHONPATH to include site-packages
                    if (fs.existsSync(venvPythonPathWindows)) {
                        const sitePackagesPath = path.join(
                            venvPath,
                            "Lib",
                            "site-packages"
                        );
                        if (env.PYTHONPATH) {
                            env.PYTHONPATH = `${sitePackagesPath}${path.delimiter}${env.PYTHONPATH}`;
                        } else {
                            env.PYTHONPATH = sitePackagesPath;
                        }
                        console.log(
                            `🔧 Windows: Set PYTHONPATH to: ${env.PYTHONPATH}`
                        );
                    }

                    console.log(`🔧 Set VIRTUAL_ENV to: ${env.VIRTUAL_ENV}`);
                }
            }

            // Add Windows-specific debugging
            if (process.platform === "win32") {
                console.log(
                    `🔧 Windows: Python executable path: ${pythonExecutable}`
                );
                console.log(`🔧 Windows: Script path: ${this.scriptPath}`);
                console.log(`🔧 Windows: Arguments: ${JSON.stringify(args)}`);
                console.log(
                    `🔧 Windows: Environment keys: ${Object.keys(env).join(
                        ", "
                    )}`
                );
                console.log(`🔧 Windows: VIRTUAL_ENV: ${env.VIRTUAL_ENV}`);
                console.log(`🔧 Windows: PYTHONPATH: ${env.PYTHONPATH}`);
            }

            const childProcess = spawn(pythonExecutable, args, {
                stdio: ["pipe", "pipe", "pipe"],
                env: env,
            });

            console.log(`📊 Process spawned with PID: ${childProcess.pid}`);

            let stdout = "";
            let stderr = "";

            childProcess.stdout.on("data", (data) => {
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

            childProcess.stderr.on("data", (data) => {
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

            childProcess.on("close", (code) => {
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

            childProcess.on("error", (error) => {
                console.error(`💥 Process error:`, error);
                reject(error);
            });

            // Send input data to stdin if provided
            if (inputData) {
                console.log(`📤 Sending input data to Python process...`);
                childProcess.stdin.write(inputData);
                childProcess.stdin.end();
                console.log(`📤 Input data sent and stdin closed`);
            }

            // Add timeout handling
            const timeout = setTimeout(() => {
                console.error(
                    `⏰ Process timeout after 30 seconds, killing process ${childProcess.pid}`
                );
                // Use appropriate signal for the platform
                const killSignal =
                    process.platform === "win32" ? "SIGTERM" : "SIGKILL";
                childProcess.kill(killSignal);
                reject(new Error("Process timeout after 30 seconds"));
            }, 30000);

            childProcess.on("close", () => {
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

            // Run Python OCR script or executable
            const args = this.scriptPath ? [this.scriptPath] : [];
            console.log(
                `🐍 Spawning process: ${this.pythonPath} ${args.join(" ")}`
            );
            console.log("⏳ Waiting for OCR process to complete...");

            const startTime = Date.now();
            const result = await this.runCommand(
                this.pythonPath,
                args,
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

    async performOCRV2(imageBuffer) {
        console.log("🔍 Starting OCRV2 processing with Tesseract...");

        if (!this.isInitializedV2) {
            console.log(
                "⚠️ OCR Service V2 not initialized, initializing now..."
            );
            await this.initializeV2();
        }

        try {
            console.log("📊 Converting image buffer to base64...");
            // Convert buffer to base64
            const base64Image = imageBuffer.toString("base64");
            console.log(
                `📊 Image converted to base64 (${base64Image.length} characters)`
            );

            // Prepare input data for tesseract script
            console.log("📝 Preparing input data for Tesseract script...");
            const inputData = JSON.stringify({
                image: base64Image,
            });
            console.log(
                `📝 Input data prepared (${inputData.length} characters)`
            );

            // Use tesseract script path from V2 initialization
            const tesseractScriptPath = this.scriptPathV2;
            const pythonPath = this.pythonPathV2;

            // Run Tesseract OCR script
            console.log(
                `🐍 Spawning Tesseract process: ${pythonPath} ${tesseractScriptPath}`
            );
            console.log("⏳ Waiting for Tesseract OCR process to complete...");

            const startTime = Date.now();
            const result = await this.runCommand(
                pythonPath,
                [tesseractScriptPath],
                inputData,
                pythonPath
            );
            const endTime = Date.now();

            console.log(
                `✅ Tesseract OCR script completed in ${endTime - startTime}ms`
            );
            console.log(
                `📄 Tesseract stdout length: ${result.stdout.length} characters`
            );
            console.log(
                `⚠️ Tesseract stderr length: ${result.stderr.length} characters`
            );

            if (result.stderr) {
                console.log("⚠️ Tesseract stderr output:", result.stderr);
            }

            // Parse the result
            console.log("🔍 Parsing Tesseract OCR result...");
            const ocrResult = JSON.parse(result.stdout);
            console.log("✅ Tesseract OCR result parsed successfully");

            if (!ocrResult.success) {
                console.error(
                    "❌ Tesseract OCR script returned error:",
                    ocrResult.error
                );
                throw new Error(
                    ocrResult.error || "Tesseract OCR processing failed"
                );
            }

            console.log(`✅ Tesseract OCR completed successfully!`);
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
            console.error("❌ Tesseract OCR processing failed:", error);
            throw error;
        }
    }
}

module.exports = OCRService;
