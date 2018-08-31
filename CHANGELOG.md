## Change Log

The history of changes to the extension.

### Version 1.14.2 (August 31st, 2018)
- Fixed a bug where item filters would be reprocessed spuriously, often twice in a row.
- Fixed an issue where closing an unsaved item filter would cause diagnostics to stick around within the editor.
- When autocompleting a file path for the `CustomAlertSound` rule, only `mp3` and `wav` files will be shown.
- Updated the `MinimapIcon` images using data from the official client, making them identical to what you will see in-game.
- Trailing text for the follow rules is no longer considered an error: `CustomAlertSound`, `CustomAlertSound`, and `PlayEffect`.
- Trailing text for the `DisableDropSound` rule is now reported as a hint, rather than a warning.
- Added the missing `of Conflagrating` affix for the `HasExplicitMod` rule.
- Duplicate values for the `Class` and `BaseType` rule are now reported as hints, rather than warnings.

### Version 1.14.1 (August 30th, 2018)
This release focuses on fixing errors within our data, further increasing support for the popular community item filters.

- The `Class` rule will no longer report multiple issues if only one value is provided and that value is invalid.
- Added all of the Essence affixes to the `HasExplicitMod` rule.
- Added all of the abyss jewel affixes to the `HasExplicitMod` rule.
- Fixed all typos within the existing mods for the `HasExplicitMod` rule.
- Renamed the `Razor Sharp` mod to its correct name of `Razor-sharp`.
- Renamed the `Leaguestone` item class to its correct name of `Leaguestones`.
- The `Offering to the Goddess` base type now has the correct item class of `Map Fragments`.
- The `Diamond Flask` base type now has the correct item class of `Critical Utility Flasks`.
- Added the missing `Harbinger Map` item base.
- Removed the following invalid item bases: `Event Coin` and `Event Shard`.

### Version 1.14.0 (August 30th, 2018)
This release finalizes our support for the new rule types being added in Path of Exile version 3.4, as we also improve our support for the popular community item filters.

- Added several missing base types for the `Delve Socketable Currency` item class.
- The value for the `LinkedSockets` rule can no longer be `0`, as it is misleading and works differently than expected in-game.
- The `DisableDropSound` rule no longer takes a boolean as a parameter.
- Added support for multiple values to the following rules: `ItemLevel`, `DropLevel`, `GemLevel`, `Quality`, `StackSize`, `Rarity`, `Sockets`, `LinkedSockets`, `SocketGroup`, `Height`, `Width`, and `MapTier`.
  + Multiple values are only allowed when the equals operator is used, as using other operators with multiple values makes little sense. When no operator is provided, the equals operator is implicit.
  + As a side effect, each of these rules now supports quoted values, same as the Path of Exile client.
- Errors were cascading for several rule types, such as `CustomAlertSound` and `SetBorderColor`. The validation code no longer reports multiple errors in these cases, instead returning only the first error.
- Corrected several minor spacing issues within the diagnostic messages.
- On Windows, the custom sound provided to the `CustomAlertSound` rule can now be previewed, through the same editor decorations used by the `PlayAlertSound` rule, within the editor.
- On Windows, there is now autocompletion for the file name or file path value of the `CustomAlertSound` rule.
  + As previously mentioned, the `item-filter.windowsDocumentFolder` configuration variable can be used to set your documents folder in the event that the educated guess doesn't work on your system.

### Version 1.13.0 (August 30th, 2018)
This release improves our support for the new rule types being added in Path of Exile version 3.4, as we also fix issues stemming from incorrect information in GGG's item filter information post.

- The tooltip hover for all values of the `MinimapIcon` rule now includes a preview if there were no validation errors.
- Fixed the autocompletion behavior for the following rules: `MinimapIcon` and `PlayEffect`.
- On Windows, the file name or file path provided to the `CustomAlertSound` rule is now verified to exist on your system. This can be turned off by setting `item-filter.verifyCustomSounds` to false.
  + Note that this takes an educated guess as to the location of your documents folder, which can sometimes fail. The `item-filter.windowsDocumentFolder` configuration variable allows you to set it manually.
- Renamed the `Delve Stackable Currency` class to its correct name of `Delve Socketable Currency`.

### Version 1.12.0 (August 29th, 2018)
- Added the initial support for Path of Exile version 3.4 and the Delve league.
- Added basic support for the four new rules: `CustomAlertSound`, `MinimapIcon`, `PlayEffect`, and `MapTier`.
- Stopped using the language server protocol, instead utilizing the VSCode API directly, reducing the memory usage of the extension by around 30 MB.
- Added the missing `Avian Slippers` item base.
- The value for the `SetFontSize` rule can now fall in the range of `[16,50]`, rather than `[18,45]`.

### Version 1.11.0 (July 5th, 2018)
- Added all new uniques from Path of Exile version 3.3.
- Added approximately 50 missing affixes for the `HasExplicitMod` rule.

### Version 1.10.2 (June 1st, 2018)
- The `DisableDropSound` rule no longer requires a value.

### Version 1.10.1 (May 30th, 2018)
- Cleared up minor confusion regarding the `StackSize` rule.

### Version 1.10.0 (May 30th, 2018)
- The `HasExplicitMod` rule now takes multiple string values.
- The `HasExplicitMod` rule can now appear up to 6 times in each block.
- Added a new configuration variable: `item-filter.limitedModPool`. This variable allows you to choose between two sets of valid values for the HasExplicitMod rule, with one set containing all explicit mods in the game and the other containing only the mods from the Warbands and Incursion leagues. When set to true, the latter set will be used.
- Fixed a syntax error within the language configuration file.
- Improved the consistency for hover results, with there now being a separator for hovers providing additional information.
- Fixed a bug where issues regarding the rule limitations on each block were not being reported.

### Version 1.9.0 (May 30th, 2018)
- Renamed the `HasMod` rule to the *hopefully* correct name of `HasExplicitMod`.
- Added validation for the value of the `HasExplicitMod` rule.
- Added autocompletion for the value of the `HasExplicitMod` rule.
- Added a new configuration variable: `item-filter.modWhitelist`. This variable allows values to be whitelisted for the `HasExplicitMod` rule.
- Added a new configuration variable: `item-filter.modQuotes`. This variable allows you to set whether all values for the `HasExplicitMod` will be surrounded by quotation marks on autocompletion.

If you find any mods that are missing from the extension, then an issue report would be helpful.

### Version 1.8.0 (May 30th, 2018)
- Added the initial support for Path of Exile version 3.3 and the Incursion league.
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
