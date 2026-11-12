# Age of Empires II Civilization Overlay

An always-on-top overlay with the bonuses, unique units and technologies of your
civilization and your rival's, for Age of Empires II: Definitive Edition. One shortcut
shows it, type a few letters to pick a civ, Esc hides it again.

Built with [Tauri](https://tauri.app) (Rust + the system's web view), so it is a few
MB and starts instantly. Version 1 was an Electron app.

## Use it

-   **`Ctrl+Alt+``** (Windows) / **`Cmd+Alt+``** (macOS): show or hide the overlay.
-   Type part of a civ's name or code (`byz`, `BYZ`), arrows to move, Enter to pick.
    Picking your civ moves to the rival's box.
-   **Esc**: closes the list, or hides the overlay.
-   **⚙**: turn the rival column and each section (bonuses, unique units, team bonus,
    Wonder…) on or off. Settings and the last civs picked are remembered.
-   Drag it by the **⋮⋮** handle.

On Windows, run the game in "Full Desktop" (Options → Graphics → Display Mode) so the
overlay can stay on top of it.

## Develop

Needs Node 22 (`.nvmrc`) and Rust (`rustup`).

```bash
npm install
npm run dev
```

`npm run build` makes the installers for the OS it runs on (a `.app`/`.dmg` on macOS;
an `.exe`/`.msi` must be built on Windows).

-   `ui/`: the page (plain HTML/CSS/JS, no build step) and `civ-info.json`.
-   `src-tauri/`: the Rust side: the window, the global shortcut, resizing the window
    to its content.

## Civilization data

`ui/civ-info.json` comes from the
[Fandom wiki](https://ageofempires.fandom.com/wiki/Civilization_(Age_of_Empires_II)).
After a patch or a new DLC:

```bash
npm run civs:refresh
git diff ui/civ-info.json
```

See [src/manual-workflows/README.md](src/manual-workflows/README.md).
