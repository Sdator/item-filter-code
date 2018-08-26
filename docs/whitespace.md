A cheat sheet providing information regarding whitespace support within item filters.

## Line Breaks

Character | Hex | Line Break | Error | Allowed
--- | --- | --- | --- | ---
Line Feed | 0x000A | True | False | True
Carriage Return | 0x000D | False | False | True
Line Separator | 0x2028 | False | False | False
Paragraph Separator | 0x2029 | False | False | False
Next Line | 0x0085 | False | False | False

## Single-line Whitespace

Character | Hex | Token Separator | String Separator | Error | Allowed
--- | --- | --- | --- | --- | ---
Space | 0x0020 | True | True | False | True
No-break Space | 0x00A0 | True | True | False | True
En Quad | 0x2000 | True | False | False | True
Em Quad | 0x2001 | True | False | False | True
En Space | 0x2002 | True | False | False | True
Em Space | 0x2003 | True | False | False | True
Three-per-em Space | 0x2004 | True | False | False | True
Four-per-em Space | 0x2005 | True | False | False | True
Six-per-em Space | 0x2006 | True | False | False | True
Figure Space | 0x2007 | True | False | False | True
Punctuation Space | 0x2008 | True | False | False | True
Thin Space | 0x2009 | True | False | False | True
Hair Space | 0x200A | True | False | False | True
Zero Width Space | 0x200B | False | False | True | False
Narrow No-break Space | 0x202F | True | False | False | True
Ideographic Space | 0x3000 | True | False | False | True
Mathematical Space | 0x205F | True | False | False | True
Ogham | 0x1680 | True | False | False | True
Tab | 0x0009 | True | False | False | True
Vertical Tab | 0x000B | True | False | False | True
Form Feed | 0x000C | True | False | False | True
Byte Order Marker | 0xFEFF | True | False | False | True
