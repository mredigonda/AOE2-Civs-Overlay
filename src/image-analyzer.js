/**
 * Image Analyzer Module
 * Processes OCR detections to find specific resource words and their associated numeric values
 */

class ImageAnalyzer {
    constructor() {
        // Resource words to look for
        this.resourceWords = ["FOOD", "WOOD", "STONE", "GOLD"];

        // Resource icons and worker icons
        this.resourceIcons = {
            FOOD: "🥩",
            WOOD: "🪵",
            STONE: "🪨",
            GOLD: "🧈",
        };

        this.workerIcons = {
            FOOD: "🏹",
            WOOD: "🪓",
            STONE: "👷🏼‍♂️",
            GOLD: "👷🏼‍♂️",
        };
    }

    /**
     * Checks if a string represents a numeric value
     * @param {String} text - Text to check
     * @returns {Boolean} True if numeric
     */
    isNumeric(text) {
        if (!text || typeof text !== "string") return false;
        const cleanText = text.trim().replace(/[,\s]/g, ""); // Remove commas and spaces
        return /^\d+$/.test(cleanText); // Only digits
    }

    /**
     * Calculates Manhattan distance between two points
     * @param {Object} point1 - {x, y} coordinates
     * @param {Object} point2 - {x, y} coordinates
     * @returns {Number} Manhattan distance
     */
    manhattanDistance(point1, point2) {
        return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
    }

    /**
     * Finds the two closest numeric values to a resource label
     * @param {Object} resourceInfo - Resource information with coordinates
     * @param {Array} numericDetections - Array of numeric detections
     * @param {Array} allResources - All found resources for X-axis bounds
     * @returns {Object} Object with stockpile and workers info
     */
    findClosestNumericValues(resourceInfo, numericDetections, allResources) {
        const resourceCoords = resourceInfo.coordinates;
        if (!resourceCoords) {
            return { stockpile: null, workers: null, status: "no_coordinates" };
        }

        // Find the next resource to the right for X-axis bounds
        const currentIndex = allResources.findIndex(
            (r) => r.resource === resourceInfo.resource
        );
        const nextResource = allResources[currentIndex + 1];

        // Filter numeric detections that are to the right of this resource and left of next resource
        const validNumericDetections = numericDetections.filter((detection) => {
            if (!detection.coordinates) return false;

            // Must be to the right of current resource
            if (detection.coordinates.x <= resourceCoords.x) return false;

            // Must be to the left of next resource (if exists)
            if (
                nextResource &&
                nextResource.coordinates &&
                detection.coordinates.x >= nextResource.coordinates.x
            )
                return false;

            return true;
        });

        if (validNumericDetections.length < 2) {
            return {
                stockpile: null,
                workers: null,
                status: "insufficient_numbers",
                available: validNumericDetections.length,
            };
        }

        // Calculate Manhattan distances to all valid numeric detections
        const distances = validNumericDetections.map((detection) => ({
            detection: detection,
            distance: this.manhattanDistance(
                resourceCoords,
                detection.coordinates
            ),
        }));

        // Sort by distance and take the two closest
        distances.sort((a, b) => a.distance - b.distance);
        const closestTwo = distances.slice(0, 2);

        // Determine which is stockpile (higher Y) and which is workers (lower Y)
        const [first, second] = closestTwo;

        // Stockpile should be above workers (lower Y coordinate since Y grows downwards)
        let stockpile, workers;
        if (first.detection.coordinates.y <= second.detection.coordinates.y) {
            stockpile = first.detection;
            workers = second.detection;
        } else {
            stockpile = second.detection;
            workers = first.detection;
        }

        return {
            stockpile: {
                value: parseInt(stockpile.text.replace(/[,\s]/g, "")),
                coordinates: stockpile.coordinates,
                confidence: stockpile.confidence,
            },
            workers: {
                value: parseInt(workers.text.replace(/[,\s]/g, "")),
                coordinates: workers.coordinates,
                confidence: workers.confidence,
            },
            status: "complete",
        };
    }

