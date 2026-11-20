# AoE2 Overlay Mod (game mod)

A mod for Age of Empires II: DE, made from the game's own files by `build.py`. It's the
place for everything that is better done inside the game than in the overlay.

## What it does

- **Minimap rings for Arabia 1v1.** Town Centers spawn on a ring around the map's
  center ("TC Orbit Green" draws that ring). This mod draws two rings instead, one 6
  tiles inside it and one 6 tiles outside, so clicking along either of them on the
  minimap sends your scout around the enemy TC instead of into it. The spawn ring
  stays as a thin dotted line between them. The minimap is a 2:1 diamond, so the
  rings are ellipses. Every culture's minimap frame gets them (all 11, Greek and
  Persian included).
- **Black resource bar.** Black background, a letter in the corner of each resource's
  icon instead of its picture (W wood, F food, G gold, S stone, V villagers/population),
  with the villagers working it below the letter, and bigger white numbers with a black
  outline. The idle villagers button is black, and a red block when someone is idle.
- **Black box behind the game clock** ("00:03:50 (Normal - 1.7)"). It keeps the layout of the UI mod you have on (now
  "[AllYourBase] Maximum Advantage UI"), only restyled. Besides being easy to read,
  it makes the numbers trivial for the overlay to read off the screen later.

Both are switches in `CONFIG` at the top of `build.py`, with the ring sizes in tiles.

## Build and install

```bash
python3 -I game-mod/build.py --install
```

With the game closed. It reads the game from the Porting Kit (Wineskin) install in
`/Applications`, builds `game-mod/dist/AoE2 Overlay Mod/` and copies it to the profile's
`mods/local/`, then turns it on above every other mod in `mods/mod-status.json`
(keeping the previous one as `mod-status.json.bak`), so its files win over other mods'.
Without `--install` it only builds.

## On Windows (from the Mac, over the home network)

```bash
python3 -I game-mod/serve.py
```

serves a page at `http://<this Mac's IP>:8765` (the script prints it). On the Windows
PC, open it, download `install-aoe2-overlay-mod.bat` and double-click it with the game
closed. The installer (`windows/install-aoe2-overlay-mod.bat`, PowerShell inside a
`.bat` so a double-click runs it):

1. finds the profile's mods folder (`%USERPROFILE%\Games\Age of Empires 2 DE\<id>\mods`)
   and, through Steam, the game;
2. sends the Mac the list of mods and the resource bar layout in use there (the
   highest enabled mod's `resourcepanel.json`, or the game's) with the screen size;
3. gets back the mod built for that layout, installs it in `mods\local` and turns it
   on first in `mod-status.json` (keeping `mod-status.json.bak`);
4. tells the Mac how it went.

5. if the Mac has a Windows build of the overlay, downloads it, puts it in
   `%LOCALAPPDATA%\AoE2 Civs Overlay` (where its installer would, so it replaces an
   installed one) with a Start menu shortcut, and starts it.

The overlay for Windows is built on this Mac, cross-compiled, in about a minute:

```bash
game-mod/build-windows-overlay.sh
```

(one-time setup in the script). It's one self-contained `.exe`; the server serves the
newest one. Its "Send to the Mac" button posts the screen and what it read to the
server, saved in `game-mod/reports/captures/`.

The Mac keeps each run's report and log in `game-mod/reports/` (not in git). The
textures come from the Mac's copy of the game, the same files as on Windows.

`build.py` also runs on Windows by itself (it finds the Steam game, the mods and Arial
Bold there), with Python 3, Pillow and numpy: `py -I game-mod\build.py --install`.

## How it works

The game's interface is files in `widgetui/`: JSON layouts (`resourcepanel.json`: each
number's position, font size, color and outline) and PNG textures (the panels, per
culture, and the icons). A mod replaces any of them by having a file at the same path;
the enabled mod highest in the list wins.

## Ring geometry

On the minimap image (`map-panel.png`, 860 x 413 px), the minimap is the black diamond,
about 684 x 371 px. Its half-width is the map's half-diagonal: 60·√2 ≈ 84.9 tiles on a
120 x 120 map. TC Orbit's ring measures 162.5 px of 342.5 px across, so ≈ 40 tiles from
the center, and its center sits 5.5 px left of and 3 px below the diamond's; ours
follow both, since that circle is tested in game. To be checked in a game: whether the
rings line up with real Town Centers, and whether 6 tiles is enough room.
