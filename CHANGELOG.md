## Change Log

The history of changes to the extension.

### Version 1.5.0 (Match 4th, 2018)
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
- Class rules that proceed a BaseType rule are now always used when determining
  whether or not each item base is valid.
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
