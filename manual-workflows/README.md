# Manual Workflows

This sub-folder is meant to store processes that have to be manually performed.

## Civs Info

From a literal copy-paste of the data in: https://ageofempires.fandom.com/wiki/Civilization_(Age_of_Empires_II)

We can then parse it using ./parse-civs-from-pasted.js, and that will produce the civ data as a JSON.

Each civilization will contain a key for each of the following fields:

-   code
-   name
-   focus
-   teamBonus
-   uniqueUnits
-   uniqueTechnologies
-   civilizationBonuses
