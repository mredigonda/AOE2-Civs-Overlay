const path = require("path");
const fs = require("fs");

// Import the OCR service
const OCRService = require("./src/ocr-service.js");

async function testOCRService() {
    console.log("🧪 Testing OCR Service on Windows...\n");

    const ocrService = new OCRService();

    try {
        // Test V2 initialization
        console.log("📋 Testing V2 initialization...");
        await ocrService.initializeV2();
        console.log("✅ V2 initialization successful\n");

        // Check if test screenshot exists
        const testImagePath = path.join(__dirname, "test-screenshot.png");
        if (!fs.existsSync(testImagePath)) {
            console.log("❌ test-screenshot.png not found!");
            console.log(
                "Please ensure the test image exists in the root directory."
            );
            return;
        }

        // Read the test image
        console.log("📋 Reading test image...");
        const imageBuffer = fs.readFileSync(testImagePath);
        console.log(`✅ Image loaded: ${imageBuffer.length} bytes\n`);

        // Test OCR V2
        console.log("📋 Testing OCR V2...");
        const result = await ocrService.performOCRV2(imageBuffer);
        console.log("✅ OCR V2 successful!");
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (error) {
        console.log("❌ Error during testing:");
        console.log(error.message);
        console.log(error.stack);
    }
}

// Run the test
testOCRService().catch(console.error);
