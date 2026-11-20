"""Prototype: read AoE2's HUD numbers without generic OCR.

The game draws its numbers in one font, white with a dark outline, at fixed
places. So: keep the near-white pixels, cut them into glyphs (connected
components), and compare each glyph's shape with digit templates. No word
models, no guessing.

usage: python3 hud_read.py <screenshot.png> [crop: x0,y0,x1,y1]
"""
import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONTS = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Narrow.ttf",
]
CHARS = "0123456789/"
W, H = 16, 24


def normalize(mask):
    """A glyph mask, tightly cropped, scaled to H high and centered in W x H."""
    ys, xs = np.nonzero(mask)
    if len(xs) == 0:
        return np.zeros((H, W), np.float32)
    g = mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1].astype(np.float32)
    h, w = g.shape
    scale = H / h
    nw = max(1, min(W, int(round(w * scale))))
    g = cv2.resize(g, (nw, H), interpolation=cv2.INTER_AREA)
    out = np.zeros((H, W), np.float32)
    x0 = (W - nw) // 2
    out[:, x0 : x0 + nw] = g
    return out


def templates():
    out = []
    for path in FONTS:
        font = ImageFont.truetype(path, 64)
        for ch in CHARS:
            img = Image.new("L", (80, 90), 0)
            ImageDraw.Draw(img).text((8, 0), ch, fill=255, font=font)
            m = np.array(img) > 127
            out.append((ch, normalize(m), m.shape))
    return out


TEMPLATES = templates()


def classify(mask):
    g = normalize(mask)
    ys, xs = np.nonzero(mask)
    aspect = (xs.max() - xs.min() + 1) / (ys.max() - ys.min() + 1)
    best, best_score = "?", -1
    for ch, t, _ in TEMPLATES:
        # Correlation of the two shapes (1 = identical)
        a, b = g - g.mean(), t - t.mean()
        score = float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-6))
        # "1" is the only narrow digit: keep wide glyphs from matching it
        if ch == "1" and aspect > 0.6:
            score -= 0.3
        if score > best_score:
            best, best_score = ch, score
    return best, best_score


def read(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    # Text: bright and not colored (the stone and the map are brown)
    mask = ((hsv[:, :, 2] > 185) & (hsv[:, :, 1] < 60)).astype(np.uint8)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    glyphs = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if h < 14 or h > 70 or area < 25:
            continue
        glyphs.append((x, y, w, h, labels[y : y + h, x : x + w] == i))
    # Strings: glyphs of about the same height, side by side
    glyphs.sort(key=lambda g: (g[1] + g[3] // 2, g[0]))
    rows = []
    for g in sorted(glyphs, key=lambda g: g[0]):
        for r in rows:
            last = r[-1]
            same_line = abs((g[1] + g[3]) - (last[1] + last[3])) < 0.25 * last[3] and abs(g[3] - last[3]) < 0.3 * last[3]
            if same_line and 0 <= g[0] - (last[0] + last[2]) < 0.9 * last[3]:
                r.append(g)
                break
        else:
            rows.append([g])
    out = []
    for r in rows:
        chars = [classify(g[4]) for g in r]
        text = "".join(c for c, _ in chars)
        low = min(s for _, s in chars)
        x, y = r[0][0], r[0][1]
        out.append((x, y, r[0][3], text, low))
    return sorted(out, key=lambda o: (o[1] // 40, o[0]))


if __name__ == "__main__":
    img = cv2.imread(sys.argv[1])
    if len(sys.argv) > 2:
        x0, y0, x1, y1 = map(int, sys.argv[2].split(","))
        img = img[y0:y1, x0:x1]
    for x, y, h, text, low in read(img):
        print(f"x={x:5d} y={y:4d} h={h:3d}  {text:10s}  (worst glyph match {low:.2f})")
