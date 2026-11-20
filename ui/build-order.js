// Build orders: reading them, timing them and matching them to a civ. No DOM here,
// so it runs in the overlay (window.BuildOrder) and in the tests (require).
//
// The format is RTS Overlay's (https://github.com/CraftySalamander/RTS_Overlay, GPL-3.0),
// which buildorderguide.com also exports ("Copy to clipboard for RTS Overlay"):
//
//   { "name": "...", "civilization": "Franks" | ["Franks", "Teutons"] | "Generic",
//     "author": "...", "source": "...",
//     "build_order": [ { "villager_count": 6, "age": 1,
//                        "resources": { "wood": 0, "food": 6, "gold": 0, "stone": 0, "builder": 0 },
//                        "notes": ["Build @other/House_aoe2DE.webp@ x2"], "time": "0:50" }, ... ] }
//
// "time" is optional and marks when the step should be done (in game time).
// "@folder/file.webp@" in a note is an icon, in ui/img/bo/ (see fetch-bo-icons.js).
// The timing estimate and the timer's speed factor are ported from RTS Overlay.
(function (root) {
    "use strict";

    const RESOURCES = ["food", "wood", "gold", "stone"];

    // Real seconds → game seconds at the game's "Normal" speed. RTS Overlay's
    // measured value (TIMER_SPEED_FACTOR.aoe2 in its rts_overlay.js).
    const GAME_SPEED = 1.608;

    // Names RTS Overlay and buildorderguide.com use where the game data says otherwise
    const CIV_ALIASES = { incas: "Inca", mayans: "Maya" };
    const GENERIC = new Set(["generic", "any", "all", ""]);

    const int = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : fallback);

    function timeToSec(str) {
        if (typeof str !== "string") return -1;
        const m = /^\s*(\d+):([0-5]?\d)\s*$/.exec(str);
        return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
    }

    function secToTime(sec) {
        const s = Math.max(0, Math.floor(sec));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }

    // civilization field → list of English names ([] when it is for any civ)
    function civNames(bo) {
        const raw = Array.isArray(bo.civilization) ? bo.civilization : [bo.civilization ?? ""];
        const names = raw.map((c) => String(c).trim()).filter((c) => !GENERIC.has(c.toLowerCase()));
        return names.map((n) => CIV_ALIASES[n.toLowerCase()] || n);
    }

    // English names → our civ codes, given the civs ({ code, nameEn }) of any data file
    function civCodes(bo, civs) {
        const byName = new Map(civs.map((c) => [String(c.nameEn || c.name).toLowerCase(), c.code]));
        return civNames(bo)
            .map((n) => byName.get(n.toLowerCase()))
            .filter(Boolean);
    }

    function stepVillagers(step) {
        if (step.villager_count >= 0) return step.villager_count;
        const r = step.resources;
        return RESOURCES.reduce((sum, k) => sum + Math.max(0, r[k]), 0) + Math.max(0, r.builder || 0);
    }

    // Villagers at the start of a game (the dark-age start), for this build's civ
    function startVillagers(bo) {
        const names = civNames(bo);
        const only = names.length === 1 ? names[0] : null;
        return only === "Chinese" ? 6 : only === "Maya" ? 4 : 3;
    }

    // How many villagers you should have at game time `sec`, following the
    // build's times: from the start to each step's count, evenly in between
    // (one villager every ~25 s), flat while the count doesn't change.
    function villagersAt(bo, sec) {
        let t0 = 0;
        let v0 = startVillagers(bo);
        for (const step of bo.build_order) {
            const v1 = Math.max(v0, stepVillagers(step));
            const t1 = step.timeSec;
            if (sec <= t1) {
                if (t1 <= t0) return v1;
                return Math.floor(v0 + ((v1 - v0) * (sec - t0)) / (t1 - t0));
            }
            t0 = t1;
            v0 = v1;
        }
        return v0;
    }

    // Times for every step when the build order brings none: villager production
    // plus age-ups and the Town Center techs named in the notes (RTS Overlay's
    // evaluateBOTimingAoE2, with its civ special cases).
    function estimateTimes(bo) {
        const only = civNames(bo).length === 1 ? civNames(bo)[0] : null;
        const is = (name) => only === name;
        const faster = (time, age) => (is("Persians") ? time / (1 + 0.05 * age) : time);
        const villagerTime = (age) => faster(25, age);
        const ageUpTime = (age) => {
            const base = age === 1 ? 130 : age === 2 ? 160 : 190;
            return is("Malay") ? base / 1.66 : faster(base, age);
        };
        const tcTech = {
            "town_center/LoomDE.webp": (age) => (is("Goths") ? 0 : is("Portuguese") ? 25 / 1.25 : faster(25, age)),
            "town_center/WheelbarrowDE.webp": (age) => wheel(75, age),
            "town_center/HandcartDE.webp": (age) => wheel(55, age),
            "town_center/TownWatchDE.webp": (age) => watch(25, age),
            "town_center/TownPatrolDE.webp": (age) => watch(40, age),
        };
        function wheel(base, age) {
            if (is("Vikings")) return 0;
            if (is("Vietnamese")) return base / 2;
            if (is("Portuguese")) return base / 1.25;
            return faster(base, age);
        }
        function watch(base, age) {
            if (is("Byzantines")) return 0;
            if (is("Portuguese")) return base / 1.25;
            return faster(base, age);
        }

        let villagers = startVillagers(bo);
        let age = 1;
        let agingUp = false;
        let total = 0;
        const researched = new Set();
        const times = [];
        bo.build_order.forEach((step, i) => {
            let t = 0;
            const count = Math.max(villagers, stepVillagers(step));
            t += (count - villagers) * villagerTime(age);
            villagers = count;
            const next = step.age >= 1 && step.age <= 4 ? step.age : age;
            if (next === age + 1) {
                t += ageUpTime(age);
                agingUp = true;
            } else if (agingUp) {
                if (is("Bengalis")) t -= 2 * villagerTime(age); // 2 free villagers on age-up
                agingUp = false;
            }
            for (const note of step.notes)
                for (const [img, time] of Object.entries(tcTech))
                    if (!researched.has(img) && note.includes(`@${img}@`)) {
                        t += time(age);
                        researched.add(img);
                    }
            total += t;
            age = next;
            let sec = Math.round(total);
            if (i > 0 && i === bo.build_order.length - 1 && sec === times[i - 1]) sec += 1;
            times.push(sec);
        });
        return times;
    }

    // Reads pasted text: one build order or a list of them. Returns
    // { orders: [...], errors: [...] }; each order is cleaned up, with `timeSec`
    // per step and `estimated` when the times are ours. Each error is
    // { code, build?, step?, detail? } so the page can say it in its language:
    // code is "json", "notObject", "noSteps" or "stepNotObject".
    function parse(text) {
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            return { orders: [], errors: [{ code: "json", detail: e.message }] };
        }
        const list = Array.isArray(json) ? json : [json];
        const orders = [];
        const errors = [];
        list.forEach((raw, i) => {
            const result = normalize(raw);
            if (result.code) errors.push({ ...result, build: list.length > 1 ? i + 1 : undefined });
            else orders.push(result);
        });
        return { orders, errors };
    }

    function normalize(raw) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { code: "notObject" };
        if (!Array.isArray(raw.build_order) || !raw.build_order.length) return { code: "noSteps" };
        const bad = raw.build_order.findIndex((s) => !s || typeof s !== "object");
        if (bad >= 0) return { code: "stepNotObject", step: bad + 1 };
        const steps = raw.build_order.map((s) => {
            // Older builds name .png/.jpg icons; ours (and RTS Overlay's now) are .webp
            const notes = (Array.isArray(s.notes) ? s.notes.map(String) : typeof s.notes === "string" ? [s.notes] : []).map(
                (n) => n.replace(/@([^@\s]+)\.(png|jpe?g)@/gi, "@$1.webp@")
            );
            const r = s.resources || {};
            const resources = Object.fromEntries(RESOURCES.map((k) => [k, int(r[k])]));
            if (r.builder !== undefined) resources.builder = int(r.builder);
            const step = { villager_count: int(s.villager_count, -1), age: int(s.age, -1), resources, notes };
            if (typeof s.time === "string") step.time = s.time;
            return step;
        });
        const bo = {
            name: String(raw.name || "Untitled build order").trim(),
            civilization: raw.civilization ?? "Generic",
            author: raw.author ? String(raw.author) : "",
            source: raw.source ? String(raw.source) : "",
            build_order: steps,
        };
        // The builds the overlay comes with bring their id and Spanish name
        if (typeof raw.id === "string") bo.id = raw.id;
        if (typeof raw.name_es === "string") bo.name_es = raw.name_es;
        // Its own times when they all read and never go back; ours otherwise
        const given = steps.map((s) => timeToSec(s.time));
        const usable = given.every((t, i) => t >= 0 && (i === 0 || t >= given[i - 1]));
        const times = usable ? given : estimateTimes(bo);
        steps.forEach((s, i) => (s.timeSec = times[i]));
        bo.estimated = !usable;
        return bo;
    }

    // The step to be on at game time `sec`: the first one not done yet
    // (a step's time is when it should be finished).
    function stepAt(bo, sec) {
        const i = bo.build_order.findIndex((s) => s.timeSec >= sec);
        return i === -1 ? bo.build_order.length - 1 : i;
    }

    // What changed from the previous step: where the new villagers go.
    // { food: +2, wood: -1, ... } with only the non-zero changes. The first step
    // compares against nothing (all its villagers are "new").
    function delta(bo, i) {
        const cur = bo.build_order[i].resources;
        const prev = i > 0 ? bo.build_order[i - 1].resources : {};
        const out = {};
        for (const k of [...RESOURCES, "builder"]) {
            if (cur[k] === undefined || cur[k] < 0) continue;
            const before = prev[k] !== undefined && prev[k] >= 0 ? prev[k] : 0;
            if (cur[k] !== before) out[k] = cur[k] - before;
        }
        return out;
    }

    // A note → [{ text } | { icon: "folder/file.webp" }], in order
    function noteParts(note) {
        const parts = [];
        const re = /@([^@\s]+\.(?:webp|png|jpg|jpeg|gif))@/gi;
        let last = 0;
        let m;
        while ((m = re.exec(note))) {
            if (m.index > last) parts.push({ text: note.slice(last, m.index) });
            parts.push({ icon: m[1].replace(/\.(png|jpe?g|gif)$/i, ".webp") });
            last = re.lastIndex;
        }
        if (last < note.length) parts.push({ text: note.slice(last) });
        return parts;
    }

    // buildorderguide.com writes some things as its own names where it has no
    // RTS Overlay icon ("castleAge", "foodUnderTC", "battleElephant"), and some
    // buildings as plain words ("2 house, 1 market"). These become icons when we
    // have one: by name in `index` (ui/img/bo/index.json: name → icon), or here.
    const TOKEN_ICONS = {
        foodundertc: ["resource/Aoe2de_food.webp", "town_center/Towncenter_aoe2DE.webp"],
        stragglertree: ["resource/tree.webp"],
        straggler: ["resource/tree.webp"],
        darkage: ["age/DarkAgeIconDE_alpha.webp"],
        feudalage: ["age/FeudalAgeIconDE_alpha.webp"],
        castleage: ["age/CastleAgeIconDE_alpha.webp"],
        imperialage: ["age/ImperialAgeIconDE_alpha.webp"],
        villager: ["resource/MaleVillDE.webp"],
        villagers: ["resource/MaleVillDE.webp"],
        towncenter: ["town_center/Towncenter_aoe2DE.webp"],
        tc: ["town_center/Towncenter_aoe2DE.webp"],
        sheep: ["animal/Sheep_aoe2DE.webp"],
        boar: ["animal/Boar_aoe2DE.webp"],
        deer: ["animal/Deer_aoe2DE.webp"],
        berries: ["resource/BerryBushDE.webp"],
        farms: ["mill/FarmDE.webp"],
        houses: ["other/House_aoe2DE.webp"],
    };
    // Plain lowercase words that become icons (camelCase names always do)
    const WORD_ICONS = new Set(["house", "houses", "market", "mill", "farm", "farms", "dock", "barracks", "stable", "blacksmith", "monastery", "university", "castle", "tower", "sheep", "boar", "deer", "berries", "villager", "villagers", "tc"]);
    const squash = (word) => word.toLowerCase().replace(/[^a-z0-9]/g, "");

    function tokenIcons(word, index) {
        const key = squash(word);
        return TOKEN_ICONS[key] || (index && index[key] ? [index[key]] : null);
    }

    // noteParts, plus those names and words as icons
    function noteTokens(note, index) {
        const out = [];
        for (const part of noteParts(note)) {
            if (part.icon) {
                out.push(part);
                continue;
            }
            const re = /\b([a-z]+(?:[A-Z][a-z]*|TC)+|[a-z]+)\b/g;
            let last = 0;
            let m;
            while ((m = re.exec(part.text))) {
                const word = m[1];
                const camel = /[A-Z]/.test(word);
                if (!camel && !WORD_ICONS.has(word)) continue;
                const icons = tokenIcons(word, index);
                if (!icons && !camel) continue;
                if (m.index > last) out.push({ text: part.text.slice(last, m.index) });
                if (icons) for (const icon of icons) out.push({ icon });
                // An unknown name, readable: "battleElephant" → "battle elephant"
                else out.push({ text: word.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase() });
                last = re.lastIndex;
            }
            if (last < part.text.length) out.push({ text: part.text.slice(last) });
        }
        return out;
    }

    // Spanish for the way buildorderguide.com words its notes ("Create 6 … on …",
    // "Move 1 … from … to …"); what it names stays as icons, so the sentence is
    // all that changes. null when the note isn't one of these.
    const ES_RULES = [
        [/^Create (\S+) (.+?) on (.+)$/, "Hacé $1 $2 para $3"],
        [/^Move (\S+) (.+?) from (.+?) to (.+)$/, "Pasá $1 $2 de $3 a $4"],
        [/^Lure (.+)$/, "Atraé $1"],
        [/^Click up to (.+)$/, "Pasá a $1"],
        [/^Before (.+)$/, "Antes de $1"],
        [/^In (.+)$/, "En $1"],
        [/^Train (.+)$/, "Entrená $1"],
        [/^Research (.+)$/, "Investigá $1"],
        [/^Build (.+)$/, "Construí $1"],
    ];
    function noteToSpanish(note) {
        for (const [re, to] of ES_RULES) if (re.test(note)) return note.replace(re, to);
        return null;
    }

    // "town_center/LoomDE.webp" → "Loom": a readable name for the icon's tooltip
    function iconLabel(path) {
        const file = path.split("/").pop().replace(/\.\w+$/, "");
        const noise = /^(aoe2|aoe2de|ao2de|de|ingame|icon|alpha|upg|upgde|upgrade|research|resear|civicon)$/i;
        const words = file
            .split(/[-_ ]+/)
            .filter((w) => w && !noise.test(w))
            .map((w) => w.replace(/(UpgDE|IconDE|DE|Upg|Icon)$/, "") || w)
            .filter((w) => !noise.test(w));
        return words
            .join(" ")
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/^\w/, (c) => c.toUpperCase());
    }

    const api = {
        RESOURCES,
        GAME_SPEED,
        parse,
        timeToSec,
        secToTime,
        civNames,
        civCodes,
        estimateTimes,
        startVillagers,
        villagersAt,
        stepAt,
        delta,
        noteParts,
        noteTokens,
        noteToSpanish,
        iconLabel,
        squash,
    };
    if (typeof module === "object" && module.exports) module.exports = api;
    else root.BuildOrder = api;
})(typeof window !== "undefined" ? window : globalThis);
