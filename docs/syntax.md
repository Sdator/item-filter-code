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
MapTier | All | Multiple integers in the [1-17] range. | No
Rarity | All | Multiple of the following strings: Normal, Magic, Rare, Unique. | Yes
Class | Equals | Multiple strings from the list of Classes. | Yes
BaseType | Equals | Multiple strings from the list of Bases. | Yes
HasExplicitMod | Equals | Multiple strings from list of Mods. | Yes
Sockets | All | Multiple integers in the [0-6] range. | No
LinkedSockets | All | Multiple integers in the [2-6] range. | No
SocketGroup | Equals | Multiple strings consisting only of the *r, g, b, w* characters. | No
Height | All | Multiple integers in the [1-4] range. | No
Width | All | Multiple integers in the [1-2] range. | No
Identified | Equals | True or False. | No
Corrupted | Equals | True or False. | No
ElderItem | Equals | True or False. | No
ShaperItem | Equals | True or False. | No
ShapedMap | Equals | True or False. | No
ElderMap | Equals | True or False. | No

## Action Rules
Keyword | Operator | Values | Trailing Comment | Case Sensitive
--- | --- | --- | --- | --- |
SetBorderColor | Equals | 3-4 integers in the [0-255] range. | Yes | No
SetTextColor | Equals | 3-4 integers in the [0-255] range. | Yes | No
SetBackgroundColor | Equals | 3-4 integers in the [0-255] range. | Yes | No
PlayAlertSound | Equals | A Word or an integer in the [1-16] range, followed by an optional integer in the [0-300] range. | Yes | Yes
PlayAlertSoundPositional | Equals | A Word or an integer in the [1-16] range, followed by an optional integer in the [0-300] range. | Yes | Yes
CustomAlertSound | Equals | A quoted string. | ??? | Yes
SetFontSize | Equals | An integer in the [16-50] range. | No | No
DisableDropSound | Equals | Ignored | Yes | No
MinimapIcon | Equals | An integer followed two words. | ??? | ???
PlayEffect | Equals | A word. | ??? | ???

> Integer: a numerical value that can optionally be surrounded by quotation marks.

> Word: a single word that cannot be surrounded by quotation marks.

> String: a value that can optionally be surrounded by quotation marks, possibly multiple words.

> Quoted String: a string that *must* be surrounded by double quotation marks.

## Notes

- The word value for either `PlayAlertSound` or `PlayAlertSoundPositional` must *not* be surrounded by quotation marks.
- Rules taking multiple values get weird when combined with most operators, so we simply disallow multiple values when the operator is anything except equals.
- Rules taking boolean values do in fact take multiple values, but it is misleading.
- The `LinkedSockets` value can actually be zero, but this is misleading and doesn't work as expected in-game.
- The `SetFontSize` rule does not take multiple values and has a specialized error when multiple are provided.
- The value of the `DisableDropSound` rule is completely ignored. The rule being present within a block will always disable the drop sound.
- There is a lot of oddity surrounding Elder and Shaper items in-game. They seem to disable certain other attributes within item filters, like `Quality`.
