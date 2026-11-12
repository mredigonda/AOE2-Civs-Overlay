// Builds ui/data/game-<lang>.json for every language the game ships, from the
// game's own strings: the text it shows when you pick a civ (focus, bonuses,
// unique units and techs, team bonus) plus each unique unit's own help text.
// Names are the official ones of each language ("Lancero", "Hostigador").
//
// Source: https://github.com/SiegeEngineers/aoe2techtree (MIT), which extracts
// data.json and data/locales/<lang>/strings.json from the game files.
//
// Also writes ui/data/tree.json (what each civ lacks, line by line, from the
// tech trees) and the icons it needs in ui/img/tree/.
//
// Usage: node fetch-civs-from-game.js

const fs = require("fs");
const path = require("path");
const { civCodes, gameNameAliases, fetchJson, writeData, DATA_DIR } = require("./lib");
const { LINES, summarize, allNames } = require("./tech-tree");

const ICON_DIR = path.join(DATA_DIR, "..", "img", "tree");

const REPO = "SiegeEngineers/aoe2techtree";
const LANGS = ["br", "de", "en", "es", "fr", "hi", "it", "jp", "ko", "ms", "mx", "pl", "ru", "tr", "tw", "vi", "zh"];

// A unit's LanguageNameId is its short name; the name shown in-game is that id
// + 9000 and its help text that id + 21000 (5539 → 14539 "Jomsviking", 26539).
const NAME_OFFSET = 9000;
const HELP_OFFSET = 21000;

const stripTags = (s) =>
    s
        .replace(/<br>\s*/g, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/[ \t]+/g, " ")
        .trim();

