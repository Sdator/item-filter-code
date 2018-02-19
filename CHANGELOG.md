## Change Log

The history of changes to the extension.

### Version 1.2.0 (February 20th, 2018)
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
