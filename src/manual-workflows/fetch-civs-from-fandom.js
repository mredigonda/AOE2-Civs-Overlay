// Downloads the current "Civilization (Age of Empires II)" page from Fandom and
// writes it as plain text to copy-paste-from-fandom.txt, in the same shape a
// manual copy-paste of the page gives (one civ after another: name, Focus,
// Unique units, Unique technologies, Civilization bonuses, Team bonus).
//
// Usage: node fetch-civs-from-fandom.js && node parse-civs-from-pasted.js

const fs = require("fs");
const path = require("path");

const PAGE = "Civilization_(Age_of_Empires_II)";
const API = `https://ageofempires.fandom.com/api.php?action=parse&page=${encodeURIComponent(
    PAGE
)}&prop=text|revid&format=json&formatversion=2`;

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

// Keeps only the civilization sections and drops what a reader skips over:
// the "[]" edit markers after headings, footnote asterisks, castle captions
// and theme-music links.
function normalize(lines) {
    const first = lines.findIndex(
        (l, i) => l.endsWith("[]") && nextNonEmpty(lines, i).startsWith("The ")
    );
    const end = lines.findIndex((l, i) => i > first && l === "Gallery[]");
    if (first === -1 || end === -1) {
        throw new Error(
            "Could not find the civilization sections; the page layout changed."
        );
    }
    const out = [];
    for (const raw of lines.slice(first, end)) {
        // "*" marks a footnote on the page ("Dromons*"); the footnote itself is dropped
        const line = raw
            .replace(/\[\]$/, "")
            .replace(/\s*\*\s*/g, (m) => (m.trim() === m ? "" : " "))
            .replace(/ +/g, " ")
            .replace(/ ([.,;])/g, "$1")
            .trim();
        if (/^The .+ Castle$/.test(line)) continue;
        if (/^https?:\/\//.test(line)) continue;
        if (!line && (out.length === 0 || out[out.length - 1] === "")) continue;
        out.push(line);
    }
    return out.join("\n").trim() + "\n";
}

function nextNonEmpty(lines, i) {
    for (let j = i + 1; j < lines.length; j++) if (lines[j]) return lines[j];
    return "";
}

async function main() {
    const res = await fetch(API, { headers: { "User-Agent": "aoe2-civs-overlay" } });
    if (!res.ok) throw new Error(`Fandom answered ${res.status}`);
    const json = await res.json();
    const text = normalize(htmlToText(json.parse.text));
    const out = path.join(__dirname, "copy-paste-from-fandom.txt");
    fs.writeFileSync(out, text);
    console.log(`Wrote ${out} (revision ${json.parse.revid ?? "?"})`);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
