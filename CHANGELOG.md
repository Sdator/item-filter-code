## Change Log

The history of changes to the extension.

### Version 1.10.0 (TBD)
- Added a new configuration variable: 'item-filter.limitedModPool'. This variable allows you to choose between two sets of valid values for the HasExplicitMod rule: one containing all explicit mods in the game and one containing only mods from the Warbands and Incursion leagues. When set to false, the former will be used.

### Version 1.9.0 (May 30th, 2018)
- Renamed the `HasMod` rule to the *hopefully* correct name of `HasExplicitMod`.
- Added validation for the value of the `HasExplicitMod` rule.
- Added autocompletion for the value of the `HasExplicitMod` rule.
- Added a new configuration variable: `item-filter.modWhitelist`. This variable allows values to be whitelisted for the `HasExplicitMod` rule.
- Added a new configuration variable: `item-filter.modQuotes`. This variable allows you to set whether all values for the `HasExplicitMod` will be surrounded by quotation marks on autocompletion.

If you find any mods that are missing from the extension, then an issue report would be helpful.

### Version 1.8.0 (May 30th, 2018)
- Added the initial support for Patch of Exile version 3.3 and the Incursion league.
  + As with every major Path of Exile release, the new unique items will be added to the extension
  once all have been discovered.
- Added support for the new `GemLevel` rule.
- Added support for the new `StackSize` rule.
- Added basic support for the new `HasMod` rule.
  + Autocompletions for explicit mods will be added soon.
- Added the two uniques from Path of Exile v3.2.2: Gluttony and Chains of Command.
- Both the completion provider and hover provider now take into account the previously entered values on the line.
- The hover provider has been expanded upon, with all values except for colors now having a tooltip.
- Rules taking a boolean value, such as the Corrupted rule, now properly report trailing text as an error.
- The double quotation mark character is now automatically closed within item filters.
- Completion suggestions will now be provided immediately upon entering a double quotation mark.
- Bosses now go by their shorthand names in order to minimize clutter within the hover tooltips.
- Quality rules can now have a value up to a maximum of 30, up from 20.
- Rarity rule values now behave similarly to other string values.
- The values for boolean rules, such as Corrupted, now behave similarly to other string values.
- Several new configuration variables have been added in order to control the automatic insertion of quotation marks when autocompleting values.
  + Note that the identifier for sound rules, such as PlayAlertSound, cannot be surrounded by quotation marks, as that is an error within the game.
- Updated from the proposed color picker API to the officially released API.
  + Visual Studio Code 1.20.0 (released in January of 2018) or newer is now required by the extension.
- Both the `Quality` rule and the `Rarity` rule can now be used twice within a block.

### Version 1.7.0 (March 15th, 2018)
- Added support for the new DisableDropSound rule.
- Fixed a performance oversight, resulting in a 5x speedup when parsing large item filters.

### Version 1.6.0 (March 7th, 2018)
- Added support for the new `Necromancy Net` base type.
- Modified the extra suggestion for `Net` to include the new net.
- Added all but one of the new unique items from patch 3.2 and the Bestiary league.

### Version 1.5.0 (March 4th, 2018)
- Added support for the unannounced `ElderMap` rule.

### Version 1.4.2 (February 28th, 2018)
- Fixed a typo for the "Bestiary Orb" base type.
- Added extra suggestions for Bestiary nets to the completion provider, with "Bestiary Nets" being an alias for all 10 nets.

### Version 1.4.1 (February 28th, 2018)
- Renamed "Elder Orb" to "Elder's Orb".

### Version 1.4.0 (February 28th, 2018)
- Added support for both patch 3.2 and the Bestiary challenge league.
  + New unique items will be added soon after launch once all are discovered.

### Version 1.3.0 (February 21st, 2018)
- Added a brief description to each keyword on hover.
- Added hover information to item class values.
- Added more details to the hover for item base values, particularly when partially matching.
- Added extra item classes and item bases to the completion suggestions.
  + Some completion entries will insert multiple values, such as the `Mortal Set` for the BaseType rule.
- Breachstones now have the correct item class, which is `Map Fragments`.

### Version 1.2.0 (February 19th, 2018)
- Hovering over item bases within the editor will now show both the item class and the unique items specific to that base.
- Added support for playing sound on MacOS through the system binary `afplay`.
- Added support for enabling sound on Linux through configuration variables. See the details section for more information.

### Version 1.1.0 (February 18th, 2018)
- Sound identifiers now have a border decoration within the editor.
- Windows users can now play sounds by hovering over sound identifiers.
- Added several partial item bases to the autocompletion results.
- Class rules that proceed a BaseType rule are now always used when determining whether or not each item base is valid.
- Fixed an unhandled promise rejection relating to invalid or whitelisted keywords.

### Version 1.0.1 (February 15th, 2018)
- A valid color will now be inserted automatically whenever autocompleting a color rule.

### Version 1.0.0 (February 15th, 2018)
- Diagnostics added to the language server.
- Color provider added to the language server.

### Version 0.2.0 (February 13th, 2018)

- Item data added to the project.
- A basic language server has been added to the project.
- Autocompletion support added.
- Whitelist configuration variables added, allowing you to provide additional rule keywords, item classes, item bases, and sound identifiers to the server.
- Added two other configuration variables, Performance Hints and Always Show Alpha, that will be utilized soon.

### Version 0.1.0 (February 8th, 2018)

- The initial version.
- Grammar for item filters added.
