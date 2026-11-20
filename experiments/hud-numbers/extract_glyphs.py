"""Extracts the game's digit glyphs from its font atlases into glyphs.png/glyphs.json.

The game draws text from multi-channel signed distance field atlases
(resources/_common/fonts/combined*.png + .txt). A pixel is inside a glyph when the
median of its R, G, B channels is above half. So the shapes here are exactly the
game's. Two fonts: "combined" and "combined_sansserif".

    python3 -I experiments/hud-numbers/extract_glyphs.py <AoE2DE folder>
"""
import json
import os
import re
import sys

import numpy as np
from PIL import Image

CHARS = "0123456789/:"
HERE = os.path.dirname(os.path.abspath(__file__))


def glyphs(fonts_dir, name):
    text = open(os.path.join(fonts_dir, name + ".txt"), encoding="utf-8", errors="replace").read()
    pages = {}
    out = {}
    for ch in CHARS:
        m = re.search(r"^Glyph - '" + re.escape(ch) + r"'\s+W\((\d+)\), H\((\d+)\), UV\(([\d.]+), ([\d.]+)\), ST\(([\d.]+), ([\d.]+)\), Atlas\((\d+)\)", text, re.M)
        if not m:
            continue
        w, h, u0, v0, u1, v1, page = int(m[1]), int(m[2]), float(m[3]), float(m[4]), float(m[5]), float(m[6]), int(m[7])
        if page not in pages:
            pages[page] = np.array(Image.open(os.path.join(fonts_dir, f"{name}_{page:04d}.png")).convert("RGB")).astype(np.float32) / 255
        atlas = pages[page]
        H, W, _ = atlas.shape
        crop = atlas[int(round(v0 * H)) : int(round(v1 * H)), int(round(u0 * W)) : int(round(u1 * W))]
        sd = np.median(crop, axis=2)  # the signed distance: > 0.5 inside
        out[ch] = sd
    return out


if __name__ == "__main__":
    fonts_dir = os.path.join(sys.argv[1], "resources/_common/fonts")
    sheet = []
    meta = {}
    for name in ("combined", "combined_sansserif"):
        for ch, sd in glyphs(fonts_dir, name).items():
            meta.setdefault(name, {})[ch] = sd.shape
            sheet.append(((sd > 0.5) * 255).astype(np.uint8))
            np.save(os.path.join(HERE, "glyphs", f"{name}_{ord(ch)}.npy"), sd) if os.path.isdir(os.path.join(HERE, "glyphs")) else None
    hmax = max(s.shape[0] for s in sheet)
    row = np.zeros((hmax, sum(s.shape[1] + 4 for s in sheet)), np.uint8)
    x = 0
    for s in sheet:
        row[: s.shape[0], x : x + s.shape[1]] = s
        x += s.shape[1] + 4
    Image.fromarray(row).save(os.path.join(HERE, "glyphs-preview.png"))
    print({k: len(v) for k, v in meta.items()})
