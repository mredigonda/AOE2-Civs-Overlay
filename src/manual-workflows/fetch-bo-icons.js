// Downloads RTS Overlay's AoE2 icons into ui/img/bo/, at the same paths its
// build orders name them ("@town_center/LoomDE.webp@" → ui/img/bo/town_center/LoomDE.webp),
// so a build order copied from RTS Overlay or buildorderguide.com shows its icons.
//
// RTS Overlay (https://github.com/CraftySalamander/RTS_Overlay) is GPL-3.0, like this
// project; the icons themselves are Age of Empires II content (see the README).
// Pinned to a commit so a rerun is reproducible; bump REF to pick up new icons.
//
//   GITHUB_TOKEN=$(gh auth token) node src/manual-workflows/fetch-bo-icons.js
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
    console.log(`${done} icons in ui/img/bo/`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
