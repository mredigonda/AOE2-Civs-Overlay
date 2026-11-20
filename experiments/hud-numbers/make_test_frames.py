"""Whole screens drawn the way the game draws its bar with our mod, for the Rust
reader's test (src-tauri/src/hud.rs: reads_test_frames).

Each frame: a map-like background, the mod's black panel and letter icons where the
mod's layout puts them (wherever on the screen, at the UI scale of that resolution),
the numbers in the game's own font, and the clock with its black box.

    python3 -I experiments/hud-numbers/make_test_frames.py <built mod folder>

Writes experiments/hud-numbers/frames/ (not in git: regenerate it).
"""
import json
import os
import random
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bench  # noqa: E402

OUT = os.path.join(HERE, "frames")
ICONS = {"Wood": "resource_wood", "Food": "resource_food", "Gold": "resource_gold", "Stone": "resource_stone", "Population": "pop"}


def paste_mask(canvas, mask, x, y, color=(255, 255, 255)):
    h, w = mask.shape
    x, y = int(x), int(y)
    region = canvas[y : y + h, x : x + w]
    m = mask[: region.shape[0], : region.shape[1], None]
    canvas[y : y + h, x : x + w] = (region * (1 - m) + np.array(color) * m).astype(np.uint8)


def frame(mod, layout, W, H, rnd):
    scale = H / 2160
    # A map: brown and green, with grey rocks (which look a bit like the letters)
    yy, xx = np.mgrid[0:H, 0:W]
    base = np.stack([120 + 30 * np.sin(xx / 97.0), 100 + 25 * np.cos(yy / 71.0), 60 + 10 * np.sin((xx + yy) / 50.0)], -1)
    canvas = np.clip(base + np.random.default_rng(rnd.randint(0, 9999)).normal(0, 8, base.shape), 0, 255).astype(np.uint8)
    img = Image.fromarray(canvas)
    d = ImageDraw.Draw(img)
    for _ in range(25):
        x, y, r = rnd.randint(0, W), rnd.randint(0, H), rnd.randint(5, 40)
        g = rnd.randint(110, 190)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(g, g, g))
    # Where the bar goes on this screen: anywhere sensible
    ox, oy = rnd.randint(0, int(W * 0.3)), rnd.choice([rnd.randint(0, 40), H - int(300 * scale) - rnd.randint(0, 40)])
    panel = Image.open(os.path.join(mod, "widgetui/textures/ingame/panels/WEST/resource-panel.png")).convert("RGBA")
    pw, ph = int(panel.width * scale), int(panel.height * scale)
    img.paste(panel.resize((pw, ph)), (ox, oy), panel.resize((pw, ph)))
    bg = layout["Collection"]["Widgets"][0]["Widget"]
    truth = {}
    canvas = np.array(img.convert("RGB"))
    for c in bg["ChildWidgets"]:
        w = c["Widget"]
        v = w["ViewPort"]
        if w["Name"] in ICONS:
            iw, ih = v["width"] * scale, v["height"] * scale
            ix, iy = ox + (v["xorigin"] - v["width"] / 2) * scale, oy + (v["yorigin"] - v["height"] / 2) * scale
            icon = Image.open(os.path.join(mod, "widgetui/textures/ingame/icons", ICONS[w["Name"]] + ".png")).convert("RGB").resize((round(iw), round(ih)), Image.BILINEAR)
            canvas[round(iy) : round(iy) + icon.height, round(ix) : round(ix) + icon.width] = np.array(icon)
            for k in w.get("ChildWidgets", []):
                K = k["Widget"]
                if K["Type"] == "Label":
                    kv = K["ViewPort"]
                    t = str(rnd.choice([rnd.randint(0, 9), rnd.randint(10, 99)]))
                    truth[w["Name"] + "Workers"] = t
                    g = bench.render_text(t, bench.font_size(K) * scale)
                    # right-aligned at the bottom of the label's box
                    paste_mask(canvas, g, ix + (kv["xorigin"] + kv["width"]) * scale - g.shape[1] - 2, iy + (kv["yorigin"] + kv["height"]) * scale - g.shape[0] - 1)
    for c in bg["ChildWidgets"]:
        w = c["Widget"]
        v = w["ViewPort"]
        if w["Type"] == "Label" and (w["Name"].endswith("Storage") or w["Name"] == "PopulationCount"):
            if w["Name"] == "PopulationCount":
                a = rnd.randint(3, 200)
                t = f"{a}/{rnd.randint(max(a, 5), 200)}"
            else:
                t = str(rnd.choice([rnd.randint(0, 99), rnd.randint(100, 999), rnd.randint(1000, 9999)]))
            truth[w["Name"]] = t
            g = bench.render_text(t, bench.font_size(w) * scale)
            paste_mask(canvas, g, ox + v["xorigin"] * scale + 2, oy + v["yorigin"] * scale - g.shape[0] / 2)
    # The clock, under the bar, in its black box
    s = rnd.randint(0, 2 * 3600)
    clock = f"{s // 3600:02d}:{s // 60 % 60:02d}:{s % 60:02d}"
    truth["Clock"] = clock
    cx, cy = ox + 30 * scale, (oy + ph + 20 * scale) if oy < H / 2 else (oy - 80 * scale)
    canvas[int(cy) : int(cy + 60 * scale), int(cx - 10 * scale) : int(cx + 630 * scale)] = 0
    g = bench.render_text(clock, 40 * scale)
    paste_mask(canvas, g, cx, cy + 8 * scale)
    tail = Image.new("L", (int(300 * scale), int(52 * scale)), 0)
    ImageDraw.Draw(tail).text((0, 4 * scale), " (Normal - 1.7)", fill=255, font=ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", max(8, int(34 * scale))))
    paste_mask(canvas, np.asarray(tail) / 255, cx + g.shape[1] + 2, cy + 8 * scale)
    return Image.fromarray(canvas), truth


if __name__ == "__main__":
    mod = sys.argv[1]
    layout = json.load(open(os.path.join(mod, "widgetui/resourcepanel.json"), encoding="utf-8-sig"))
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(os.path.join(OUT, "mod/widgetui"))
    shutil.copy(os.path.join(mod, "widgetui/resourcepanel.json"), os.path.join(OUT, "mod/widgetui/resourcepanel.json"))
    rnd = random.Random(3)
    truth = {}
    for W, H in ((1920, 1080), (2560, 1440), (3840, 2160)):
        for i in range(3):
            img, t = frame(mod, layout, W, H, rnd)
            name = f"{W}x{H}_{i}.png"
            img.save(os.path.join(OUT, name))
            truth[name] = t
    json.dump(truth, open(os.path.join(OUT, "truth.json"), "w"), indent=1)
    print(len(truth), "frames in", os.path.relpath(OUT))
