"""Benchmark: reading the modded HUD's numbers, each from its own box.

Makes HUD frames the way the game draws them with our mod (white digits from the
game's own font, on black, at the boxes our resourcepanel.json defines, at several
screen sizes), then reads every number back:

  A. glyph matching: binarize the box, split it into glyphs, compare each with the
     game's digits scaled to the same height.
  B. the OS's OCR (macOS Vision here, the closest thing to Windows' built-in OCR):
     writes the boxes to a folder for ocr_vision.swift.

    python3 -I experiments/hud-numbers/bench.py <resourcepanel.json> [frames]
"""
import json
import os
import random
import sys
import time

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GLYPHS = os.path.join(HERE, "glyphs")
FONT = "combined_sansserif"
CHARS = "0123456789/:"


def load_font(name):
    return {ch: np.load(os.path.join(GLYPHS, f"{name}_{ord(ch)}.npy")) for ch in CHARS}


SDF = load_font(FONT)


def render_text(text, px):
    """The text as the game draws it: px is the font size in screen pixels.
    The atlas glyphs are for a 64 px font; scale the distance field, threshold it."""
    s = px / 64
    parts = []
    for ch in text:
        sd = SDF[ch]
        h, w = max(1, round(sd.shape[0] * s)), max(1, round(sd.shape[1] * s))
        img = Image.fromarray((sd * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)
        a = np.asarray(img).astype(np.float32) / 255
        # antialiased edge: 0.5 is the outline of the glyph
        cov = np.clip((a - 0.5) * 6 + 0.5, 0, 1)
        parts.append(cov[:, : max(1, round(w * 0.86))])  # glyph advance is a bit under its box
    H = max(p.shape[0] for p in parts)
    out = np.zeros((H, sum(p.shape[1] for p in parts) + len(parts)), np.float32)
    x = 0
    for p in parts:
        out[H - p.shape[0] :, x : x + p.shape[1]] = np.maximum(out[H - p.shape[0] :, x : x + p.shape[1]], p)
        x += p.shape[1] + 1
    return out


def font_size(widget):
    for st in widget.get("StateMaterials", {}).values():
        if isinstance(st, dict) and st.get("Font"):
            return st["Font"]["PointSize"]
    return 32


def boxes(layout):
    """Every number's box in 4K UI units (x, y, w, h, font size), by name."""
    out = {}
    bg = layout["Collection"]["Widgets"][0]["Widget"]
    for c in bg["ChildWidgets"]:
        W = c["Widget"]
        v = W["ViewPort"]
        if W["Type"] == "Label" and W["Name"].endswith(("Storage", "Count")):
            font = font_size(W)
            out[W["Name"]] = (v["xorigin"], v["yorigin"] - v["height"] / 2, v["width"], v["height"], font)
        if W["Type"] == "Base" and W.get("ChildWidgets"):
            for k in W["ChildWidgets"]:
                K = k["Widget"]
                if K["Type"] == "Label":
                    kv = K["ViewPort"]
                    font = font_size(K)
                    x0, y0 = v["xorigin"] - v["width"] / 2, v["yorigin"] - v["height"] / 2
                    out[W["Name"] + "Workers"] = (x0 + kv["xorigin"], y0 + kv["yorigin"], kv["width"], kv["height"], font)
    # An amount's box can run into the next resource's icon, where that resource's
    # villager count is: stop each box at the next icon's left edge
    icons = []
    for c in bg["ChildWidgets"]:
        W = c["Widget"]
        if W["Type"] in ("Base", "Button") and W.get("ChildWidgets"):
            v = W["ViewPort"]
            icons.append(v["xorigin"] - v["width"] / 2)
    for name, (x, y, w, h, pt) in list(out.items()):
        if name.endswith(("Storage", "Count")):
            right = min([i for i in icons if i > x] + [x + w])
            out[name] = (x, y, min(w, right - x - 2), h, pt)
    out["Clock"] = (40, 300, 640, 52, 40)
    return out


def value_for(name, rnd):
    if name == "Clock":
        t = rnd.randint(0, 3 * 3600)
        return f"{t // 3600:02d}:{t // 60 % 60:02d}:{t % 60:02d}"
    if name == "PopulationCount":
        a = rnd.randint(3, 200)
        return f"{a}/{rnd.randint(max(a, 5), 200)}"
    if name.endswith("Workers"):
        return str(rnd.choice([rnd.randint(0, 9), rnd.randint(10, 99), rnd.randint(0, 40)]))
    return str(rnd.choice([rnd.randint(0, 99), rnd.randint(100, 999), rnd.randint(1000, 9999), rnd.randint(10000, 99999)]))


def make_frame(bx, scale, rnd):
    W, H = int(1800 * scale) + 10, int(400 * scale) + 10
    img = np.zeros((H, W), np.float32)
    truth = {}
    for name, (x, y, w, h, pt) in bx.items():
        text = value_for(name, rnd)
        truth[name] = text
        glyphs = render_text(text, pt * scale)
        X, Y = int(x * scale), int((y + h * 0.15) * scale)
        gh, gw = glyphs.shape
        gw = min(gw, img.shape[1] - X)
        img[Y : Y + gh, X : X + gw] = np.maximum(img[Y : Y + gh, X : X + gw], glyphs[:, :gw])
    return img, truth


# ---- A. glyph matching ----

TEMPLATE_CACHE = {}


def templates(height):
    if height not in TEMPLATE_CACHE:
        t = {}
        for ch in CHARS:
            g = render_text(ch, 64)
            t[ch] = (normalize(g > 0.5), (g > 0.5).shape[1] / (g > 0.5).shape[0])
        TEMPLATE_CACHE[height] = t
    return TEMPLATE_CACHE[height]


def normalize(mask, W=12, H=18):
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return np.zeros((H, W), np.float32)
    g = mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1].astype(np.float32)
    img = Image.fromarray((g * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    a = np.asarray(img).astype(np.float32) / 255
    return a - a.mean()


def read_box(img, box, scale):
    x, y, w, h, _ = box
    crop = img[int(y * scale) : int((y + h) * scale) + 2, int(x * scale) : int((x + w) * scale)]
    mask = crop > 0.5
    cols = mask.any(axis=0)
    # glyphs = runs of columns with ink
    runs, start = [], None
    for i, c in enumerate(list(cols) + [False]):
        if c and start is None:
            start = i
        elif not c and start is not None:
            runs.append((start, i))
            start = None
    rows_any = mask.any(axis=1)
    if not rows_any.any():
        return ""
    full_h = rows_any.nonzero()[0][-1] - rows_any.nonzero()[0][0] + 1
    t = templates(0)
    out = ""
    for a, b in runs:
        g = mask[:, a:b]
        ys = g.any(axis=1).nonzero()[0]
        gh = ys[-1] - ys[0] + 1
        # ':' is two small dots, much shorter than a digit
        if gh < full_h * 0.8:
            out += ":"
            continue
        n = normalize(g)
        aspect = (b - a) / gh
        best, best_s = "?", -9
        for ch, (tn, tas) in t.items():
            if ch == ":":
                continue
            s = float((n * tn).sum() / (np.sqrt((n * n).sum() * (tn * tn).sum()) + 1e-6)) - 0.5 * abs(aspect - tas)
            if s > best_s:
                best, best_s = ch, s
        out += best
    return out


if __name__ == "__main__":
    layout = json.load(open(sys.argv[1], encoding="utf-8-sig"))
    frames = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    bx = boxes(layout)
    rnd = random.Random(1)
    ocr_dir = os.path.join(HERE, "out-ocr")
    os.makedirs(ocr_dir, exist_ok=True)
    truth_all = {}
    for res, scale in (("1080p", 0.5), ("1440p", 2 / 3), ("4K", 1.0)):
        ok = total = 0
        t0 = time.perf_counter()
        wrong = []
        for f in range(frames):
            img, truth = make_frame(bx, scale, rnd)
            for name, box in bx.items():
                got = read_box(img, box, scale)
                total += 1
                ok += got == truth[name]
                if got != truth[name] and len(wrong) < 5:
                    wrong.append((name, truth[name], got))
                if f < 15:  # a few boxes for the OS OCR
                    x, y, w, h, _ = box
                    crop = img[int(y * scale) : int((y + h) * scale) + 2, int(x * scale) : int((x + w) * scale)]
                    fn = f"{res}_{f}_{name}.png"
                    Image.fromarray((crop * 255).astype(np.uint8)).save(os.path.join(ocr_dir, fn))
                    truth_all[fn] = truth[name]
        dt = (time.perf_counter() - t0) / frames
        print(f"A glyph matching, {res}: {ok}/{total} right ({100 * ok / total:.1f}%), {dt * 1000:.1f} ms per frame of {len(bx)} numbers; wrong: {wrong}")
    json.dump(truth_all, open(os.path.join(ocr_dir, "truth.json"), "w"))
    if len(sys.argv) > 3:
        Image.fromarray((make_frame(bx, 0.5, random.Random(7))[0] * 255).astype(np.uint8)).save(sys.argv[3])
