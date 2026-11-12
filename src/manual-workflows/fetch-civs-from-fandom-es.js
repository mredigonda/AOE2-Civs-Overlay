// Builds ui/data/es-fandom.json from the Spanish Fandom wiki, one page per civ
// (https://ageofempires.fandom.com/es/wiki/Sajones …). Like the English page it
// often gives exact numbers the game's own text leaves out.
//
// Each civ's page is found by its Spanish name in the game (game-es.json and
// game-mx.json, so run fetch-civs-from-game.js first).
//
// Usage: node fetch-civs-from-fandom-es.js

const fs = require("fs");
const path = require("path");
const { htmlToText, fetchJson, writeData, DATA_DIR } = require("./lib");

const API = "https://ageofempires.fandom.com/es/api.php";

// Section headings vary a little between pages ("Bonificaciones de la civilización").
const SECTIONS = [
    [/^Unidad(es)? únicas?$/i, "uniqueUnits"],
    [/^Tecnologías? únicas?$/i, "uniqueTechnologies"],
    [/^Edificios? únicos?$/i, "uniqueBuildings"],
    [/^Bonificaci(ón|ones) de (la )?civilización$/i, "civilizationBonuses"],
    [/^Bonificaci(ón|ones) (de|del|para el) equipo$/i, "teamBonus"],
];
const sectionFor = (title) => (SECTIONS.find(([re]) => re.test(title)) || [])[1];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function existingTitle(candidates) {
    const q = new URLSearchParams({
        action: "query",
        titles: candidates.join("|"),
        redirects: "1",
        format: "json",
        formatversion: "2",
    });
    const r = await fetchJson(`${API}?${q}`);
    const redirects = Object.fromEntries((r.query.redirects || []).map((x) => [x.from, x.to]));
    const pages = new Set(r.query.pages.filter((p) => !p.missing).map((p) => p.title));
    for (const c of candidates) {
        const t = redirects[c] || c;
        if (pages.has(t)) return t;
    }
    return null;
}

async function pageLines(title) {
    const q = new URLSearchParams({
        action: "parse",
        page: title,
        prop: "text",
        redirects: "1",
        format: "json",
        formatversion: "2",
    });
    const r = await fetchJson(`${API}?${q}`);
    return htmlToText(r.parse.text).filter(Boolean);
}

// "Tropas del Hogar → Tropas del Hogar de Élite: Infantería…" → { name, description }
function namedLine(line) {
    const idx = line.indexOf(":");
    if (idx === -1) return null;
    const name = line.slice(0, idx).split("→")[0].trim();
    return { name, description: line.slice(idx + 1).trim() };
}

function cleanLine(line) {
    return line
        .replace(/\[\]$/, "")
        .replace(/\s*\*\s*/g, (m) => (m.trim() === m ? "" : " "))
        .replace(/ +/g, " ")
        .replace(/ ([.,;])/g, "$1")
        .trim();
}

function parsePage(lines) {
    const focusAt = lines.indexOf("Enfoque");
    const focus = focusAt === -1 ? "" : lines[focusAt + 1];
    // The section list after the table of contents: "Características[]" … "Más características[]"
    const start = lines.indexOf("Características[]");
    if (start === -1) throw new Error('no "Características" section');
    const civ = { focus, civilizationBonuses: [], uniqueUnits: [], uniqueTechnologies: [] };
    let section = null;
    let other = null;
    for (const raw of lines.slice(start + 1)) {
        if (raw.endsWith("[]")) {
            const title = raw.slice(0, -2).trim();
            if (sectionFor(title)) {
                section = sectionFor(title);
                other = null;
            } else if (/^Tecnologías de/.test(title)) {
                section = "otherTechnologies";
                other = { group: title, items: [] };
                (civ.otherTechnologies ||= []).push(other);
            } else break; // "Más características", "Descripción general"…
            continue;
        }
        const line = cleanLine(raw);
        if (!line || !section) continue;
        if (section === "civilizationBonuses") civ.civilizationBonuses.push(line);
        else if (section === "teamBonus") civ.teamBonus = civ.teamBonus ? `${civ.teamBonus} ${line}` : line;
        else if (section === "otherTechnologies") {
            if (/^Nota:/.test(line)) other.note = line.replace(/^Nota:\s*/, "");
            else if (namedLine(line)) other.items.push(namedLine(line));
        } else {
            const item = namedLine(line);
            if (item) (civ[section] ||= []).push(item);
        }
    }
    for (const field of ["civilizationBonuses", "uniqueUnits", "uniqueTechnologies"])
        if (!civ[field].length) throw new Error(`no ${field}`);
    if (!civ.teamBonus) throw new Error("no team bonus");
    return civ;
}

async function main() {
    const read = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")).civs;
    const es = read("game-es.json");
    const mx = Object.fromEntries(read("game-mx.json").map((c) => [c.code, c]));

    const civs = [];
    for (const g of es) {
        const names = [...new Set([g.name, mx[g.code].name])];
        // "Aztecas" is a disambiguation page; "Aztecas (Age of Empires II)" is the civ
        const candidates = [...names.map((n) => `${n} (Age of Empires II)`), ...names];
        const title = await existingTitle(candidates);
        if (!title) throw new Error(`${g.nameEn}: no page among ${candidates.join(", ")}`);
        let parsed;
        try {
            parsed = parsePage(await pageLines(title));
        } catch (e) {
            throw new Error(`${g.nameEn} (${title}): ${e.message}`);
        }
        civs.push({
            code: g.code,
            name: title.replace(/ \(Age of Empires II\)$/, ""),
            nameEn: g.nameEn,
            ...parsed,
        });
        await sleep(200);
    }
    const out = writeData("es-fandom.json", { source: "ageofempires.fandom.com/es", civs });
    console.log(`es-fandom: ${civs.length} civs → ${out}`);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
