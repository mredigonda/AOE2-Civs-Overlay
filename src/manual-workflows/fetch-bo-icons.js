// Downloads RTS Overlay's AoE2 icons into ui/img/bo/, at the same paths its
// build orders name them ("@town_center/LoomDE.webp@" → ui/img/bo/town_center/LoomDE.webp),
// so a build order copied from RTS Overlay or buildorderguide.com shows its icons.
//
// RTS Overlay (https://github.com/CraftySalamander/RTS_Overlay) is GPL-3.0, like this
// project; the icons themselves are Age of Empires II content (see the README).
// Pinned to a commit so a rerun is reproducible; bump REF to pick up new icons.
//
//   GITHUB_TOKEN=$(gh auth token) node src/manual-workflows/fetch-bo-icons.js
//   node src/manual-workflows/fetch-bo-icons.js --index-only   (just redo index.json)
// (the token only avoids GitHub's 60-requests-an-hour limit for anonymous calls)

const fs = require("fs");
const path = require("path");

const REPO = "CraftySalamander/RTS_Overlay";
const REF = "65daf98060bfbef0fdffb28868c7e425e2ed4888";
const PREFIX = "docs/assets/aoe2/";
const OUT = path.join(__dirname, "../../ui/img/bo");

async function main() {
    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    const res = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${REF}?recursive=1`, { headers });
    if (!res.ok) throw new Error(`GitHub tree: ${res.status}`);
    const files = (await res.json()).tree.filter((f) => f.type === "blob" && f.path.startsWith(PREFIX));
    let done = 0;
    for (const f of files) {
        const rel = f.path.slice(PREFIX.length);
        const dest = path.join(OUT, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const img = await fetch(`https://raw.githubusercontent.com/${REPO}/${REF}/${f.path}`);
        if (!img.ok) throw new Error(`${rel}: ${img.status}`);
        fs.writeFileSync(dest, Buffer.from(await img.arrayBuffer()));
        done++;
    }
    writeIndex(files.map((f) => f.path.slice(PREFIX.length)));
    console.log(`${done} icons in ui/img/bo/`);
}

// ui/img/bo/index.json: each icon by its squashed name ("battleelephant" →
// "stable/Battle_elephant_aoe2DE.webp"), to show buildorderguide.com's own names
// as icons. Transparent "_alpha" versions win; on a clash, the first file.
function writeIndex(paths) {
    const { iconLabel, squash } = require("../../ui/build-order.js");
    const index = {};
    const sorted = [...paths].filter((p) => p.endsWith(".webp")).sort((a, b) => b.includes("_alpha") - a.includes("_alpha"));
    for (const p of sorted) {
        const key = squash(iconLabel(p));
        if (key && !index[key]) index[key] = p;
    }
    fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1) + "\n");
}

if (process.argv[2] === "--index-only") {
    const list = [];
    const walk = (dir, rel) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true }))
            if (e.isDirectory()) walk(path.join(dir, e.name), rel + e.name + "/");
            else list.push(rel + e.name);
    };
    walk(OUT, "");
    writeIndex(list);
    console.log("ui/img/bo/index.json written");
    return;
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
