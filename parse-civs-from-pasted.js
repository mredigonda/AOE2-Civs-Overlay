const fs = require("fs");

// Civilization code mapping
const civCodes = {
    Armenians: "ARM",
    Aztecs: "AZT",
    Bengalis: "BENG",
    Berbers: "BER",
    Bohemians: "BOH",
    Britons: "BRI",
    Bulgarians: "BUL",
    Burgundians: "BURGU",
    Burmese: "BUR",
    Byzantines: "BYZ",
    Celts: "CEL",
    Chinese: "CHI",
    Cumans: "CUM",
    Dravidians: "DRAV",
    Ethiopians: "ETH",
    Franks: "FRK",
    Georgians: "GEO",
    Goths: "GOT",
    Gurjaras: "GURJ",
    Hindustanis: "HIN",
    Huns: "HUN",
    Inca: "INC",
    Italians: "ITA",
    Japanese: "JAP",
    Jurchens: "JUR",
    Khitans: "KHI",
    Khmer: "KHM",
    Koreans: "KOR",
    Lithuanians: "LIT",
    Magyars: "MAG",
    Malay: "MALY",
    Malians: "MAL",
    Maya: "MAY",
    Mongols: "MON",
    Persians: "PER",
    Poles: "POL",
    Portuguese: "POR",
    Romans: "ROM",
    Saracens: "SAR",
    Shu: "SHU",
    Sicilians: "SIC",
    Slavs: "SLV",
    Spanish: "SPN",
    Tatars: "TAT",
    Teutons: "TEU",
    Turks: "TUR",
    Vietnamese: "VIE",
    Vikings: "VIK",
    Wei: "WEI",
    Wu: "WU",
};

