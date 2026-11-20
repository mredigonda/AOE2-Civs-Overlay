// Builds ui/data/build-orders/starter.json: the build orders the overlay comes with.
//
// They are Hera's AoE2 build orders that RTS Overlay shipped up to version 1.9.2
// (https://github.com/CraftySalamander/RTS_Overlay, GPL-3.0, July 2024; sources: the Hera
// Discord and Hera's videos, kept in each build's "source"). Newer RTS Overlay versions
// stopped bundling them and point to buildorderguide.com instead.
//
// On the way it points their .png/.jpg icons to the .webp files in ui/img/bo/ (see
// fetch-bo-icons.js), fixes typos and gives each one a clear name in English and Spanish.
// The Spanish notes are in ui/data/build-orders/es.json, keyed by the English note:
// a note this script changes needs its Spanish line updated there (test/build-order.test.js
// checks that every note has one).
//
//   GITHUB_TOKEN=$(gh auth token) node src/manual-workflows/fetch-starter-build-orders.js

const fs = require("fs");
const path = require("path");

const REPO = "CraftySalamander/RTS_Overlay";
const REF = "1.9.2";
const OUT = path.join(__dirname, "../../ui/data/build-orders/starter.json");

// file → [English name, Spanish name], in the order they're listed
const NAMES = {
    "straight_archers.json": ["Straight archers", "Arqueros directos"],
    "scouts_into_skirms.json": ["Scouts into skirmishers", "Exploradores y después hostigadores"],
    "scouts_into_knights.json": ["Scouts into knights", "Exploradores y después caballeros"],
    "scouts_into_unique_unit.json": ["Scouts into unique unit", "Exploradores y después unidad única"],
    "all_in_scouts.json": ["All-in scouts", "Exploradores con todo"],
    "man_at_arms_into_archers.json": ["Men-at-arms into archers", "Hombres de armas y después arqueros"],
    "drush_into_archers.json": ["Drush into archers", "Drush y después arqueros"],
    "drush_fc_into_crossbows.json": ["Drush, fast Castle, crossbows", "Drush, Castillos rápida, ballesteros"],
    "pre_mill_drush_fast_castle.json": ["Pre-mill drush, fast Castle", "Drush antes del molino, Castillos rápida"],
    "fast_castle_knights.json": ["Fast Castle knights", "Castillos rápida con caballeros"],
    "hybrid_map.json": ["Hybrid map (land and water)", "Mapa híbrido (tierra y agua)"],
    "nomad_map.json": ["Nomad map", "Mapa Nómada"],
    "empire_wars_archers_crossbow.json": ["Empire Wars: archers, crossbows", "Empire Wars: arqueros, ballesteros"],
    "bohemians_drush_fc_cannoneers.json": ["Drush, fast Castle, hand cannoneers", "Drush, Castillos rápida, artilleros manuales"],
    "britons_20_pop_archers.json": ["20-pop archers", "Arqueros a 20 de población"],
    "burgundians_scouts_cavaliers.json": ["Scouts into cavaliers", "Exploradores y caballeros mejorados en Castillos"],
    "chinese_scouts_into_archers.json": ["Scouts into archers", "Exploradores y después arqueros"],
    "cumans_double_tc_kipchaks.json": ["Double TC in Feudal, Kipchaks", "Doble centro urbano en Feudal, kipchaks"],
    "dravidians_drush_fc_archers.json": ["Drush, fast Castle, archers", "Drush, Castillos rápida, arqueros"],
    "franks_19_pop_scouts.json": ["19-pop scouts", "Exploradores a 19 de población"],
    "gurjaras_no_sheep_archers.json": ["Archers without sheep", "Arqueros sin ovejas"],
    "huns_scouts_into_archers.json": ["Scouts into archers", "Exploradores y después arqueros"],
    "japanese_20_pop_man_at_arms.json": ["20-pop men-at-arms", "Hombres de armas a 20 de población"],
    "magyars_20_pop_scouts_cav_archers.json": ["20-pop scouts into cavalry archers", "Exploradores a 20 de población y después arqueros a caballo"],
    "man_at_arms_into_eagles.json": ["Men-at-arms into eagles", "Hombres de armas y después guerreros águila"],
    "poles_man_at_arms_towers.json": ["Men-at-arms and towers", "Hombres de armas y torres"],
    "saracens_drush_fc_with_market.json": ["Drush, fast Castle with market", "Drush, Castillos rápida con mercado"],
    "turks_fast_imperial_arena.json": ["Fast Imperial (Arena)", "Imperial rápida (Arena)"],
};

// The originals' typos and one wrong icon (an archer where an archery range is meant)
const FIXES = [
    [/fitst/g, "first"],
    [/Prodcude/g, "Produce"],
    [/send thme/g, "send them"],
    [/Reasearch/g, "Research"],
    [/reasearch/g, "research"],
    [/afer starting/g, "after starting"],
    [/and and/g, "and"],
    [/build {2}/g, "build "],
    [/Build a@/g, "Build a @"],
    [/Build a second @archery_range\/Archer_aoe2DE\.png@/g, "Build a second @archery_range/Archery_range_aoe2DE.png@"],
    [/Seed the next 3/g, "Send the next 3"],
];

const fixNote = (note) => {
    for (const [re, to] of FIXES) note = note.replace(re, to);
    return note.replace(/@([^@\s]+)\.(png|jpe?g)@/gi, "@$1.webp@");
};

async function main() {
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    const out = [];
    for (const [file, [en, es]] of Object.entries(NAMES)) {
        const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${REF}/build_orders/aoe2/${file}`, { headers });
        if (!res.ok) throw new Error(`${file}: ${res.status}`);
        const bo = await res.json();
        out.push({
            id: "starter:" + file.replace(/\.json$/, ""),
            name: en,
            name_es: es,
            civilization: bo.civilization,
            author: bo.author,
            source: bo.source,
            build_order: bo.build_order.map((step) => ({ ...step, notes: step.notes.map(fixNote) })),
        });
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
    console.log(`${out.length} build orders in ${path.relative(process.cwd(), OUT)}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
