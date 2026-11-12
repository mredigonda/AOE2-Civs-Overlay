// Shared by the scripts that build ui/data/*.json.

const fs = require("fs");
const path = require("path");

// One code per civilization, the same in every language file. Keyed by the
// English name the English Fandom page uses.
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
    Danes: "DAN",
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
    Mapuche: "MAPU",
    Maya: "MAY",
    Mongols: "MON",
    Muisca: "MUI",
    Persians: "PER",
    Poles: "POL",
    Portuguese: "POR",
    Romans: "ROM",
    Saracens: "SAR",
    Saxons: "SAX",
    Shu: "SHU",
    Sicilians: "SIC",
    Slavs: "SLV",
    Spanish: "SPN",
    Tatars: "TAT",
    Teutons: "TEU",
    Tupi: "TUP",
    Turks: "TUR",
    Varangians: "VAR",
    Vietnamese: "VIE",
    Vikings: "VIK",
    Wei: "WEI",
    Wu: "WU",
};

// The game's internal names (aoe2techtree's data.json) that differ from the above.
const gameNameAliases = { Incas: "Inca", Mayans: "Maya" };

const BLOCK_TAGS =
    "p|div|li|dt|dd|h1|h2|h3|h4|h5|h6|br|tr|table|ul|ol|dl|figure|figcaption";

function htmlToText(html) {
    const text = html
        .replace(/<(style|script|sup)\b[\s\S]*?<\/\1>/gi, "")
        .replace(new RegExp(`<\\/?(?:${BLOCK_TAGS})\\b[^>]*>`, "gi"), "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
    return text.split("\n").map((l) => l.replace(/[ \t ]+/g, " ").trim());
}

async function fetchJson(url) {
    const res = await fetch(url, { headers: { "User-Agent": "aoe2-civs-overlay" } });
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    return res.json();
}

const DATA_DIR = path.join(__dirname, "..", "..", "ui", "data");

function writeData(file, civs) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const out = path.join(DATA_DIR, file);
    fs.writeFileSync(out, JSON.stringify(civs, null, 2) + "\n");
    return out;
}

module.exports = { civCodes, gameNameAliases, htmlToText, fetchJson, writeData, DATA_DIR };
