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
    assert.match(BO.parse("{nope").errors[0], /Not valid JSON/);
    assert.match(BO.parse("{}").errors[0], /build_order/);
    const two = BO.parse(JSON.stringify([sample, { name: "x" }]));
    assert.equal(two.orders.length, 1);
    assert.match(two.errors[0], /^#2:/);
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