// Long unit names come split in two lines ("Winged<br>Hussar").
const key = (name) => name.replace(/<br>\s*/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

// "Heading:" / "• Heading:" → "Heading"
const heading = (line) => line.replace(/^•\s*/, "").replace(/[:：]+\s*$/, "").trim();

// "Liao Dao (Infantry), Mounted Trebuchet (Siege Cavalry)" → two entries; commas
// inside parentheses don't split.
function splitTopLevel(text) {
    const parts = [];
    let depth = 0;
    let current = "";
    for (const ch of text) {
        if (ch === "(" || ch === "（") depth++;
        if (ch === ")" || ch === "）") depth--;
        if ((ch === "," || ch === "、" || ch === "，" || ch === "\n") && depth === 0) {
            if (current.trim()) parts.push(current.trim());
            current = "";
        } else current += ch;
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

// "Obuch (Infantry), Winged Hussar (Cavalry)" and, in some languages,
// "Martillos de guerra (infantería) y húsares alados (caballería)": every
// "name (type)" is a unit, whatever joins them.
const JOINERS = /^[\s,、，;]*(?:(?:y|e|and|et|und|i|ve|và|dan|oraz|и|та)\s+)?/i;
function splitUnits(text) {
    const withParens = [...text.matchAll(/([^()（）]*?)\s*[(（]([^)）]*)[)）]/g)];
    if (!withParens.length) return splitTopLevel(text);
    return withParens.map((m) => `${m[1].replace(JOINERS, "").trim()} (${m[2].trim()})`);
}

// "Name (description)" → { name, description }
function nameAndParens(text) {
    const m = text.match(/^(.*?)\s*[(（]([\s\S]*)[)）]\s*$/);
    return m ? { name: m[1].trim(), description: m[2].trim() } : { name: text.trim(), description: "" };
}

function unitHelp(strings, nameId) {
    const help = strings[String(nameId + HELP_OFFSET)];
    if (!help) return "";
    // "Create <b>X</b> (‹cost›)<br>Description…<br><i>Upgrades: …</i>"
    const lines = help.replace(/<i>[\s\S]*?<\/i>/g, "").split(/<br>\s*/);
    return stripTags(lines.slice(1).join(" ")).replace(/\s*‹[^›]*›\s*/g, " ").trim();
}

// unitIds: the unit name ids of this civ's unique units, in the order the
// English text lists them (every language lists them in the same order). When
// given, each unit's name and help come from the unit's own strings; the civ
// text sometimes uses another form ("Jomsvikingos" for "Jomsviking").
function parseCiv(text, strings, unitNameIds, unitIds) {
    const blocks = text.split(/<br>\s*<br>\s*/);
    if (blocks.length !== 5) throw new Error(`expected 5 blocks, got ${blocks.length}`);
    const [focusBlock, bonusBlock, unitBlock, techBlock, teamBlock] = blocks.map((b) =>
        stripTags(b).split("\n").map((l) => l.trim()).filter(Boolean)
    );
    const civilizationBonuses = bonusBlock.map((l) => l.replace(/^•\s*/, ""));
    const entries = splitUnits(unitBlock.slice(1).join("\n"));
    const ids = [];
    const uniqueUnits = entries.map((entry, i) => {
        const { name, description: type } = nameAndParens(entry.replace(/^•\s*/, ""));
        const id =
            unitIds && unitIds.length === entries.length ? unitIds[i] : unitNameIds.get(key(name));
        ids.push(id);
        const official = id === undefined ? "" : strings[String(id + NAME_OFFSET)] || "";
        const help = id === undefined ? "" : unitHelp(strings, id);
        return {
            name: official ? official.replace(/<br>\s*/g, " ").trim() : name,
            description: help || type,
        };
    });
    const uniqueTechnologies = techBlock.slice(1).map((l) => nameAndParens(l.replace(/^•\s*/, "")));
    return {
        focus: focusBlock.join(" "),
        civilizationBonuses,
        uniqueUnits,
        uniqueTechnologies,
        teamBonus: teamBlock.slice(1).join(" "),
        headings: [unitBlock[0], techBlock[0], teamBlock[0]].map(heading),
        unitIds: ids,
    };
}

// A tree node's entry in data.json (its cost, stats and string ids)
function gameEntry(data, node) {
    return node.kind === "Unit" ? data.data.Unit[node.id] : node.kind === "Tech" ? data.data.Tech[node.id] : undefined;
}

// Base stats, before any civ bonus or upgrade: the numbers the game's own tech
// tree shows. Techs only have cost and time.
function stats(entry) {
    if (!entry) return null;
    const cost = Object.fromEntries(Object.entries(entry.Cost || {}).filter(([, v]) => v > 0));
    if (entry.HP === undefined) return { cost, time: entry.ResearchTime };
    return {
        cost,
        time: entry.TrainTime,
        hp: entry.HP,
        attack: entry.Attack,
        melee: entry.MeleeArmor,
        pierce: entry.PierceArmor,
        range: entry.Range,
        speed: entry.Speed,
        reload: entry.ReloadTime,
    };
}

function mostCommon(values) {
    const counts = new Map();
    for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

async function main() {
    const commit = (await fetchJson(`https://api.github.com/repos/${REPO}/commits/master`)).sha;
    const raw = (file) => fetchJson(`https://raw.githubusercontent.com/${REPO}/${commit}/data/${file}`);
    const data = await raw("data.json");
    const en = await raw("locales/en/strings.json");

    // Tech trees: what each civ lacks, line by line (see tech-tree.js)
    const treeCivs = {};
    const nodeInfo = new Map(); // English node name → { icon, nameStringId }
    for (const internal of Object.keys(data.civs)) {
        const tree = await raw(`trees/${internal.toUpperCase()}.json`);
        const { lines, unique, nodes } = summarize(tree);
        treeCivs[civCodes[gameNameAliases[internal] || internal]] = { lines, unique };
        for (const [name, info] of nodes) if (!nodeInfo.has(name)) nodeInfo.set(name, info);
    }
    const unknown = [...allNames()].filter((n) => !nodeInfo.has(n));
    if (unknown.length) throw new Error(`tech-tree.js names not in any tree: ${unknown.join(", ")}`);
    const used = [
        ...new Set([
            ...allNames(),
            ...Object.values(treeCivs).flatMap((c) => c.unique.flatMap((u) => [u.best, ...u.missing])),
        ]),
    ];

    const unitIdsByCiv = {};
    // English first: it fixes which unit each entry is, for every other language.
    for (const lang of ["en", ...LANGS.filter((l) => l !== "en")]) {
        const strings = lang === "en" ? en : await raw(`locales/${lang}/strings.json`);
        const unitNameIds = new Map();
        for (const unit of Object.values(data.data.Unit)) {
            for (const id of [unit.LanguageNameId + NAME_OFFSET, unit.LanguageNameId]) {
                const name = strings[String(id)];
                if (name && !unitNameIds.has(key(name))) unitNameIds.set(key(name), unit.LanguageNameId);
            }
        }

        const civs = [];
        const headings = [];
        let unitsWithoutHelp = 0;
        for (const [internal, civ] of Object.entries(data.civs)) {
            const nameEn = gameNameAliases[internal] || internal;
            const code = civCodes[nameEn];
            if (!code) throw new Error(`No code for ${internal}: add it to civCodes in lib.js`);
            const text = strings[String(civ.help_string_id)];
            if (!text) throw new Error(`${lang}: no help text for ${internal}`);
            let parsed;
            try {
                parsed = parseCiv(text, strings, unitNameIds, unitIdsByCiv[internal]);
            } catch (e) {
                throw new Error(`${lang} ${internal}: ${e.message}`);
            }
            headings.push(parsed.headings);
            if (lang === "en") unitIdsByCiv[internal] = parsed.unitIds;
            unitsWithoutHelp += parsed.unitIds.filter((id) => id === undefined).length;
            delete parsed.headings;
            delete parsed.unitIds;
            civs.push({ code, name: strings[String(civ.name_string_id)].trim(), nameEn, ...parsed });
        }

        const labels = {
            // The plural heading, from the civs that have several unique units
            uniqueUnits: mostCommon(
                headings.filter((h, i) => civs[i].uniqueUnits.length > 1).map((h) => h[0])
            ),
            uniqueTechnologies: mostCommon(headings.map((h) => h[1])),
            teamBonus: mostCommon(headings.map((h) => h[2])),
        };
        const treeNames = Object.fromEntries(
            used.map((n) => [n, (strings[String(nodeInfo.get(n).nameStringId)] || n).replace(/<br>\s*/g, " ").trim()])
        );
        // The game's help text for each tree icon ("Strong vs. …" for units,
        // the effect for techs), for the tooltip
        const treeHelp = Object.fromEntries(
            used.flatMap((n) => {
                const entry = gameEntry(data, nodeInfo.get(n));
                const help = entry ? unitHelp(strings, entry.LanguageNameId) : "";
                return help ? [[n, help]] : [];
            })
        );
        const out = writeData(`game-${lang}.json`, {
            source: `${REPO}@${commit.slice(0, 7)}`,
            labels,
            treeNames,
            treeHelp,
            civs,
        });
        const note = unitsWithoutHelp ? ` (${unitsWithoutHelp} unique units without a help text)` : "";
        console.log(`${lang}: ${civs.length} civs → ${out}${note}`);
    }

    const icons = Object.fromEntries(used.map((n) => [n, `img/tree/${nodeInfo.get(n).icon.replace("/", "-")}.png`]));
    writeData("tree.json", {
        source: `${REPO}@${commit.slice(0, 7)}`,
        lines: LINES.map(({ id, group, core }) => ({ id, group, core })),
        icons,
        stats: Object.fromEntries(used.flatMap((n) => {
            const st = stats(gameEntry(data, nodeInfo.get(n)));
            return st ? [[n, st]] : [];
        })),
        civs: treeCivs,
    });
    fs.mkdirSync(ICON_DIR, { recursive: true });
    for (const n of used) {
        const icon = nodeInfo.get(n).icon;
        const file = path.join(ICON_DIR, `${icon.replace("/", "-")}.png`);
        if (fs.existsSync(file)) continue;
        const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${commit}/img/${icon}.png`);
        if (!res.ok) throw new Error(`icon ${icon} (${n}): ${res.status}`);
        fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    console.log(`tree: ${Object.keys(treeCivs).length} civs, ${used.length} icons in ${ICON_DIR}`);
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
