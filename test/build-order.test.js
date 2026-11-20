const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const BO = require("../ui/build-order.js");

const civs = JSON.parse(fs.readFileSync(path.join(__dirname, "../ui/data/game-en.json"), "utf8")).civs;
const iconsDir = path.join(__dirname, "../ui/img/bo");

// The shape RTS Overlay and buildorderguide.com produce (made-up steps)
const sample = {
    name: "Scouts",
    civilization: "Franks",
    author: "someone",
    source: "test",
    build_order: [
        { villager_count: 6, age: 1, resources: { wood: 0, food: 6, gold: 0, stone: 0 }, notes: ["Build @other/House_aoe2DE.webp@ x2"] },
        { villager_count: 9, age: 1, resources: { wood: 3, food: 6, gold: 0, stone: 0 }, notes: ["@lumber_camp/Lumber_camp_aoe2de.webp@"] },
        { villager_count: 10, age: 1, resources: { wood: 3, food: 6, gold: 0, stone: 0, builder: 1 }, notes: ["Mill on berries"] },
        { villager_count: 21, age: 2, resources: { wood: 10, food: 11, gold: 0, stone: 0 }, notes: ["@town_center/LoomDE.webp@ then Feudal"] },
        { villager_count: 21, age: 2, resources: { wood: 10, food: 11, gold: 0, stone: 0 }, notes: ["Stable"] },
    ],
};

test("reads one build order and estimates times when it has none", () => {
    const { orders, errors } = BO.parse(JSON.stringify(sample));
    assert.deepEqual(errors, []);
    const [bo] = orders;
    assert.equal(bo.name, "Scouts");
    assert.equal(bo.estimated, true);
    const times = bo.build_order.map((s) => s.timeSec);
    // 3 starting villagers, 25 s each: 6 → 75, 9 → 150, 10 → 175, then
    // 11 villagers (275 s) + Feudal (130) + Loom (25) = 605, and the last step +1
    assert.deepEqual(times, [75, 150, 175, 605, 606]);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1]);
});

test("keeps the build order's own times when they are valid", () => {
    const timed = structuredClone(sample);
    timed.build_order.forEach((s, i) => (s.time = `${i}:30`));
    const [bo] = BO.parse(JSON.stringify(timed)).orders;
    assert.equal(bo.estimated, false);
    assert.deepEqual(bo.build_order.map((s) => s.timeSec), [30, 90, 150, 210, 270]);
});

test("falls back to estimates when the given times go backwards", () => {
    const timed = structuredClone(sample);
    timed.build_order.forEach((s, i) => (s.time = i === 2 ? "0:10" : `${i}:30`));
    assert.equal(BO.parse(JSON.stringify(timed)).orders[0].estimated, true);
});

test("reports what is wrong with bad input", () => {
    assert.equal(BO.parse("{nope").errors[0].code, "json");
    assert.equal(BO.parse("{}").errors[0].code, "noSteps");
    assert.equal(BO.parse("3").errors[0].code, "notObject");
    assert.deepEqual(BO.parse('{"build_order":[{}, 2]}').errors[0], { code: "stepNotObject", step: 2, build: undefined });
    const two = BO.parse(JSON.stringify([sample, { name: "x" }]));
    assert.equal(two.orders.length, 1);
    assert.deepEqual(two.errors[0], { code: "noSteps", build: 2 });
});

test("old .png icon names point to the .webp files", () => {
    assert.deepEqual(BO.noteParts("@town_center/LoomDE.png@"), [{ icon: "town_center/LoomDE.webp" }]);
});

// The builds the overlay comes with: all read, all their icons exist, and every
// note has its Spanish line with the same icons
test("starter build orders and their Spanish notes", () => {
    const dir = path.join(__dirname, "../ui/data/build-orders");
    const text = fs.readFileSync(path.join(dir, "starter.json"), "utf8");
    const es = JSON.parse(fs.readFileSync(path.join(dir, "es.json"), "utf8")).notes;
    const { orders, errors } = BO.parse(text);
    assert.deepEqual(errors, []);
    assert.equal(orders.length, 28);
    const icons = (note) => BO.noteParts(note).filter((p) => p.icon).map((p) => p.icon).sort();
    for (const bo of orders) {
        assert.ok(bo.id.startsWith("starter:") && bo.name_es, bo.name);
        if (BO.civNames(bo).length) assert.equal(BO.civCodes(bo, civs).length, BO.civNames(bo).length, bo.name);
        for (const step of bo.build_order)
            for (const note of step.notes) {
                assert.ok(es[note], `no Spanish for: ${note}`);
                assert.deepEqual(icons(es[note]), icons(note), note);
                for (const icon of icons(note)) assert.ok(fs.existsSync(path.join(iconsDir, icon)), icon);
            }
    }
});

test("matches civilizations, with RTS Overlay's names", () => {
    assert.deepEqual(BO.civCodes(sample, civs), ["FRK"]);
    assert.deepEqual(BO.civCodes({ civilization: ["Incas", "Mayans"] }, civs), ["INC", "MAY"]);
    assert.deepEqual(BO.civCodes({ civilization: "Generic" }, civs), []);
    assert.deepEqual(BO.civCodes({}, civs), []);
});

