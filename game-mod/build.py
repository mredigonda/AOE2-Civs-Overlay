"""Builds our AoE2 DE mod ("AoE2 Overlay Mod") from the game's own files.

What it changes, each part on its own switch (see CONFIG):

- Minimap rings for Arabia 1v1: two ellipses around the ring where Town Centers
  spawn, one inside it and one outside, so a scout sent along either of them
  doesn't run into the enemy TC. (The minimap is a 2:1 diamond, so a circle on the
  map is an ellipse on it.) Drawn into each culture's minimap frame image
  (widgetui/textures/ingame/panels/<culture>/map-panel.png), like "TC Orbit Green".
- Resource bar: black background, a letter instead of each resource's picture
  (W F G S, V for villagers/population), and bigger white numbers. Easy to read at
  a glance, and trivial for the overlay to read off the screen later.

Usage:
    python3 -I game-mod/build.py                 # builds game-mod/dist/<mod>
    python3 -I game-mod/build.py --install       # and copies it into the game's local mods

Needs Python 3 with Pillow and numpy. Reads the game's files from the Porting Kit
(Wineskin) install on this Mac unless --game points elsewhere.
"""
import argparse
import copy
import glob
import json
import math
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

MOD_TITLE = "AoE2 Overlay Mod"

CONFIG = {
    "rings": {
        "enabled": True,
        # Map tiles on a 1v1 Arabia (120 x 120): the minimap diamond's half-width is
        # the map's half-diagonal, 60 * sqrt(2) tiles.
        "map_tiles": 120,
        # The TC spawn ring, in tiles from the map center: where "TC Orbit Green"
        # draws its circle (measured from its image: 162.5 px of a 342.5 px half-width).
        "spawn_ring": 40.3,
        # Our two rings, as tiles inside and outside the spawn ring
        "inside": 6,
        "outside": 6,
        # Where the rings' center goes, from the black diamond's center: TC Orbit's
        # circle (tested in game) sits this far left and down of it
        "center_offset_px": (-5.5, 3.0),
        "color": (40, 230, 90, 255),
        "width_px": 5,
        # The spawn ring itself, thin and dotted, for reference (None: not drawn)
        "spawn_ring_color": (255, 255, 255, 110),
    },
    "resource_bar": {
        "enabled": True,
        "letters": {"wood": "W", "food": "F", "gold": "G", "stone": "S", "pop": "V"},
        "letter_color": (150, 150, 150, 255),
        # Numbers: this much bigger than the base layout's, white, outlined black
        "font_scale": 1.25,
    },
}

ICON_FILES = {
    "wood": ["resource_wood.png", "resource_wood_transparent.png"],
    "food": ["resource_food.png", "resource_food_transparent.png"],
    "gold": ["resource_gold.png", "resource_gold_transparent.png"],
    "stone": ["resource_stone.png", "resource_stone_transparent.png"],
    "pop": ["pop.png"],
}

HERE = os.path.dirname(os.path.abspath(__file__))
# macOS: the game runs in a Porting Kit (Wineskin) wrapper in /Applications, with a
# Windows drive inside. Windows: the drive itself.
WRAPPER_GLOB = "/Applications/Age of Empires 2 Definitive Ed*.app/Contents/SharedSupport/prefix/drive_c"


def steam_libraries():
    """Steam's library folders on Windows (the game can be in any of them)."""
    roots = [r"C:\Program Files (x86)\Steam", r"C:\Program Files\Steam"]
    libs = list(roots)
    for root in roots:
        vdf = os.path.join(root, "steamapps", "libraryfolders.vdf")
        if os.path.exists(vdf):
            import re

            text = open(vdf, encoding="utf-8", errors="replace").read()
            libs += [p.replace("\\\\", "\\") for p in re.findall(r'"path"\s+"([^"]+)"', text)]
    return libs


def find_game():
    """(the folder that has users/, the game's AoE2DE folder)"""
    if os.name == "nt":
        for lib in steam_libraries():
            game = os.path.join(lib, "steamapps", "common", "AoE2DE")
            if os.path.isdir(os.path.join(game, "widgetui")):
                return os.path.join(os.environ.get("SystemDrive", "C:") + "\\", "Users"), game
    for drive in sorted(glob.glob(WRAPPER_GLOB)):
        game = os.path.join(drive, "Program Files (x86)/Steam/steamapps/common/AoE2DE")
        if os.path.isdir(os.path.join(game, "widgetui")):
            return os.path.join(drive, "users"), game
    sys.exit("Didn't find the game; pass --game <AoE2DE folder> and --mods <mods folder>")


