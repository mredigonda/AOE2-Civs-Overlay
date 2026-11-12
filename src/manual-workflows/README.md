# Civilization data

`ui/data/*.json` holds one file per language option of the overlay, all with the same
shape (`{ source, labels?, civs: [...] }`, each civ with `code`, `name`, `nameEn`, `focus`,
`civilizationBonuses`, `uniqueUnits`, `uniqueTechnologies`, `teamBonus`, and some with
`wonder`, `uniqueBuildings`, `otherTechnologies`). The `code` is the same in every file
(see `lib.js`), so the civs you picked survive a language change.

To refresh everything after a patch or a new DLC:

```bash
npm run civs:refresh
git diff --stat ui/data
```

Read the diff before committing: it is the list of what changed in the game. A new
civilization stops the scripts and asks for its code in `civCodes` (`lib.js`).

| File | Script | Source |
|---|---|---|
| `en-fandom.json` | `fetch-civs-from-fandom.js`, then `parse-civs-from-pasted.js` | [English Fandom](https://ageofempires.fandom.com/wiki/Civilization_(Age_of_Empires_II)): the most exact numbers |
| `game-<lang>.json` (17 languages) | `fetch-civs-from-game.js` | The game's own strings, via [aoe2techtree](https://github.com/SiegeEngineers/aoe2techtree) (MIT): official names, always current |
| `tree.json`, `ui/img/tree/` | `fetch-civs-from-game.js` (with `tech-tree.js`) | aoe2techtree's per-civ tech trees: what each civ lacks, line by line, and the icons for it |
| `es-fandom.json` | `fetch-civs-from-fandom-es.js` (after the game script) | [Spanish Fandom](https://ageofempires.fandom.com/es/), one page per civ |

What each source is good for:

- **Game text**: official names in every language and always up to date. Each
  unique unit gets its own help text (what it is, strong and weak against). It leaves out
  some exact numbers: e.g. Ordo Cavalry "regenerates HP in combat" where the Fandom says
  "150% hit points per minute".
- **English Fandom**: exact numbers, kept up to date by its editors.
- **Spanish Fandom**: as detailed as the English one on most pages, but a few lag behind
  the game (in November 2026: the Bohemians' Wagenburg Tactics still said 15% instead of
  10%, the Byzantines' Logistica +6 attack vs infantry) and a few pages miss a bonus.

The tech tree lines (which units and techs each line has, regional replacements such
as the Mounted Crossbowman for the Cavalry Archer, unique replacements such as the Winged
Hussar) are in `tech-tree.js`.

The icons are Age of Empires II art, © Microsoft, used under Microsoft's
[Game Content Usage Rules](https://www.xbox.com/en-US/developers/rules) for free fan
tools, as aoe2techtree.net does.
