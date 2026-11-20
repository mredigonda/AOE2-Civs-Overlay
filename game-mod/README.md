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
- **Black resource bar.** Black background, a letter instead of each resource's
  picture (W wood, F food, G gold, S stone, V villagers/population) and bigger white
  numbers with a black outline. It keeps the layout of the UI mod you have on (now
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
