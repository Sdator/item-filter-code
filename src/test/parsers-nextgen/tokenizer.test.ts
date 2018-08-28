/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Position } from "../../common/types";
import * as Tokenizer from "../../common/parsers-nextgen/tokenizer";

declare const assert: Chai.AssertStatic;

suite("isTokenSeparatingWhitespace", () => {
  test("correctly handles the space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace(" ".charCodeAt(0)));
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u0020".charCodeAt(0)));
  });

  test("correctly handles the tab character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\t".charCodeAt(0)));
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u0009".charCodeAt(0)));
  });

  test("correctly handles the vertical tab character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u000B".charCodeAt(0)));
  });

  test("correctly handles the no-break space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u00A0".charCodeAt(0)));
  });

  test("correctly handles the enQuad character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2000".charCodeAt(0)));
  });

  test("correctly handles the emQuad character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2001".charCodeAt(0)));
  });

  test("correctly handles the enSpace character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2002".charCodeAt(0)));
  });

  test("correctly handles the emSpace character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2003".charCodeAt(0)));
  });

  test("correctly handles the three-per-em space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2004".charCodeAt(0)));
  });

  test("correctly handles the four-per-em space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2005".charCodeAt(0)));
  });

  test("correctly handles the six-per-em space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2006".charCodeAt(0)));
  });

  test("correctly handles the figure space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2007".charCodeAt(0)));
  });

  test("correctly handles the punctuation space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2008".charCodeAt(0)));
  });

  test("correctly handles the thin space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u2009".charCodeAt(0)));
  });

  test("correctly handles the hair space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u200A".charCodeAt(0)));
  });

  test("correctly handles the narrow, no-break space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u202F".charCodeAt(0)));
  });

  test("correctly handles the ideographic space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u3000".charCodeAt(0)));
  });

  test("correctly handles the mathematical space character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u205F".charCodeAt(0)));
  });

  test("correctly handles the ogham character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u1680".charCodeAt(0)));
  });

  test("correctly handles the form feed character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\u000C".charCodeAt(0)));
  });

  test("correctly handles the byte order mark character", () => {
    assert.isTrue(Tokenizer.isTokenSeparatingWhitespace("\uFEFF".charCodeAt(0)));
  });

  test("correctly handles other whitespace characters", () => {
    assert.isFalse(Tokenizer.isTokenSeparatingWhitespace("\n".charCodeAt(0)));
    assert.isFalse(Tokenizer.isTokenSeparatingWhitespace("\u200B".charCodeAt(0)));
    assert.isFalse(Tokenizer.isTokenSeparatingWhitespace("\u200B".charCodeAt(0)));
  });
});

suite("isLineBreakingWhitespace", () => {
  test("correctly handles the line feed character", () => {
    assert.isTrue(Tokenizer.isLineBreakingWhitespace("\n".charCodeAt(0)));
    assert.isTrue(Tokenizer.isLineBreakingWhitespace("\u000A".charCodeAt(0)));
  });

  test("correctly handles other whitespace characters", () => {
    assert.isFalse(Tokenizer.isLineBreakingWhitespace("\r".charCodeAt(0)));
    assert.isFalse(Tokenizer.isLineBreakingWhitespace("\u2028".charCodeAt(0)));
    assert.isFalse(Tokenizer.isLineBreakingWhitespace("\u2029".charCodeAt(0)));
    assert.isFalse(Tokenizer.isLineBreakingWhitespace("\u0085".charCodeAt(0)));
  });
});

suite("isDisallowedWhitespace", () => {
  test("correctly handles the line separator character", () => {
    assert.isTrue(Tokenizer.isDisallowedWhitespace("\u2028".charCodeAt(0)));
  });

  test("correctly handles the paragraph separator character", () => {
    assert.isTrue(Tokenizer.isDisallowedWhitespace("\u2029".charCodeAt(0)));
  });

  test("correctly handles the next line character", () => {
    assert.isTrue(Tokenizer.isDisallowedWhitespace("\u0085".charCodeAt(0)));
  });

  test("correctly handles the zero-width space character", () => {
    assert.isTrue(Tokenizer.isDisallowedWhitespace("\u200B".charCodeAt(0)));
  });

  test("correctly handles other whitespace characters", () => {
    assert.isFalse(Tokenizer.isDisallowedWhitespace(" ".charCodeAt(0)));
    assert.isFalse(Tokenizer.isDisallowedWhitespace("\t".charCodeAt(0)));
  });
});

suite("isDigit", () => {
  test("correctly handles any number from 0 to 9", () => {
    for (let i = 0; i < 10; i++) {
      assert.isTrue(Tokenizer.isDigit(`${i}`.charCodeAt(0)));
    }
  });

  test("does not consider anything else a number", () => {
    assert.isFalse(Tokenizer.isDigit("a".charCodeAt(0)));
    assert.isFalse(Tokenizer.isDigit('"'.charCodeAt(0)));
    assert.isFalse(Tokenizer.isDigit("ö".charCodeAt(0)));
  });
});

suite("isAlphabetical", () => {
  test("correctly handles lowercase letters", () => {
    assert.isTrue(Tokenizer.isAlphabetical("a".charCodeAt(0)));
    assert.isTrue(Tokenizer.isAlphabetical("z".charCodeAt(0)));
  });

  test("correctly handles uppercase letters", () => {
    assert.isTrue(Tokenizer.isAlphabetical("A".charCodeAt(0)));
    assert.isTrue(Tokenizer.isAlphabetical("Z".charCodeAt(0)));
  });

  test("does not consider unicode characters as alphabetical", () => {
    assert.isFalse(Tokenizer.isAlphabetical("ö".charCodeAt(0)));
  });

  test("does not consider numbers as alphabetical", () => {
    assert.isFalse(Tokenizer.isAlphabetical("1".charCodeAt(0)));
  });
});

