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

## Follow a build order

**📜** in the bar switches to build orders (**🏛** goes back to the civs).

-   **Add one**: on [buildorderguide.com](https://buildorderguide.com), open a build and
    click **Copy to clipboard for RTS Overlay**, then paste it anywhere on the overlay
    (or in the box under **+**). Any build order in
    [RTS Overlay](https://github.com/CraftySalamander/RTS_Overlay)'s AoE2 format works,
    one or a list of them. Pasting the same build again replaces it.
-   **Each step** shows the villager count and where they work, with the change from the
    previous step in green (**+3** wood: that's where the new villagers go), the age-up
    when there is one, the notes with the game's icons, the time it should be done by,
    and the next step underneath.
-   **In game**, without leaving it: **`Ctrl+Alt+]`** next step, **`Ctrl+Alt+[`**
    previous, **`Ctrl+Alt+\`** starts or pauses the timer (**`Cmd+Alt`** on macOS). With
    the overlay focused, → ← and Space do the same.
-   **The timer** runs in game time (the game's Normal speed is 1.608× real time, RTS
    Overlay's measure) and moves to each step when its time comes. Builds without times
    get them estimated from villager production, age-ups and Town Center techs (marked
    "~"). If you're ahead or behind, ] and [ move the timer to that step.
-   **Civ-aware**: the list puts the builds for your civ first, picking a build for one
    civ picks that civ if you hadn't, and a build for another civ says so, with a button
    to switch.

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
-   `ui/build-order.js`: reading, timing and civ-matching build orders (no DOM, tested
    by `npm test`). `ui/img/bo/` are RTS Overlay's AoE2 icons, at the paths build orders
    name them; `src/manual-workflows/fetch-bo-icons.js` downloads them again.
-   `src-tauri/`: the Rust side: the window, the global shortcuts, resizing the window
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

The build order format, its timing estimate and the icons in `ui/img/bo/` come from
[RTS Overlay](https://github.com/CraftySalamander/RTS_Overlay) (GPL-3.0) by
CraftySalamander.

The game icons in `ui/img/tree/` and `ui/img/bo/` and the civilization texts taken from the game are Age of
Empires II content, © Microsoft Corporation, used under Microsoft's
[Game Content Usage Rules](https://www.xbox.com/en-US/developers/rules); they are not
covered by the GPL. AoE2 Civs Overlay is not endorsed by or affiliated with Microsoft.
