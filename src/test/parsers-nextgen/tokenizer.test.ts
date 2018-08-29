/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Position } from "../../common/types";
import * as Parser from "../../common/parsers-nextgen/tokens";

declare const assert: Chai.AssertStatic;

suite("isTokenSeparatingWhitespace", () => {
  test("correctly handles the space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace(" ".charCodeAt(0)));
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u0020".charCodeAt(0)));
  });

  test("correctly handles the tab character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\t".charCodeAt(0)));
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u0009".charCodeAt(0)));
  });

  test("correctly handles the vertical tab character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u000B".charCodeAt(0)));
  });

  test("correctly handles the no-break space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u00A0".charCodeAt(0)));
  });

  test("correctly handles the enQuad character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2000".charCodeAt(0)));
  });

  test("correctly handles the emQuad character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2001".charCodeAt(0)));
  });

  test("correctly handles the enSpace character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2002".charCodeAt(0)));
  });

  test("correctly handles the emSpace character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2003".charCodeAt(0)));
  });

  test("correctly handles the three-per-em space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2004".charCodeAt(0)));
  });

  test("correctly handles the four-per-em space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2005".charCodeAt(0)));
  });

  test("correctly handles the six-per-em space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2006".charCodeAt(0)));
  });

  test("correctly handles the figure space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2007".charCodeAt(0)));
  });

  test("correctly handles the punctuation space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2008".charCodeAt(0)));
  });

  test("correctly handles the thin space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u2009".charCodeAt(0)));
  });

  test("correctly handles the hair space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u200A".charCodeAt(0)));
  });

  test("correctly handles the narrow, no-break space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u202F".charCodeAt(0)));
  });

  test("correctly handles the ideographic space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u3000".charCodeAt(0)));
  });

  test("correctly handles the mathematical space character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u205F".charCodeAt(0)));
  });

  test("correctly handles the ogham character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u1680".charCodeAt(0)));
  });

  test("correctly handles the form feed character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\u000C".charCodeAt(0)));
  });

  test("correctly handles the byte order mark character", () => {
    assert.isTrue(Parser.isTokenSeparatingWhitespace("\uFEFF".charCodeAt(0)));
  });

  test("correctly handles other whitespace characters", () => {
    assert.isFalse(Parser.isTokenSeparatingWhitespace("\n".charCodeAt(0)));
    assert.isFalse(Parser.isTokenSeparatingWhitespace("\u200B".charCodeAt(0)));
    assert.isFalse(Parser.isTokenSeparatingWhitespace("\u200B".charCodeAt(0)));
  });
});

suite("isLineBreakingWhitespace", () => {
  test("correctly handles the line feed character", () => {
    assert.isTrue(Parser.isLineBreakingWhitespace("\n".charCodeAt(0)));
    assert.isTrue(Parser.isLineBreakingWhitespace("\u000A".charCodeAt(0)));
  });

  test("correctly handles other whitespace characters", () => {
    assert.isFalse(Parser.isLineBreakingWhitespace("\r".charCodeAt(0)));
    assert.isFalse(Parser.isLineBreakingWhitespace("\u2028".charCodeAt(0)));
    assert.isFalse(Parser.isLineBreakingWhitespace("\u2029".charCodeAt(0)));
    assert.isFalse(Parser.isLineBreakingWhitespace("\u0085".charCodeAt(0)));
  });
});

suite("isDisallowedWhitespace", () => {
  test("correctly handles the line separator character", () => {
    assert.isTrue(Parser.isDisallowedWhitespace("\u2028".charCodeAt(0)));
  });

  test("correctly handles the paragraph separator character", () => {
    assert.isTrue(Parser.isDisallowedWhitespace("\u2029".charCodeAt(0)));
  });

  test("correctly handles the next line character", () => {
    assert.isTrue(Parser.isDisallowedWhitespace("\u0085".charCodeAt(0)));
  });

  test("correctly handles the zero-width space character", () => {
    assert.isTrue(Parser.isDisallowedWhitespace("\u200B".charCodeAt(0)));
  });

  test("correctly handles other whitespace characters", () => {
    assert.isFalse(Parser.isDisallowedWhitespace(" ".charCodeAt(0)));
    assert.isFalse(Parser.isDisallowedWhitespace("\t".charCodeAt(0)));
  });
});

