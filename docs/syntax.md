A cheat sheet providing information on the syntax of an item filter.

## Blocks
Keyword | Trailing Comment
--- | ---
Show | Yes
Hide | Yes

## Filter Rules
Keyword | Operator | Values | Case Sensitive
--- | --- | --- | ---
ItemLevel | All | 0-100 | No
DropLevel | All | 0-100 | No
Quality | All | 0-30 | No
Rarity | All | One of the following strings: Normal, Magic, Rare, Unique | Yes
Class | Equality | String from the list of Classes | Yes
BaseType | Equality | String from the list of Bases | Yes
Sockets | All | 0-6 | No
LinkedSockets | All | 0, 2-6 | No
SocketGroup | Equality | String consisting of *r, g, b, w* | No
Height | All | 1-4 | No
Width | All | 1-2 | No
Identified | Equality | True or False | No
Corrupted | Equality | True or False | No
ElderItem | Equality | True or False | No
ShaperItem | Equality | True or False | No
ShapedMap | Equality | True or False | No
ElderMap | Equality | True or False | No
DisableDropSound | Equality | True or False | No

## Action Rules
Keyword | Operator | Values | Trailing Comment | Case Sensitive
--- | --- | --- | --- | --- |
SetBorderColor | Equality | 0-255 (3-4 Values) | Yes | N/A
SetTextColor | Equality | 0-255 (3-4 Values) | Yes | N/A
SetBackgroundColor | Equality | 0-255 (3-4 Values) | Yes | N/A
PlayAlertSound | Equality | 1-16 or Word [0-300] | Yes | Yes
PlayAlertSoundPositional | Equality | 1-16 or Word [0-300] | Yes | Yes
SetFontSize | Equality | 18-45 | No | N/A

> String: a value that can optionally be surrounded by quotation marks, possibly multiple words.

> Word: a single word that cannot be surrounded by quotation marks.

## Notes

- The word value for either `PlayAlertSound` or `PlayAlertSoundPositional` must *not* be surrounded by quotation marks.