function parseCivilizations(text) {
    const lines = text.split("\n");
    const civilizations = [];
    let currentCiv = null;
    let currentSection = null;
    let uniqueUnits = [];
    let uniqueTechnologies = [];
    let civilizationBonuses = [];
    let uniqueBuildings = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) {
            continue;
        }

        // Check if this is a civilization name (not in any section)
        if (civCodes[line] && !currentSection && !currentCiv) {
            // Start new civilization
            currentCiv = {
                code: civCodes[line],
                name: line,
            };
            uniqueUnits = [];
            uniqueTechnologies = [];
            civilizationBonuses = [];
            uniqueBuildings = [];
            currentSection = null;
            continue;
        } else if (civCodes[line] && currentCiv) {
            // We found a new civilization while still parsing the previous one
            // Save the current civilization first
            currentCiv.uniqueUnits = uniqueUnits;
            currentCiv.uniqueTechnologies = uniqueTechnologies;
            currentCiv.civilizationBonuses = civilizationBonuses;
            if (uniqueBuildings.length > 0) {
                currentCiv.uniqueBuildings = uniqueBuildings;
            }
            civilizations.push(currentCiv);

            // Start new civilization
            currentCiv = {
                code: civCodes[line],
                name: line,
            };
            uniqueUnits = [];
            uniqueTechnologies = [];
            civilizationBonuses = [];
            uniqueBuildings = [];
            currentSection = null;
            continue;
        }

        // Check for section headers
        if (line.startsWith("Focus:")) {
            if (!currentCiv) {
                throw new Error(
                    `Found Focus: section but no civilization is currently being parsed at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            // Extract focus content from the same line
            currentCiv.focus = line.substring(6).trim(); // Remove "Focus:" prefix
            continue;
        }
        if (line === "Unique units") {
            if (!currentCiv) {
                throw new Error(
                    `Found Unique units section but no civilization is currently being parsed at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            currentSection = "uniqueUnits";
            continue;
        }
        if (line === "Unique unit") {
            if (!currentCiv) {
                throw new Error(
                    `Found Unique unit section but no civilization is currently being parsed at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            currentSection = "uniqueUnits";
            continue;
        }
        if (line === "Unique building") {
            if (!currentCiv) {
                throw new Error(
                    `Found Unique building section but no civilization is currently being parsed at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            currentSection = "uniqueBuildings";
            continue;
        }
        if (line === "Unique technologies") {
            if (!currentCiv) {
                throw new Error(
                    `Found Unique technologies section but no civilization is currently being parsed at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            currentSection = "uniqueTechnologies";
            continue;
        }
        if (line === "Civilization bonuses") {
            if (!currentCiv) {
                throw new Error(
                    `Found Civilization bonuses section but no civilization is currently being parsed at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            currentSection = "civilizationBonuses";
            continue;
        }
        if (line === "Team bonus") {
            if (!currentCiv) {
                throw new Error(
                    `Found Team bonus section but no civilization is currently being parsed at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            currentSection = "teamBonus";
            continue;
        }

        // Parse content based on current section
        if (currentSection === "uniqueUnits" && line.includes(":")) {
            const parts = line.split(":");
            if (parts.length !== 2) {
                throw new Error(
                    `Invalid unique unit format at line ${
                        i + 1
                    }: "${line}" - expected "Name: Description"`
                );
            }
            const [name, description] = parts.map((s) => s.trim());
            if (!name || !description) {
                throw new Error(
                    `Empty name or description for unique unit at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            uniqueUnits.push({ name, description });
        } else if (currentSection === "uniqueBuildings" && line.includes(":")) {
            const parts = line.split(":");
            if (parts.length !== 2) {
                throw new Error(
                    `Invalid unique building format at line ${
                        i + 1
                    }: "${line}" - expected "Name: Description"`
                );
            }
            const [name, description] = parts.map((s) => s.trim());
            if (!name || !description) {
                throw new Error(
                    `Empty name or description for unique building at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            uniqueBuildings.push({ name, description });
        } else if (currentSection === "uniqueTechnologies" && line) {
            // Handle both "Name: Description" and "Name (Description)" formats
            let name, description;

            if (line.includes(":")) {
                const parts = line.split(":");
                if (parts.length !== 2) {
                    throw new Error(
                        `Invalid unique technology format at line ${
                            i + 1
                        }: "${line}" - expected "Name: Description"`
                    );
                }
                [name, description] = parts.map((s) => s.trim());
            } else if (line.includes("(") && line.includes(")")) {
                const openParen = line.indexOf("(");
                const closeParen = line.lastIndexOf(")");
                if (
                    openParen === -1 ||
                    closeParen === -1 ||
                    closeParen <= openParen
                ) {
                    throw new Error(
                        `Invalid unique technology format at line ${
                            i + 1
                        }: "${line}" - expected "Name (Description)"`
                    );
                }
                name = line.substring(0, openParen).trim();
                description = line.substring(openParen + 1, closeParen).trim();
            } else {
                // If no special format, treat the whole line as description with a generic name
                name = "Unique Technology";
                description = line;
            }

            if (!name || !description) {
                throw new Error(
                    `Empty name or description for unique technology at line ${
                        i + 1
                    }: "${line}"`
                );
            }
            uniqueTechnologies.push({ name, description });
        } else if (currentSection === "civilizationBonuses" && line) {
            // Remove note references but keep the bonus content
            const cleanLine = line.replace(/\[note \d+\]/g, "").trim();
            if (cleanLine) {
                civilizationBonuses.push(cleanLine);
            }
        } else if (currentSection === "teamBonus" && currentCiv) {
            currentCiv.teamBonus = line;
            currentSection = null;
        } else if (currentSection && line) {
            // If we're in a section but the line doesn't match expected format, throw error
            throw new Error(
                `Unexpected line format in ${currentSection} section at line ${
                    i + 1
                }: "${line}"`
            );
        }
    }

    // Add the last civilization
    if (currentCiv) {
        currentCiv.uniqueUnits = uniqueUnits;
        currentCiv.uniqueTechnologies = uniqueTechnologies;
        currentCiv.civilizationBonuses = civilizationBonuses;
        if (uniqueBuildings.length > 0) {
            currentCiv.uniqueBuildings = uniqueBuildings;
        }
        civilizations.push(currentCiv);
    }

    // Validate that all civilizations have required fields
    for (let i = 0; i < civilizations.length; i++) {
        const civ = civilizations[i];
        if (!civ.focus) {
            throw new Error(
                `Civilization ${civ.name} (${civ.code}) is missing focus field`
            );
        }
        if (!civ.teamBonus) {
            throw new Error(
                `Civilization ${civ.name} (${civ.code}) is missing team bonus`
            );
        }
        if (civ.civilizationBonuses.length === 0) {
            throw new Error(
                `Civilization ${civ.name} (${civ.code}) has no civilization bonuses`
            );
        }
    }

    return civilizations;
}

// Read the input file
const inputText = fs.readFileSync("copy-paste-from-fandom.txt", "utf8");
const civilizations = parseCivilizations(inputText);

// Write the output JSON file
fs.writeFileSync("civilizations.json", JSON.stringify(civilizations, null, 2));

console.log(`Successfully parsed ${civilizations.length} civilizations`);
console.log("Output written to civilizations.json");