def find_mods(users):
    """The profile's mods folder (the one with mod-status.json). On Windows it's
    %USERPROFILE%\\Games\\Age of Empires 2 DE\\<profile id>\\mods."""
    if os.name == "nt" and os.environ.get("USERPROFILE"):
        found = glob.glob(os.path.join(os.environ["USERPROFILE"], "Games", "Age of Empires 2 DE", "*", "mods", "mod-status.json"))
        if found:
            return os.path.dirname(found[0])
    found = glob.glob(os.path.join(users, "*", "Games", "Age of Empires 2 DE", "*", "mods", "mod-status.json"))
    return os.path.dirname(found[0]) if found else None


# A bold sans font for the letters, from whichever system this runs on
FONTS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def bold_font(size):
    for f in FONTS:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default(size)


def enabled_base(mods, relpath):
    """The file the game uses now: the highest-priority enabled mod that has it."""
    if not mods:
        return None
    status = json.load(open(os.path.join(mods, "mod-status.json"), encoding="utf-8-sig"))
    for m in sorted(status.get("Mods", []), key=lambda m: m.get("Priority", 999)):
        if not m.get("Enabled") or MOD_TITLE in m.get("Path", ""):
            continue
        f = os.path.join(mods, m["Path"].replace("//", "/"), relpath)
        if os.path.exists(f):
            return f
    return None


# ---- minimap rings ----


def diamond(img):
    """The minimap's black diamond in a map-panel image: center and half sizes."""
    a = np.array(img.convert("RGBA")).astype(int)
    black = (a[:, :, :3].max(axis=2) < 14) & (a[:, :, 3] > 240)
    h, w = black.shape
    cy, cx = h // 2 + 13, w // 2 + 44  # inside the diamond in every culture's image
    row, col = black[cy], black[:, cx]
    l = r = cx
    while l > 0 and row[l - 1]:
        l -= 1
    while r < w - 1 and row[r + 1]:
        r += 1
    t = b = cy
    while t > 0 and col[t - 1]:
        t -= 1
    while b < h - 1 and col[b + 1]:
        b += 1
    return (l + r) / 2, (t + b) / 2, (r - l + 1) / 2, (b - t + 1) / 2