suite("isDigit", () => {
  test("correctly handles any number from 0 to 9", () => {
    for (let i = 0; i < 10; i++) {
      assert.isTrue(Parser.isDigit(`${i}`.charCodeAt(0)));
    }
  });

  test("does not consider anything else a number", () => {
    assert.isFalse(Parser.isDigit("a".charCodeAt(0)));
    assert.isFalse(Parser.isDigit('"'.charCodeAt(0)));
    assert.isFalse(Parser.isDigit("ö".charCodeAt(0)));
  });
});

suite("isAlphabetical", () => {
  test("correctly handles lowercase letters", () => {
    assert.isTrue(Parser.isAlphabetical("a".charCodeAt(0)));
    assert.isTrue(Parser.isAlphabetical("z".charCodeAt(0)));
  });

  test("correctly handles uppercase letters", () => {
    assert.isTrue(Parser.isAlphabetical("A".charCodeAt(0)));
    assert.isTrue(Parser.isAlphabetical("Z".charCodeAt(0)));
  });

  test("does not consider unicode characters as alphabetical", () => {
    assert.isFalse(Parser.isAlphabetical("ö".charCodeAt(0)));
  });

  test("does not consider numbers as alphabetical", () => {
    assert.isFalse(Parser.isAlphabetical("1".charCodeAt(0)));
  });
});

suite("isValidWordCharacter", () => {
  test("correctly handles alphabetical characters", () => {
    assert.isTrue(Parser.isValidWordCharacter("A".charCodeAt(0)));
    assert.isTrue(Parser.isValidWordCharacter("Z".charCodeAt(0)));
    assert.isTrue(Parser.isValidWordCharacter("a".charCodeAt(0)));
    assert.isTrue(Parser.isValidWordCharacter("z".charCodeAt(0)));
  });

  test("correctly handles numerical digits", () => {
    assert.isTrue(Parser.isValidWordCharacter("0".charCodeAt(0)));
    assert.isTrue(Parser.isValidWordCharacter("9".charCodeAt(0)));
  });

  test("correctly handles parentheses characters", () => {
    assert.isTrue(Parser.isValidWordCharacter("(".charCodeAt(0)));
    assert.isTrue(Parser.isValidWordCharacter(")".charCodeAt(0)));
  });

  test("correctly handles the minus character", () => {
    assert.isTrue(Parser.isValidWordCharacter("-".charCodeAt(0)));
  });

  test("correctly handles the latinSmallOWithDiaeresis character", () => {
    assert.isTrue(Parser.isValidWordCharacter("ö".charCodeAt(0)));
  });
});

suite("getCharacterIndexForPosition", () => {
  test("correctly handles positions with a one-line string", () => {
    const idx = Parser.getCharacterIndexForPosition(" abc ", { line: 0, character: 1 });
    assert.strictEqual(idx, 1);
  });

  test("correctly handles positions with a two-line string", () => {
    const str = "1234\n5678";
    const p1: Position = { line: 0, character: 2 };
    const p2: Position = { line: 1, character: 2 };

    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p1), 2);
    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p2), 7);
  });

  test("correctly handles positions with a multi-line string", () => {
    const str = "12\n34\n567\n789";
    const p1: Position = { line: 0, character: 1 };
    const p2: Position = { line: 1, character: 1 };
    const p3: Position = { line: 2, character: 2 };

    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p1), 1);
    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p2), 4);
    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p3), 8);
  });

  test("correctly handles CRLF line endings", () => {
    const str = "12\r\n34\r\n567";
    const p1: Position = { line: 0, character: 1 };
    const p2: Position = { line: 1, character: 1 };
    const p3: Position = { line: 2, character: 2 };

    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p1), 1);
    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p2), 5);
    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p3), 10);
  });

  test("correctly handles EOL positions", () => {
    const str = "1234\r\n";
    const p1: Position = { line: 0, character: 4 };
    const p2: Position = { line: 0, character: 5 };

    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p1), 4);
    assert.strictEqual(Parser.getCharacterIndexForPosition(str, p2), 5);
  });

  test("throws when given a character index falling on another line", () => {
    assert.throws(() => {
      const str = "12\n34";
      const pos: Position = { line: 0, character: 3};

      Parser.getCharacterIndexForPosition(str, pos);
    }, "character index of '3' does not fall on line '0'");
  });

  test("throws when given an off-the-end character position", () => {
    assert.throws(() => {
      const str = "12";
      const pos: Position = { line: 0, character: 2 };

      Parser.getCharacterIndexForPosition(str, pos);
    }, "character index of '2' exceeds the line's max index of '1'");
  });

  test("throws when given an off-the-end line position", () => {
    assert.throws(() => {
      Parser.getCharacterIndexForPosition("", { line: 1, character: 0 });
    }, "line '1' exceeds text's maximum of '0'");
  });
});

