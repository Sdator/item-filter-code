## GGG Item Filter Syntax Cheat Sheet

A cheat sheet providing information on the syntax of an item filter. Note that this document only aims to provide a bird's eye view on the syntax. For a complete, fully accurate data representation of the item filter syntax, see the [GGG.json](https://github.com/GlenCFL/item-filter-code/blob/master/build/data/parsers/GGG.json) parser input file.

---

### Blocks
Keyword | Operator | Parameters | Trailing Text
--- | --- | --- | ---
Show | None | None | Ignored
Hide | None | None | Ignored

### Filter Rules
Keyword | Operator | Parameters | Trailing Text
--- | --- | --- | ---
ItemLevel | All | Ranging [0-100] Values | Impossible
DropLevel | All | Ranging [0-100] Values | Impossible
GemLevel | All | Ranging [1-30] Values | Impossible
Quality | All | Ranging [0-100] Values | Impossible
StackSize | All | Ranging [1-1000] Values | Impossible
MapTier | All | Ranging [1-17] Values | Impossible
Rarity | All | Rarity Values | Impossible
Class | None | Class Values | Impossible
BaseType | None | Base Values | Impossible
HasExplicitMod | None | Mod Values | Impossible
Sockets | All | Ranging [0-6] Values | Impossible
LinkedSockets | All | Ranging [2-6] Values | Impossible
SocketGroup | None | Socket Group Values | Impossible
Height | All | Ranging [1-4] Values | Impossible
Width | All | Ranging [1-2] Values | Impossible
Identified | None | Boolean Values | Impossible
Corrupted | None | Boolean Values | Impossible
ElderItem | None | Boolean Values | Impossible
ShaperItem | None | Boolean Values | Impossible
ShapedMap | None | Boolean Values | Impossible
ElderMap | None | Boolean Values | Impossible

### Action Rules
Keyword | Operator | Parameters | Trailing Text
--- | --- | --- | ---
SetBorderColor | None | 3-4 Ranging [0-255] Values | Ignored
SetTextColor | None | 3-4 Ranging [0-255] Values | Ignored
SetBackgroundColor | None | 3-4 Ranging [0-255] Values | Ignored
PlayAlertSound | None | Sound Identifier, Ranging [0-300] Value | Ignored
PlayAlertSoundPositional | None | Sound Identifier, Ranging [0-300] Value | Ignored
CustomAlertSound | Ignored | File Path | Ignored
SetFontSize | None | Font Size | Error
DisableDropSound | None | None | Ignored
MinimapIcon | None | Ranging [0-2] Value, Effect Color, Shape | Error
PlayEffect | None | Effect Color, Effect Modifier | Error