def draw_rings(img, cfg):
    cx, cy, hw, hh = diamond(img)
    cx, cy = cx + cfg["center_offset_px"][0], cy + cfg["center_offset_px"][1]
    half_diag = cfg["map_tiles"] / 2 * math.sqrt(2)
    S = 4  # draw 4x bigger, then shrink: smooth edges
    layer = Image.new("RGBA", (img.width * S, img.height * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def ellipse(tiles, color, width, dotted=False):
        ax, ay = tiles / half_diag * hw * S, tiles / half_diag * hh * S
        if not dotted:
            d.ellipse([cx * S - ax, cy * S - ay, cx * S + ax, cy * S + ay], outline=color, width=width * S)
            return
        for k in range(0, 360, 6):
            d.arc([cx * S - ax, cy * S - ay, cx * S + ax, cy * S + ay], k, k + 3, fill=color, width=width * S)

    ring = cfg["spawn_ring"]
    if cfg.get("spawn_ring_color"):
        ellipse(ring, cfg["spawn_ring_color"], 2, dotted=True)
    ellipse(ring - cfg["inside"], cfg["color"], cfg["width_px"])
    ellipse(ring + cfg["outside"], cfg["color"], cfg["width_px"])
    layer = layer.resize(img.size, Image.LANCZOS)
    out = img.convert("RGBA")
    out.alpha_composite(layer)
    return out


# ---- resource bar ----


def letter_icon(size, letter, color):
    """Black, with the letter in the top-left corner: the bottom half is where the
    game writes how many villagers work that resource."""
    img = Image.new("RGBA", size, (0, 0, 0, 255))
    font = bold_font(int(size[1] * 0.42))
    d = ImageDraw.Draw(img)
    box = d.textbbox((0, 0), letter, font=font)
    pad = size[0] * 0.08
    d.text((pad - box[0], pad - box[1]), letter, fill=color, font=font)
    return img


def idle_icon(size, idle):
    """The idle villagers button: black when nobody is idle, a red block when someone is."""
    return Image.new("RGBA", size, (190, 20, 20, 255) if idle else (0, 0, 0, 255))


def black_like(img):
    """Same shape (alpha), all black."""
    a = np.array(img.convert("RGBA"))
    a[:, :, :3] = 0
    return Image.fromarray(a)


def restyle_labels(widget, scale, parent=None):
    """Every number in the panel: bigger, white, with a black outline, and still
    inside the icon it belongs to (the villagers per resource are drawn inside the
    resource's icon, which clips them)."""
    w = widget.get("Widget", widget)
    if w.get("Type") == "Label":
        # The age's name fills its bar already: same size, only the colors
        if parent is not None and parent.get("_type") == "ProgressBar":
            scale = 1
        for state in w.get("StateMaterials", {}).values():
            font = state.get("Font") if isinstance(state, dict) else None
            if font:
                font["PointSize"] = round(font.get("PointSize", 30) * scale)
                font["TextColor"] = {"r": 1, "g": 1, "b": 1, "a": 1}
                font["TextOutlineWidth"] = 0.08
                font["TextOutlineColor"] = {"r": 0, "g": 0, "b": 0, "a": 1}
        vp = w.get("ViewPort")
        if vp:
            # Room for the bigger text: grow the box, keeping its anchor point
            grow_w, grow_h = round(vp["width"] * (scale - 1)), round(vp["height"] * (scale - 1))
            vp["width"] += grow_w
            vp["height"] += grow_h
            if "Right" in w.get("TextAnchor", ""):
                vp["xorigin"] -= grow_w
            if parent and parent.get("width") and parent.get("height") and parent.get("_type") != "ProgressBar":
                vp["width"] = min(vp["width"], parent["width"])
                vp["height"] = min(vp["height"], parent["height"])
                vp["xorigin"] = max(0, min(vp["xorigin"], parent["width"] - vp["width"]))
                vp["yorigin"] = max(0, min(vp["yorigin"], parent["height"] - vp["height"]))
    for child in w.get("ChildWidgets", []):
        box = dict(w.get("ViewPort") or {}, _type=w.get("Type"))
        restyle_labels(child, scale, box if w.get("Type") in ("Base", "Button", "ProgressBar") else None)


def timer_with_black_box(panel):
    """The game clock ("00:03:50 (Normal - 1.7)"): a black box behind it."""
    box = {
        "Widget": {
            "Type": "Base",
            "Name": "OverlayModTimerBackground",
            "ViewPort": {"xorigin": -10, "yorigin": 0, "width": 640, "height": 52, "alignment": "TopLeft"},
            "StateMaterials": {"StateNormal": {"Material": "FlatColorWithAlpha", "Color": {"r": 0, "g": 0, "b": 0, "a": 1}}},
            "ChildWidgets": [],
        }
    }
    for w in panel["Collection"]["Widgets"]:
        W = w.get("Widget", w)
        if W.get("Name") != "WorldTimer":
            continue
        kids = W.setdefault("ChildWidgets", [])
        label = next((k for k in kids if k.get("Widget", {}).get("Name") == "WorldTimerLabel"), None)
        if label:
            b = copy.deepcopy(box)
            b["Widget"]["ViewPort"]["yorigin"] = label["Widget"]["ViewPort"].get("yorigin", 0) - 4
            kids.insert(kids.index(label), b)  # drawn first, so behind the text
    return panel


def build(ui, panel_layout, out):
    """Builds the mod into `out` from the game's widgetui folder `ui`.
    panel_layout: the resource panel layout (parsed JSON) to restyle, the one the
    player's game uses now."""
    shutil.rmtree(out, ignore_errors=True)
    panels_out = os.path.join(out, "widgetui/textures/ingame/panels")
    cultures = sorted(
        c for c in os.listdir(os.path.join(ui, "textures/ingame/panels")) if os.path.exists(os.path.join(ui, "textures/ingame/panels", c, "map-panel.png"))
    )

    if CONFIG["rings"]["enabled"]:
        for c in cultures:
            src = Image.open(os.path.join(ui, "textures/ingame/panels", c, "map-panel.png"))
            os.makedirs(os.path.join(panels_out, c), exist_ok=True)
            draw_rings(src, CONFIG["rings"]).save(os.path.join(panels_out, c, "map-panel.png"))

    if CONFIG["resource_bar"]["enabled"]:
        cfg = CONFIG["resource_bar"]
        for c in cultures:
            f = os.path.join(ui, "textures/ingame/panels", c, "resource-panel.png")
            if os.path.exists(f):
                os.makedirs(os.path.join(panels_out, c), exist_ok=True)
                black_like(Image.open(f)).save(os.path.join(panels_out, c, "resource-panel.png"))
        icons_out = os.path.join(out, "widgetui/textures/ingame/icons")
        os.makedirs(icons_out, exist_ok=True)
        for res, files in ICON_FILES.items():
            for name in files:
                f = os.path.join(ui, "textures/ingame/icons", name)
                if os.path.exists(f):
                    letter_icon(Image.open(f).size, cfg["letters"][res], cfg["letter_color"]).save(os.path.join(icons_out, name))
        for name in ("idle-villager_normal.png", "idle-villager_hover.png", "idle-villager_active.png", "idle-villager_disabled.png"):
            f = os.path.join(ui, "textures/ingame/icons", name)
            if os.path.exists(f):
                idle_icon(Image.open(f).size, "disabled" not in name).save(os.path.join(icons_out, name))
        for name in ("worldtimerpanel.json", "timerpanel.json"):
            f = os.path.join(ui, name)
            if os.path.exists(f):
                panel = timer_with_black_box(json.load(open(f, encoding="utf-8-sig")))
                with open(os.path.join(out, "widgetui", name), "w", encoding="utf-8") as fh:
                    json.dump(panel, fh, indent=2)
        styled = copy.deepcopy(panel_layout)
        for w in styled["Collection"]["Widgets"]:
            restyle_labels(w, cfg["font_scale"])
        with open(os.path.join(out, "widgetui/resourcepanel.json"), "w", encoding="utf-8") as fh:
            json.dump(styled, fh, indent=2)

    info = {
        "Author": "Maximiliano Redigonda",
        "CacheStatus": 0,
        "Description": "Arabia 1v1 minimap rings inside and outside the TC spawn ring (safe scouting paths), "
        "and a black resource bar with letters and big numbers. Made by the AoE2 Civs Overlay project.",
        "Title": MOD_TITLE,
    }
    json.dump(info, open(os.path.join(out, "info.json"), "w"), indent=2)
    # Thumbnail: the WEST minimap with the rings
    if CONFIG["rings"]["enabled"]:
        Image.open(os.path.join(panels_out, "WEST", "map-panel.png")).convert("RGB").save(os.path.join(out, "thumbnail.jpg"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", help="the AoE2DE folder")
    ap.add_argument("--mods", help="the profile's mods folder (has mod-status.json)")
    ap.add_argument("--install", action="store_true", help="copy into <mods>/local")
    args = ap.parse_args()

    if args.game:
        game, mods = args.game, args.mods
    else:
        users, game = find_game()
        mods = args.mods or find_mods(users)
    ui = os.path.join(game, "widgetui")
    out = os.path.join(HERE, "dist", MOD_TITLE)
    # The layout you have now (a UI mod's, if one is on), restyled
    base = enabled_base(mods, "widgetui/resourcepanel.json") or os.path.join(ui, "resourcepanel.json")
    build(ui, json.load(open(base, encoding="utf-8-sig")), out)
    print("resource bar layout from:", base.split("/mods/")[-1] if "/mods/" in base else "the game")
    print("built:", os.path.relpath(out))

    if args.install:
        if not mods:
            sys.exit("Didn't find the mods folder; pass --mods")
        dest = os.path.join(mods, "local", MOD_TITLE)
        shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(out, dest)
        print("installed:", dest)
        enable_on_top(mods)


def enable_on_top(mods):
    """Turns the mod on, above every other mod (so its files win), in mod-status.json.
    The game must be closed; the previous file is kept as mod-status.json.bak."""
    f = os.path.join(mods, "mod-status.json")
    shutil.copy2(f, f + ".bak")
    status = json.load(open(f, encoding="utf-8-sig"))
    path = "local//" + MOD_TITLE
    others = sorted((m for m in status["Mods"] if m.get("Path") != path), key=lambda m: m.get("Priority", 999))
    for i, m in enumerate(others, start=2):
        m["Priority"] = i
    ours = {
        "CheckSum": "0",
        "Enabled": True,
        "LastUpdate": "0",
        "Path": path,
        "Priority": 1,
        "PublishID": 0,
        "Title": MOD_TITLE,
        "WorkshopID": 0,
    }
    status["Mods"] = [ours] + others
    with open(f, "w", encoding="utf-8") as fh:
        json.dump(status, fh, indent=2)
    print("enabled first in mod-status.json (backup: mod-status.json.bak)")


if __name__ == "__main__":
    main()