suite("ItemFilterTokenizer", () => {
  suite("isNumber", () => {
    test("correctly handles a lone number", () => {
      const tokenParser = new Parser.TokenParser("1");
      assert.isTrue(tokenParser.isNumber());
    });

    test("correctly handles multiple numbers", () => {
      const tokenParser = new Parser.TokenParser("123");
      assert.isTrue(tokenParser.isNumber());
    });

    test("correctly handles multiple tokens", () => {
      const tokenParser = new Parser.TokenParser("12 Test");
      assert.isTrue(tokenParser.isNumber());
    });

    test("correctly handles multiple lines", () => {
      const tokenParser = new Parser.TokenParser("12\nTest");
      assert.isTrue(tokenParser.isNumber());
    });

    test("correctly handles word values", () => {
      const t1 = new Parser.TokenParser("12ab34");
      const t2 = new Parser.TokenParser("ab");
      const t3 = new Parser.TokenParser("1ö");

      assert.isFalse(t1.isNumber());
      assert.isFalse(t2.isNumber());
      assert.isFalse(t3.isNumber());
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Parser.TokenParser("12 \t");
      const t2 = new Parser.TokenParser(" \t12");

      assert.isTrue(t1.isNumber());
      assert.isFalse(t2.isNumber());
    });

    test("correctly handles an empty string", () => {
      const tokenParser = new Parser.TokenParser("");
      assert.isFalse(tokenParser.isNumber());
    });
  });

  suite("isBoolean", () => {
    test("correctly handles True", () => {
      const tokenParser = new Parser.TokenParser("True");
      assert.isTrue(tokenParser.isBoolean());
    });

    test("correctly handles False", () => {
      const tokenParser = new Parser.TokenParser("False");
      assert.isTrue(tokenParser.isBoolean());
    });

    test("correctly handles surrounded quotations", () => {
      const t1 = new Parser.TokenParser('"True"');
      const t2 = new Parser.TokenParser('"False"');

      assert.isTrue(t1.isBoolean());
      assert.isTrue(t2.isBoolean());
    });

    test("correctly handles non-boolean values", () => {
      const t1 = new Parser.TokenParser("42 True");
      const t2 = new Parser.TokenParser("Tr42ue");

      assert.isFalse(t1.isBoolean());
      assert.isFalse(t2.isBoolean());
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Parser.TokenParser("True \t");
      const t2 = new Parser.TokenParser(" \tFalse");

      assert.isTrue(t1.isBoolean());
      assert.isFalse(t2.isBoolean());
    });
  });

  suite("isBoolean", () => {
    test("correctly handles the equals operator", () => {
      const tokenParser = new Parser.TokenParser("=");
      assert.isTrue(tokenParser.isOperator());
    });

    test("correctly handles the greater-than operator", () => {
      const tokenParser = new Parser.TokenParser(">");
      assert.isTrue(tokenParser.isOperator());
    });

    test("correctly handles the less-than operator", () => {
      const tokenParser = new Parser.TokenParser("<");
      assert.isTrue(tokenParser.isOperator());
    });

    test("correctly handles the greater-than-equals operator", () => {
      const tokenParser = new Parser.TokenParser(">=");
      assert.isTrue(tokenParser.isOperator());
    });

    test("correctly handles the less-than-equals operator", () => {
      const tokenParser = new Parser.TokenParser("<=");
      assert.isTrue(tokenParser.isOperator());
    });

    test("correctly handles non-operator values", () => {
      const t1 = new Parser.TokenParser("ab");
      const t2 = new Parser.TokenParser("12");
      const t3 = new Parser.TokenParser(">1");
      const t4 = new Parser.TokenParser("1=");
      const t5 = new Parser.TokenParser(">==");

      assert.isFalse(t1.isOperator());
      assert.isFalse(t2.isOperator());
      assert.isFalse(t3.isOperator());
      assert.isFalse(t4.isOperator());
      assert.isFalse(t5.isOperator());
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Parser.TokenParser(">= \t");
      const t2 = new Parser.TokenParser(" \t=");

      assert.isTrue(t1.isOperator());
      assert.isFalse(t2.isOperator());
    });
  });
});
