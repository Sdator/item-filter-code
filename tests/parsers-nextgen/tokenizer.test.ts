/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Position } from "../../src/types";
import * as Parser from "../../src/parsers-nextgen/tokens";

describe("isTokenSeparatingWhitespace", () => {
  test("correctly handles the space character", () => {
    expect(Parser.isTokenSeparatingWhitespace(" ".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isTokenSeparatingWhitespace("\u0020".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the tab character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\t".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isTokenSeparatingWhitespace("\u0009".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the vertical tab character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u000B".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the no-break space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u00A0".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the enQuad character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2000".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the emQuad character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2001".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the enSpace character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2002".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the emSpace character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2003".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the three-per-em space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2004".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the four-per-em space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2005".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the six-per-em space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2006".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the figure space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2007".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the punctuation space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2008".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the thin space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u2009".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the hair space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u200A".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the narrow, no-break space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u202F".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the ideographic space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u3000".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the mathematical space character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u205F".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the ogham character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u1680".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the form feed character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\u000C".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the byte order mark character", () => {
    expect(Parser.isTokenSeparatingWhitespace("\uFEFF".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles other whitespace characters", () => {
    expect(Parser.isTokenSeparatingWhitespace("\n".charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isTokenSeparatingWhitespace("\u200B".charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isTokenSeparatingWhitespace("\u200B".charCodeAt(0))).toStrictEqual(false);
  });
});

describe("isLineBreakingWhitespace", () => {
  test("correctly handles the line feed character", () => {
    expect(Parser.isLineBreakingWhitespace("\n".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isLineBreakingWhitespace("\u000A".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles other whitespace characters", () => {
    expect(Parser.isLineBreakingWhitespace("\r".charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isLineBreakingWhitespace("\u2028".charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isLineBreakingWhitespace("\u2029".charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isLineBreakingWhitespace("\u0085".charCodeAt(0))).toStrictEqual(false);
  });
});

describe("isDisallowedWhitespace", () => {
  test("correctly handles the line separator character", () => {
    expect(Parser.isDisallowedWhitespace("\u2028".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the paragraph separator character", () => {
    expect(Parser.isDisallowedWhitespace("\u2029".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the next line character", () => {
    expect(Parser.isDisallowedWhitespace("\u0085".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the zero-width space character", () => {
    expect(Parser.isDisallowedWhitespace("\u200B".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles other whitespace characters", () => {
    expect(Parser.isDisallowedWhitespace(" ".charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isDisallowedWhitespace("\t".charCodeAt(0))).toStrictEqual(false);
  });
});

describe("isDigit", () => {
  test("correctly handles any number from 0 to 9", () => {
    for (let i = 0; i < 10; i++) {
      expect(Parser.isDigit(`${i}`.charCodeAt(0))).toStrictEqual(true);
    }
  });

  test("does not consider anything else a number", () => {
    expect(Parser.isDigit("a".charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isDigit('"'.charCodeAt(0))).toStrictEqual(false);
    expect(Parser.isDigit("ö".charCodeAt(0))).toStrictEqual(false);
  });
});

describe("isAlphabetical", () => {
  test("correctly handles lowercase letters", () => {
    expect(Parser.isAlphabetical("a".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isAlphabetical("z".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles uppercase letters", () => {
    expect(Parser.isAlphabetical("A".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isAlphabetical("Z".charCodeAt(0))).toStrictEqual(true);
  });

  test("does not consider unicode characters as alphabetical", () => {
    expect(Parser.isAlphabetical("ö".charCodeAt(0))).toStrictEqual(false);
  });

  test("does not consider numbers as alphabetical", () => {
    expect(Parser.isAlphabetical("1".charCodeAt(0))).toStrictEqual(false);
  });
});

describe("isValidWordCharacter", () => {
  test("correctly handles alphabetical characters", () => {
    expect(Parser.isValidWordCharacter("A".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isValidWordCharacter("Z".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isValidWordCharacter("a".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isValidWordCharacter("z".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles numerical digits", () => {
    expect(Parser.isValidWordCharacter("0".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isValidWordCharacter("9".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles parentheses characters", () => {
    expect(Parser.isValidWordCharacter("(".charCodeAt(0))).toStrictEqual(true);
    expect(Parser.isValidWordCharacter(")".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the minus character", () => {
    expect(Parser.isValidWordCharacter("-".charCodeAt(0))).toStrictEqual(true);
  });

  test("correctly handles the latinSmallOWithDiaeresis character", () => {
    expect(Parser.isValidWordCharacter("ö".charCodeAt(0))).toStrictEqual(true);
  });
});

describe("getCharacterIndexForPosition", () => {
  test("correctly handles positions with a one-line string", () => {
    const idx = Parser.getCharacterIndexForPosition(" abc ", { line: 0, character: 1 });
    expect(idx).toStrictEqual(1);
  });

  test("correctly handles positions with a two-line string", () => {
    const str = "1234\n5678";
    const p1: Position = { line: 0, character: 2 };
    const p2: Position = { line: 1, character: 2 };

    expect(Parser.getCharacterIndexForPosition(str, p1)).toStrictEqual(2);
    expect(Parser.getCharacterIndexForPosition(str, p2)).toStrictEqual(7);
  });

  test("correctly handles positions with a multi-line string", () => {
    const str = "12\n34\n567\n789";
    const p1: Position = { line: 0, character: 1 };
    const p2: Position = { line: 1, character: 1 };
    const p3: Position = { line: 2, character: 2 };

    expect(Parser.getCharacterIndexForPosition(str, p1)).toStrictEqual(1);
    expect(Parser.getCharacterIndexForPosition(str, p2)).toStrictEqual(4);
    expect(Parser.getCharacterIndexForPosition(str, p3)).toStrictEqual(8);
  });

  test("correctly handles CRLF line endings", () => {
    const str = "12\r\n34\r\n567";
    const p1: Position = { line: 0, character: 1 };
    const p2: Position = { line: 1, character: 1 };
    const p3: Position = { line: 2, character: 2 };

    expect(Parser.getCharacterIndexForPosition(str, p1)).toStrictEqual(1);
    expect(Parser.getCharacterIndexForPosition(str, p2)).toStrictEqual(5);
    expect(Parser.getCharacterIndexForPosition(str, p3)).toStrictEqual(10);
  });

  test("correctly handles EOL positions", () => {
    const str = "1234\r\n";
    const p1: Position = { line: 0, character: 4 };
    const p2: Position = { line: 0, character: 5 };

    expect(Parser.getCharacterIndexForPosition(str, p1)).toStrictEqual(4);
    expect(Parser.getCharacterIndexForPosition(str, p2)).toStrictEqual(5);
  });

  test("throws when given a character index falling on another line", () => {
    expect(() => {
      const str = "12\n34";
      const pos: Position = { line: 0, character: 3 };

      Parser.getCharacterIndexForPosition(str, pos);
    }).toThrow("character index of '3' does not fall on line '0'");
  });

  test("throws when given an off-the-end character position", () => {
    expect(() => {
      const str = "12";
      const pos: Position = { line: 0, character: 2 };

      Parser.getCharacterIndexForPosition(str, pos);
    }).toThrow("character index of '2' exceeds the line's max index of '1'");
  });

  test("throws when given an off-the-end line position", () => {
    expect(() => {
      Parser.getCharacterIndexForPosition("", { line: 1, character: 0 });
    }).toThrow("line '1' exceeds text's maximum of '0'");
  });
});

describe("ItemFilterTokenizer", () => {
  describe("isNumber", () => {
    test("correctly handles a lone number", () => {
      const tokenParser = new Parser.TokenParser("1");
      expect(tokenParser.isNumber()).toStrictEqual(true);
    });

    test("correctly handles multiple numbers", () => {
      const tokenParser = new Parser.TokenParser("123");
      expect(tokenParser.isNumber()).toStrictEqual(true);
    });

    test("correctly handles multiple tokens", () => {
      const tokenParser = new Parser.TokenParser("12 Test");
      expect(tokenParser.isNumber()).toStrictEqual(true);
    });

    test("correctly handles multiple lines", () => {
      const tokenParser = new Parser.TokenParser("12\nTest");
      expect(tokenParser.isNumber()).toStrictEqual(true);
    });

    test("correctly handles word values", () => {
      const t1 = new Parser.TokenParser("12ab34");
      const t2 = new Parser.TokenParser("ab");
      const t3 = new Parser.TokenParser("1ö");

      expect(t1.isNumber()).toStrictEqual(false);
      expect(t2.isNumber()).toStrictEqual(false);
      expect(t3.isNumber()).toStrictEqual(false);
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Parser.TokenParser("12 \t");
      const t2 = new Parser.TokenParser(" \t12");

      expect(t1.isNumber()).toStrictEqual(true);
      expect(t2.isNumber()).toStrictEqual(false);
    });

    test("correctly handles an empty string", () => {
      const tokenParser = new Parser.TokenParser("");
      expect(tokenParser.isNumber()).toStrictEqual(false);
    });
  });

  describe("isBoolean", () => {
    test("correctly handles True", () => {
      const tokenParser = new Parser.TokenParser("True");
      expect(tokenParser.isBoolean()).toStrictEqual(true);
    });

    test("correctly handles False", () => {
      const tokenParser = new Parser.TokenParser("False");
      expect(tokenParser.isBoolean()).toStrictEqual(true);
    });

    test("correctly handles surrounded quotations", () => {
      const t1 = new Parser.TokenParser('"True"');
      const t2 = new Parser.TokenParser('"False"');

      expect(t1.isBoolean()).toStrictEqual(true);
      expect(t2.isBoolean()).toStrictEqual(true);
    });

    test("correctly handles non-boolean values", () => {
      const t1 = new Parser.TokenParser("42 True");
      const t2 = new Parser.TokenParser("Tr42ue");

      expect(t1.isBoolean()).toStrictEqual(false);
      expect(t2.isBoolean()).toStrictEqual(false);
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Parser.TokenParser("True \t");
      const t2 = new Parser.TokenParser(" \tFalse");

      expect(t1.isBoolean()).toStrictEqual(true);
      expect(t2.isBoolean()).toStrictEqual(false);
    });
  });

  describe("isBoolean", () => {
    test("correctly handles the equals operator", () => {
      const tokenParser = new Parser.TokenParser("=");
      expect(tokenParser.isOperator()).toStrictEqual(true);
    });

    test("correctly handles the greater-than operator", () => {
      const tokenParser = new Parser.TokenParser(">");
      expect(tokenParser.isOperator()).toStrictEqual(true);
    });

    test("correctly handles the less-than operator", () => {
      const tokenParser = new Parser.TokenParser("<");
      expect(tokenParser.isOperator()).toStrictEqual(true);
    });

    test("correctly handles the greater-than-equals operator", () => {
      const tokenParser = new Parser.TokenParser(">=");
      expect(tokenParser.isOperator()).toStrictEqual(true);
    });

    test("correctly handles the less-than-equals operator", () => {
      const tokenParser = new Parser.TokenParser("<=");
      expect(tokenParser.isOperator()).toStrictEqual(true);
    });

    test("correctly handles non-operator values", () => {
      const t1 = new Parser.TokenParser("ab");
      const t2 = new Parser.TokenParser("12");
      const t3 = new Parser.TokenParser(">1");
      const t4 = new Parser.TokenParser("1=");
      const t5 = new Parser.TokenParser(">==");

      expect(t1.isOperator()).toStrictEqual(false);
      expect(t2.isOperator()).toStrictEqual(false);
      expect(t3.isOperator()).toStrictEqual(false);
      expect(t4.isOperator()).toStrictEqual(false);
      expect(t5.isOperator()).toStrictEqual(false);
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Parser.TokenParser(">= \t");
      const t2 = new Parser.TokenParser(" \t=");

      expect(t1.isOperator()).toStrictEqual(true);
      expect(t2.isOperator()).toStrictEqual(false);
    });
  });
});
