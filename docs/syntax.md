A cheat sheet providing information on the syntax of an item filter.

## Blocks
Keyword | Trailing Comment
--- | ---
Show | Yes
Hide | Yes

## Filter Rules
Keyword | Operator | Values | Case Sensitive
--- | --- | --- | ---
ItemLevel | All | Multiple integers in the [0-100] range. | No
DropLevel | All | Multiple integers in the [0-100] range. | No
GemLevel | All | Multiple integers in the [0-30] range. | No
Quality | All | Multiple integers in the [0-30] range. | No
StackSize | All | Multiple integers in the [1-1000] range. | No
Rarity | All | Multiple of the following strings: Normal, Magic, Rare, Unique. | Yes
Class | Equality | Multiple strings from the list of Classes. | Yes
BaseType | Equality | Multiple strings from the list of Bases. | Yes
HasExplicitMod | Equality | Multiple strings from list of Mods. | Yes
Sockets | All | Multiple integers in the [0-6] range. | No
LinkedSockets | All | Multiple integers in the [2-6] range or 0 itself. | No
SocketGroup | Equality | Multiple strings consisting only of the *r, g, b, w* characters. | No
Height | All | Multiple integers in the [1-4] range. | No
Width | All | Multiple integers in the [1-2] range. | No
Identified | Equality | True or False. | No
Corrupted | Equality | True or False. | No
ElderItem | Equality | True or False. | No
ShaperItem | Equality | True or False. | No
ShapedMap | Equality | True or False. | No
ElderMap | Equality | True or False. | No

## Action Rules
Keyword | Operator | Values | Trailing Comment | Case Sensitive
--- | --- | --- | --- | --- |
SetBorderColor | Equality | 3-4 integers in the [0-255] range. | Yes | N/A
SetTextColor | Equality | 3-4 integers in the [0-255] range. | Yes | N/A
SetBackgroundColor | Equality | 3-4 integers in the [0-255] range. | Yes | N/A
PlayAlertSound | Equality | A Word or an integer in the [1-16] range, followed by an optional integer in the [0-300] range. | Yes | Yes
PlayAlertSoundPositional | Equality | A Word or an integer in the [1-16] range, followed by an optional integer in the [0-300] range. | Yes | Yes
SetFontSize | Equality | An integer in the [16-50] range. | No | N/A
DisableDropSound | Equality | An optional True or False. | ??? | No

> String: a value that can optionally be surrounded by quotation marks, possibly multiple words.

> Word: a single word that cannot be surrounded by quotation marks.

## Notes

- The word value for either `PlayAlertSound` or `PlayAlertSoundPositional` must *not* be surrounded by quotation marks.
- Rules taking multiple values get weird when combined with most operators, so we simply disallow multiple values when the operator is anything except equals.