test("Persians and Chinese get their own timing", () => {
    const chinese = { ...structuredClone(sample), civilization: "Chinese" };
    const [bo] = BO.parse(JSON.stringify(chinese)).orders;
    assert.equal(bo.build_order[0].timeSec, 0); // starts with 6 villagers
    const persians = { ...structuredClone(sample), civilization: "Persians" };
    assert.ok(BO.parse(JSON.stringify(persians)).orders[0].build_order[0].timeSec < 75);
});

test("stepAt is the first step not finished yet", () => {
    const [bo] = BO.parse(JSON.stringify(sample)).orders;
    assert.equal(BO.stepAt(bo, 0), 0);
    assert.equal(BO.stepAt(bo, 75), 0);
    assert.equal(BO.stepAt(bo, 76), 1);
    assert.equal(BO.stepAt(bo, 10000), 4);
});

test("delta says where the new villagers go", () => {
    const [bo] = BO.parse(JSON.stringify(sample)).orders;
    assert.deepEqual(BO.delta(bo, 0), { food: 6 });
    assert.deepEqual(BO.delta(bo, 1), { wood: 3 });
    assert.deepEqual(BO.delta(bo, 2), { builder: 1 });
    assert.deepEqual(BO.delta(bo, 3), { wood: 7, food: 5 });
    assert.deepEqual(BO.delta(bo, 4), {});
});

test("splits notes into text and icons, and every sample icon exists", () => {
    const parts = BO.noteParts("Build @other/House_aoe2DE.webp@ x2");
    assert.deepEqual(parts, [{ text: "Build " }, { icon: "other/House_aoe2DE.webp" }, { text: " x2" }]);
    for (const step of sample.build_order)
        for (const p of BO.noteParts(step.notes[0]))
            if (p.icon) assert.ok(fs.existsSync(path.join(iconsDir, p.icon)), p.icon);
});

test("icon labels are readable", () => {
    assert.equal(BO.iconLabel("town_center/LoomDE.webp"), "Loom");
    assert.equal(BO.iconLabel("other/House_aoe2DE.webp"), "House");
    assert.equal(BO.iconLabel("resource/Aoe2de_food.webp"), "Food");
    assert.equal(BO.iconLabel("mining_camp/GoldShaftMiningDE.webp"), "Gold Shaft Mining");
    assert.equal(BO.iconLabel("barracks/ManAtArmsUpgDE.webp"), "Man At Arms");
});

test("time strings", () => {
    assert.equal(BO.timeToSec("1:05"), 65);
    assert.equal(BO.timeToSec("12:00"), 720);
    assert.equal(BO.timeToSec("1:5x"), -1);
    assert.equal(BO.secToTime(65.9), "1:05");
});

test("villagers you should have at each moment", () => {
    const [bo] = BO.parse(JSON.stringify(sample)).orders;
    // times 75 (6), 150 (9), 175 (10), 605 (21), 606 (21)
    assert.equal(BO.villagersAt(bo, 0), 3);
    assert.equal(BO.villagersAt(bo, 50), 5);
    assert.equal(BO.villagersAt(bo, 75), 6);
    assert.equal(BO.villagersAt(bo, 100), 7);
    assert.equal(BO.villagersAt(bo, 175), 10);
    assert.equal(BO.villagersAt(bo, 9999), 21);
});

test("buildorderguide's own names and plain words become icons", () => {
    const index = JSON.parse(fs.readFileSync(path.join(iconsDir, "index.json"), "utf8"));
    const parts = BO.noteTokens("Move 6 @resource/MaleVillDE.webp@ from foodUnderTC to stragglerTree", index);
    assert.deepEqual(parts.filter((p) => p.icon).map((p) => p.icon), [
        "resource/MaleVillDE.webp",
        "resource/Aoe2de_food.webp",
        "town_center/Towncenter_aoe2DE.webp",
        "resource/tree.webp",
    ]);
    const train = BO.noteTokens("Train ∞ battleElephant", index);
    assert.equal(train.at(-1).icon, index.battleelephant);
    assert.ok(fs.existsSync(path.join(iconsDir, index.battleelephant)));
    const build = BO.noteTokens("@resource/Aoe2de_hammer.webp@ 2 house, 1 market", index);
    assert.deepEqual(build.filter((p) => p.icon).length, 3);
    assert.ok(build.some((p) => p.text === " 2 "));
    // Ordinary words stay words; an unknown name becomes readable
    assert.deepEqual(BO.noteTokens("Lure the boar to the town", index).filter((p) => p.icon).length, 1);
    assert.deepEqual(BO.noteTokens("Make fooBar", index).at(-1), { text: "foo bar" });
    for (const icon of Object.values(index)) assert.ok(fs.existsSync(path.join(iconsDir, icon)), icon);
});

test("buildorderguide's notes in Spanish", () => {
    assert.equal(BO.noteToSpanish("Create 6 @v@ on @s@"), "Hacé 6 @v@ para @s@");
    assert.equal(BO.noteToSpanish("Move 1 @v@ from foodUnderTC to @d@"), "Pasá 1 @v@ de foodUnderTC a @d@");
    assert.equal(BO.noteToSpanish("Click up to castleAge"), "Pasá a castleAge");
    assert.equal(BO.noteToSpanish("Train ∞ battleElephant"), "Entrená ∞ battleElephant");
    assert.equal(BO.noteToSpanish("Something else"), null);
});
