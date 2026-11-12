// Turns each civ's tech tree into a short "what does this civ lack" summary,
// line by line, the way it's read in competitive play: "archers: no Arbalester,
// no Bracer; cavalry: no Bloodlines".
//
// Names are the English node names of aoe2techtree's data/trees/<CIV>.json.

// Each line has one or more unit chains, weakest to strongest. A civ is judged
// on the first chain it has any unit of, so regional replacements count: the
// Franks' Mounted Crossbowman is their cavalry archer, the Mapuche's Champi
// Warrior their swordsman.
//   core: true  → when the civ has none of it, say so ("no cavalry").
//   core: false → only shown when the civ has it (camels, elephants…).
//   group: which settings switch shows the line.
//   replacedBy: a unique unit that takes an upgrade's place (the Poles' Winged
//     Hussar instead of the Hussar): the upgrade isn't missing if the civ has it.
//   extras: upgrades past the chain only some civs have (Imperial Camel Rider):
//     shown as the best unit when there, never counted as missing.
const LINES = [
    {
        id: "archers",
        group: "army",
        core: true,
        chains: [["Archer", "Crossbowman", "Arbalester"]],
        techs: ["Fletching", "Bodkin Arrow", "Bracer", "Padded Archer Armor", "Leather Archer Armor", "Ring Archer Armor", "Thumb Ring"],
    },
    {
        id: "skirmishers",
        group: "army",
        core: true,
        chains: [["Skirmisher", "Elite Skirmisher"]],
        extras: ["Imperial Skirmisher"],
        techs: [],
    },
    {
        id: "cavalryArchers",
        group: "army",
        core: true,
        chains: [
            ["Cavalry Archer", "Heavy Cavalry Archer"],
            ["Mounted Crossbowman", "Heavy Mounted Crossbowman"],
        ],
        techs: ["Parthian Tactics"],
    },
    {
        id: "infantry",
        group: "army",
        core: true,
        chains: [
            ["Militia", "Man-at-Arms", "Long Swordsman", "Two-Handed Swordsman", "Champion"],
            ["Champi Scout", "Champi Runner", "Champi Warrior", "Elite Champi Warrior"],
        ],
        replacedBy: { "Two-Handed Swordsman": "Legionary", Champion: "Legionary" },
        techs: ["Forging", "Iron Casting", "Blast Furnace", "Scale Mail Armor", "Chain Mail Armor", "Plate Mail Armor", "Squires", "Gambesons", "Arson"],
    },
    { id: "spearmen", group: "army", core: true, chains: [["Spearman", "Pikeman", "Halberdier"]], techs: [] },
    {
        id: "knights",
        group: "army",
        core: true,
        chains: [["Knight", "Cavalier", "Paladin"]],
        techs: ["Bloodlines", "Husbandry", "Scale Barding Armor", "Chain Barding Armor", "Plate Barding Armor"],
    },
    {
        id: "scouts",
        group: "army",
        core: true,
        chains: [["Scout Cavalry", "Light Cavalry", "Hussar"], ["Camel Scout"]],
        replacedBy: { Hussar: "Winged Hussar" },
        techs: [],
    },
    {
        id: "camels",
        group: "army",
        core: false,
        chains: [["Camel Rider", "Heavy Camel Rider"]],
        extras: ["Imperial Camel Rider"],
        techs: [],
    },
    { id: "elephants", group: "army", core: false, chains: [["Battle Elephant", "Elite Battle Elephant"]], techs: [] },
    { id: "elephantArchers", group: "army", core: false, chains: [["Elephant Archer", "Elite Elephant Archer"]], techs: [] },
    { id: "steppeLancers", group: "army", core: false, chains: [["Steppe Lancer", "Elite Steppe Lancer"]], techs: [] },
    { id: "heiGuang", group: "army", core: false, chains: [["Hei Guang Cavalry", "Heavy Hei Guang Cavalry"]], techs: [] },
    { id: "eagles", group: "army", core: false, chains: [["Eagle Scout", "Eagle Warrior", "Elite Eagle Warrior"]], techs: [] },
    { id: "varangianGuard", group: "army", core: false, chains: [["Varangian Guard", "Elite Varangian Guard"]], techs: [] },
    { id: "fireLancers", group: "army", core: false, chains: [["Fire Lancer", "Elite Fire Lancer"]], techs: [] },
    { id: "slingers", group: "army", core: false, chains: [["Slinger"]], techs: [] },
    { id: "handCannoneers", group: "army", core: true, chains: [["Hand Cannoneer"]], techs: [] },
    {
        id: "rams",
        group: "army",
        core: true,
        chains: [
            ["Battering Ram", "Capped Ram", "Siege Ram"],
            ["Armored Elephant", "Siege Elephant"],
        ],
        techs: ["Siege Engineers"],
    },
    {
        id: "mangonels",
        group: "army",
        core: true,
        chains: [
            ["Mangonel", "Onager", "Siege Onager"],
            ["Rocket Cart", "Heavy Rocket Cart"],
        ],
        techs: [],
    },
    { id: "scorpions", group: "army", core: true, chains: [["Scorpion", "Heavy Scorpion"]], techs: [] },
    { id: "bombardCannons", group: "army", core: true, chains: [["Bombard Cannon"]], techs: [] },
    {
        id: "monks",
        group: "army",
        core: true,
        chains: [["Monk"]],
        techs: ["Redemption", "Atonement", "Herbal Medicine", "Sanctity", "Fervor", "Theocracy", "Illumination", "Block Printing", "Faith", "Heresy"],
    },
    {
        id: "economy",
        group: "economy",
        core: true,
        chains: [],
        techs: ["Wheelbarrow", "Hand Cart", "Double-Bit Axe", "Bow Saw", "Two-Man Saw", "Horse Collar", "Heavy Plow", "Crop Rotation", "Gold Mining", "Gold Shaft Mining", "Stone Mining", "Stone Shaft Mining", "Caravan", "Guilds"],
    },
    {
        id: "defense",
        group: "defense",
        core: true,
        chains: [],
        techs: ["Masonry", "Architecture", "Keep", "Bombard Tower", "Arrowslits", "Heated Shot", "Murder Holes", "Hoardings", "Fortified Wall"],
    },
    { id: "galleys", group: "navy", core: true, chains: [["Galley", "War Galley", "Galleon"]], techs: ["Careening", "Dry Dock", "Shipwright"] },
    { id: "fireShips", group: "navy", core: true, chains: [["Fire Galley", "Fire Ship", "Fast Fire Ship"]], techs: [] },
    { id: "demolitionShips", group: "navy", core: true, chains: [["Demolition Raft", "Demolition Ship", "Heavy Demolition Ship"]], techs: [] },
    { id: "cannonGalleons", group: "navy", core: true, chains: [["Cannon Galleon", "Elite Cannon Galleon"]], techs: [] },
    {
        id: "regionalShips",
        group: "navy",
        core: false,
        chains: [["Longship", "Elite Longship"], ["Dromon"], ["Lou Chuan"], ["Catapult Galleon"]],
        techs: [],
    },
];

