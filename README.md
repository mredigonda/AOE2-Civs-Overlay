# Age of Empires II Civilization Overlay

An always-on-top overlay with the bonuses, unique units and technologies of your
civilization and your rival's, for Age of Empires II: Definitive Edition. One shortcut
shows it, type a few letters to pick a civ, Esc hides it again.

Built with [Tauri](https://tauri.app) (Rust + the system's web view), so it is a few
MB and starts instantly. Version 1 was an Electron app.

## Install

**Download it from https://mredigonda.github.io/AOE2-Civs-Overlay/** (Windows, macOS and
Linux; about 5 MB; no admin rights needed; it updates itself).

The installers are **not code-signed**, so the first time Windows or macOS warns you
that it doesn't know the publisher. That's expected, and it's a one-time step. (Signing
would cost about USD 320–540 a year for a free project: a Windows code signing certificate
is USD 220–440 a year and needs a hardware token, and Apple's Developer Program is USD 99
a year.)

-   **Windows**: "Windows protected your PC" → click **More info** → **Run anyway**.
-   **macOS**: "cannot be opened" → click **Done** → **System Settings → Privacy &
    Security** → **Open Anyway**, and confirm with your password.
-   **Linux** (experimental): make the AppImage executable (`chmod +x`) and run it, or
    install the `.deb`.

It doesn't read the game's memory or touch its files, so it can't get you banned, and
it only connects to GitHub to check for its own updates. Every installer is built by
GitHub Actions from this repository, with a build attestation
(`gh attestation verify <file> -R mredigonda/AOE2-Civs-Overlay`).

## Use it

-   **`Ctrl+Alt+``** (Windows) / **`Cmd+Alt+``** (macOS): show or hide the overlay.
-   Type part of a civ's name or code (`byz`, `BYZ`), arrows to move, Enter to pick.
    Picking your civ moves to the rival's box.
-   **Esc**: closes the list, or hides the overlay.
-   **⚙**: turn the rival column and each section (bonuses, unique units, team bonus,
    Wonder…) on or off. Settings and the last civs picked are remembered.
-   Drag it by the **⋮⋮** handle.
-   **Tech tree**, under each civ's name, in the game's icons: for each unit line with
    gaps, its best unit and then what it lacks, crossed out (no Arbalester, no Bracer,
    no Bloodlines…), after a ★ row with its unique units; lines the civ doesn't have at all in one crossed-out row; complete
    lines in a row with a ✓. Hover an icon for its name. ⚙ picks which lines count:
    army (default), economy, defense, navy.
-   **Language** (in ⚙): English or Spanish from the Fandom wikis (the most detail), or
    the game's own text in any of its 17 languages, with the official names.

On Windows, run the game in "Full Desktop" (Options → Graphics → Display Mode) so the
overlay can stay on top of it.

## Develop

Needs Node 22 (`.nvmrc`) and Rust (`rustup`).

```bash
npm install
npm run dev
```

`npm run build` makes the installers for the OS it runs on. Releases are built for all
three systems by `.github/workflows/release.yml`: bump the version in
`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `package.json`, then
`git tag v<version> && git push origin v<version>`; it leaves a draft release to check
and publish. The updater key's private half lives in the repo secret
`TAURI_SIGNING_PRIVATE_KEY` (and in `~/.tauri/aoe2-civs-overlay.key` on the maintainer's
machine); losing it means existing installs can't auto-update.

The download page is `site/`, published to GitHub Pages by
`.github/workflows/pages.yml`.

-   `ui/`: the page (plain HTML/CSS/JS, no build step) and the civ data (`ui/data/`).
-   `src-tauri/`: the Rust side: the window, the global shortcut, resizing the window
    to its content.

## Civilization data

`ui/data/` has one file per language option: the English and Spanish Fandom wikis and
the game's own text in 17 languages. After a patch or a new DLC:

```bash
npm run civs:refresh
git diff --stat ui/data
```

See [src/manual-workflows/README.md](src/manual-workflows/README.md).

## License

[GPL-3.0](LICENSE) © Maximiliano Redigonda: you can use, study, share and change it, but
any copy or modified version you distribute must keep this license and the credit, and
publish its source.

The game icons in `ui/img/tree/` and the civilization texts taken from the game are Age of
Empires II content, © Microsoft Corporation, used under Microsoft's
[Game Content Usage Rules](https://www.xbox.com/en-US/developers/rules); they are not
covered by the GPL. AoE2 Civs Overlay is not endorsed by or affiliated with Microsoft.