    /**
     * Analyzes OCR detections to find resource words and their associated numeric values
     * @param {Array} detections - Array of OCR detection objects
     * @returns {Object} Analysis result with found resources and their numeric values
     */
    analyzeDetections(detections) {
        console.log("🔍 Starting enhanced image analysis...");
        console.log(`📝 Processing ${detections.length} OCR detections`);

        const foundResources = [];
        const numericDetections = [];
        const analysisResult = {
            success: true,
            foundResources: foundResources,
            numericDetections: numericDetections,
            totalDetections: detections.length,
            resourceCount: 0,
            numericCount: 0,
        };

        if (!detections || detections.length === 0) {
            console.log("⚠️ No detections to analyze");
            return analysisResult;
        }

        // First pass: separate resources and numeric values
        detections.forEach((detection, index) => {
            const text = detection.text
                ? detection.text.trim().toUpperCase()
                : "";
            const confidence = detection.confidence || 0;
            const boundingBox = detection.bounding_box;

            console.log(
                `🔍 Detection ${
                    index + 1
                }: "${text}" (confidence: ${confidence})`
            );

            // Check if this detection matches any resource word
            const matchedResource = this.resourceWords.find(
                (resource) => text === resource || text.includes(resource)
            );

            if (matchedResource) {
                // Extract coordinates from bounding box
                let coordinates = null;
                let boxSize = null;

                if (boundingBox && boundingBox.length > 0) {
                    // Get top-left coordinates (first point in bounding box)
                    const [x, y] = boundingBox[0];
                    coordinates = { x, y };

                    // Calculate box size if we have multiple points
                    if (boundingBox.length >= 3) {
                        const [x1, y1] = boundingBox[0]; // top-left
                        const [x2, y2] = boundingBox[1]; // top-right
                        const [x3, y3] = boundingBox[2]; // bottom-left

                        const width = Math.sqrt(
                            Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
                        );
                        const height = Math.sqrt(
                            Math.pow(x3 - x1, 2) + Math.pow(y3 - y1, 2)
                        );

                        boxSize = { width, height };
                    }
                }

                const resourceInfo = {
                    resource: matchedResource,
                    text: text,
                    confidence: confidence,
                    coordinates: coordinates,
                    boxSize: boxSize,
                    detectionIndex: index,
                };

                foundResources.push(resourceInfo);
                analysisResult.resourceCount++;

                console.log(
                    `✅ Found resource: ${matchedResource} at (${coordinates?.x}, ${coordinates?.y}) with confidence ${confidence}`
                );
            }

            // Check if this is a numeric value
            if (this.isNumeric(text)) {
                let coordinates = null;
                if (boundingBox && boundingBox.length > 0) {
                    const [x, y] = boundingBox[0];
                    coordinates = { x, y };
                }

                const numericInfo = {
                    text: text,
                    value: parseInt(text.replace(/[,\s]/g, "")),
                    confidence: confidence,
                    coordinates: coordinates,
                    detectionIndex: index,
                };

                numericDetections.push(numericInfo);
                analysisResult.numericCount++;

                console.log(
                    `🔢 Found numeric: ${text} at (${coordinates?.x}, ${coordinates?.y}) with confidence ${confidence}`
                );
            }
        });

        // Sort resources by X coordinate (left to right)
        foundResources.sort(
            (a, b) => (a.coordinates?.x || 0) - (b.coordinates?.x || 0)
        );

        // Second pass: find numeric values for each resource
        console.log("🔍 Finding numeric values for each resource...");
        foundResources.forEach((resource) => {
            const numericValues = this.findClosestNumericValues(
                resource,
                numericDetections,
                foundResources
            );
            resource.numericValues = numericValues;

            console.log(`📊 ${resource.resource}: ${numericValues.status}`);
            if (numericValues.status === "complete") {
                console.log(
                    `  Stockpile: ${numericValues.stockpile.value} at (${numericValues.stockpile.coordinates.x}, ${numericValues.stockpile.coordinates.y})`
                );
                console.log(
                    `  Workers: ${numericValues.workers.value} at (${numericValues.workers.coordinates.x}, ${numericValues.workers.coordinates.y})`
                );
            } else if (numericValues.status === "insufficient_numbers") {
                console.log(
                    `  Only ${numericValues.available} numeric value(s) found`
                );
            }
        });

        console.log(
            `🎯 Enhanced analysis complete: Found ${foundResources.length} resources and ${numericDetections.length} numeric values`
        );

        return analysisResult;
    }

    /**
     * Gets a summary of found resources with their numeric values
     * @param {Object} analysisResult - Result from analyzeDetections
     * @returns {String} Summary string
     */
    getSummary(analysisResult) {
        if (
            !analysisResult.foundResources ||
            analysisResult.foundResources.length === 0
        ) {
            return "No resource words found";
        }

        const resourceList = analysisResult.foundResources
            .map((r) => {
                const status = r.numericValues?.status || "unknown";
                return `${r.resource}(${status})`;
            })
            .join(", ");

        return `Found ${analysisResult.resourceCount} resources: ${resourceList}`;
    }

    /**
     * Formats resource information for UI display
     * @param {Object} analysisResult - Result from analyzeDetections
     * @returns {Array} Array of formatted resource strings
     */
    formatForUI(analysisResult) {
        if (!analysisResult.foundResources) return [];

        return analysisResult.foundResources.map((resource) => {
            const resourceIcon = this.resourceIcons[resource.resource];
            const workerIcon = this.workerIcons[resource.resource];

            if (resource.numericValues?.status === "complete") {
                const stockpile = resource.numericValues.stockpile.value;
                const workers = resource.numericValues.workers.value;
                return `${resourceIcon} ${stockpile} ${workerIcon} ${workers}`;
            } else {
                const status = resource.numericValues?.status || "unknown";
                return `${resourceIcon} ? ${workerIcon} ? (${status})`;
            }
        });
    }
}

module.exports = ImageAnalyzer;