// A tree lists some nodes twice (the Mapuche's Skirmisher at the Barracks and
// at the Settlement); a node counts as available if any copy is.
function nodeIndex(tree) {
    const nodes = new Map();
    for (const n of tree.units_techs) {
        const prev = nodes.get(n.name);
        const available = n.node_status !== "NotAvailable";
        if (!prev || (available && !prev.available))
            nodes.set(n.name, {
                available,
                icon: `${n.use_type}/${n.picture_index}`,
                nameStringId: n.name_string_id,
                // Where data.json keeps its stats: data.Unit[id] or data.Tech[id]
                kind: n.use_type,
                id: n.node_id,
            });
    }
    return nodes;
}

// → { lines: { [lineId]: { best?, missing: [names] } }, unique: [{ best, missing }], nodes: Map }
function summarize(tree) {
    const nodes = nodeIndex(tree);
    const has = (name) => nodes.get(name)?.available === true;
    const lines = {};
    for (const line of LINES) {
        const chain = line.chains.find((c) => c.some(has));
        if (line.chains.length && !chain) {
            if (line.core) lines[line.id] = { none: line.chains[0][0], missing: [] };
            continue;
        }
        const units = chain || [];
        const replacement = (u) => line.replacedBy?.[u];
        const covered = (u) => has(u) || (replacement(u) && has(replacement(u)));
        let best = (line.extras || []).find(has);
        for (const u of [...units].reverse()) {
            if (best) break;
            if (has(u)) best = u;
            else if (replacement(u) && has(replacement(u))) best = replacement(u);
        }
        const missing = [...units.filter((u) => !covered(u)), ...line.techs.filter((t) => !has(t))];
        lines[line.id] = best ? { best, missing } : { missing };
    }

    // The civ's unique units (Throwing Axeman, Warrior Priest…), each with its
    // Elite upgrade; unique units that stand in for a line's upgrade (Winged
    // Hussar, Legionary) are already shown in that line.
    const inLines = allNames();
    const unique = [];
    for (const n of tree.units_techs) {
        if (n.node_type !== "UniqueUnit" || n.name.startsWith("Elite ") || inLines.has(n.name)) continue;
        if (unique.some((u) => u.base === n.name)) continue; // listed twice (Sicilians' Serjeant)
        const elite = `Elite ${n.name}`;
        const hasElite = nodes.has(elite);
        unique.push({
            base: n.name,
            best: hasElite && has(elite) ? elite : n.name,
            missing: hasElite && !has(elite) ? [elite] : [],
        });
    }
    return { lines, unique: unique.map(({ best, missing }) => ({ best, missing })), nodes };
}

// Every node name the lines mention, to check it against the trees.
const allNames = () =>
    new Set(
        LINES.flatMap((l) => [
            ...l.chains.flat(),
            ...l.techs,
            ...(l.extras || []),
            ...Object.values(l.replacedBy || {}),
        ])
    );

module.exports = { LINES, summarize, allNames };
