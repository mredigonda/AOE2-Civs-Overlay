# Manual Workflows

This sub-folder is meant to store processes that have to be manually performed.

## Civs Info

Source: https://ageofempires.fandom.com/wiki/Civilization_(Age_of_Empires_II)

To refresh the data after a patch or a new DLC:

```bash
node src/manual-workflows/fetch-civs-from-fandom.js
node src/manual-workflows/parse-civs-from-pasted.js
git diff ui/civ-info.json
```

`fetch-civs-from-fandom.js` downloads the page and writes it as plain text to
`copy-paste-from-fandom.txt` (what a manual copy-paste of the page gives, cleaned up).
`parse-civs-from-pasted.js` turns that text into `ui/civ-info.json`. If a new civilization
shows up, the parser stops and asks for its code in `civCodes`. Read the `git diff` before
committing: it is the list of what changed in the game.

Each civilization will contain a key for each of the following fields:

-   code
-   name
-   focus
-   teamBonus
-   uniqueUnits
-   uniqueTechnologies
-   civilizationBonuses
-   wonder
-   uniqueBuildings (only some civs)
-   otherTechnologies (only some civs, e.g. the Khitans' Pasture technologies)