suite("getCharacterIndexForPosition", () => {
  test("correctly handles positions with a one-line string", () => {
    const idx = Tokenizer.getCharacterIndexForPosition(" abc ", { line: 0, character: 1 });
    assert.strictEqual(idx, 1);
  });

  test("correctly handles positions with a two-line string", () => {
    const str = "1234\n5678";
    const p1: Position = { line: 0, character: 2 };
    const p2: Position = { line: 1, character: 2 };

    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p1), 2);
    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p2), 7);
  });

  test("correctly handles positions with a multi-line string", () => {
    const str = "12\n34\n567\n789";
    const p1: Position = { line: 0, character: 1 };
    const p2: Position = { line: 1, character: 1 };
    const p3: Position = { line: 2, character: 2 };

    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p1), 1);
    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p2), 4);
    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p3), 8);
  });

  test("correctly handles CRLF line endings", () => {
    const str = "12\r\n34\r\n567";
    const p1: Position = { line: 0, character: 1 };
    const p2: Position = { line: 1, character: 1 };
    const p3: Position = { line: 2, character: 2 };

    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p1), 1);
    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p2), 5);
    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p3), 10);
  });

  test("correctly handles EOL positions", () => {
    const str = "1234\r\n";
    const p1: Position = { line: 0, character: 4 };
    const p2: Position = { line: 0, character: 5 };

    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p1), 4);
    assert.strictEqual(Tokenizer.getCharacterIndexForPosition(str, p2), 5);
  });

  test("throws when given a character index falling on another line", () => {
    assert.throws(() => {
      const str = "12\n34";
      const pos: Position = { line: 0, character: 3};

      Tokenizer.getCharacterIndexForPosition(str, pos);
    }, "character index of '3' does not fall on line '0'");
  });

  test("throws when given an off-the-end character position", () => {
    assert.throws(() => {
      const str = "12";
      const pos: Position = { line: 0, character: 2 };

      Tokenizer.getCharacterIndexForPosition(str, pos);
    }, "character index of '2' exceeds the line's max index of '1'");
  });

  test("throws when given an off-the-end line position", () => {
    assert.throws(() => {
      Tokenizer.getCharacterIndexForPosition("", { line: 1, character: 0 });
    }, "line '1' exceeds text's maximum of '0'");
  });
});

suite("ItemFilterTokenizer", () => {
  suite("isNumber", () => {
    test("correctly handles a lone number", () => {
      const tokenizer = new Tokenizer.ItemFilterTokenizer("1");
      assert.isTrue(tokenizer.isNumber());
    });

    test("correctly handles multiple numbers", () => {
      const tokenizer = new Tokenizer.ItemFilterTokenizer("123");
      assert.isTrue(tokenizer.isNumber());
    });

    test("correctly handles multiple tokens", () => {
      const tokenizer = new Tokenizer.ItemFilterTokenizer("12 Test");
      assert.isTrue(tokenizer.isNumber());
    });

    test("correctly handles multiple lines", () => {
      const tokenizer = new Tokenizer.ItemFilterTokenizer("12\nTest");
    });

    test("correctly handles word values", () => {
      const t1 = new Tokenizer.ItemFilterTokenizer("12ab34");
      const t2 = new Tokenizer.ItemFilterTokenizer("ab");
      const t3 = new Tokenizer.ItemFilterTokenizer("1ö");

      assert.isFalse(t1.isNumber());
      assert.isFalse(t2.isNumber());
      assert.isFalse(t3.isNumber());
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Tokenizer.ItemFilterTokenizer("12 \t");
      const t2 = new Tokenizer.ItemFilterTokenizer(" \t12");

      assert.isTrue(t1.isNumber());
      assert.isFalse(t2.isNumber());
    });

    test("correctly handles an empty string", () => {
      const tokenizer = new Tokenizer.ItemFilterTokenizer("");
      assert.isFalse(tokenizer.isNumber());
    });
  });

  suite("isBoolean", () => {
    test("correctly handles True", () => {
      const tokenizer = new Tokenizer.ItemFilterTokenizer("True");
      assert.isTrue(tokenizer.isBoolean());
    });

    test("correctly handles False", () => {
      const tokenizer = new Tokenizer.ItemFilterTokenizer("False");
      assert.isTrue(tokenizer.isBoolean());
    });

    test("correctly handles surrounded quotations", () => {
      const t1 = new Tokenizer.ItemFilterTokenizer('"True"');
      const t2 = new Tokenizer.ItemFilterTokenizer('"False"');

      assert.isTrue(t1.isBoolean());
      assert.isTrue(t2.isBoolean());
    });

    test("correctly handles non-boolean values", () => {
      const t1 = new Tokenizer.ItemFilterTokenizer("42 True");
      const t2 = new Tokenizer.ItemFilterTokenizer("Tr42ue");

      assert.isFalse(t1.isBoolean());
      assert.isFalse(t2.isBoolean());
    });

    test("correctly handles leading and trailing whitespace", () => {
      const t1 = new Tokenizer.ItemFilterTokenizer("True \t");
      const t2 = new Tokenizer.ItemFilterTokenizer(" \tFalse");

      assert.isTrue(t1.isBoolean());
      assert.isFalse(t2.isBoolean());
    });
  });
});
