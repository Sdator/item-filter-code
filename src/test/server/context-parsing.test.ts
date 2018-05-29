/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Range } from "vscode-languageserver";

import * as parser from "../../server/context-parsing";

declare const assert: Chai.Assert;

suite("Context Parsing -> bypassEqOperator", () => {
  test("returns undefined if the operator isn't followed by a value", () => {
    const r1 = parser.bypassEqOperator("=", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassEqOperator("=  ", 0);
    assert.isUndefined(r2);

    const r3 = parser.bypassEqOperator("= Test", 0) as number;
    assert.isDefined(r3);
    assert.strictEqual(r3, 2);
  });

  test("correctly handles leading whitespace", () => {
    const r1 = parser.bypassEqOperator(" =", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassEqOperator(" = Test", 0) as number;
    assert.isDefined(r2);
    assert.strictEqual(r2, 3);

    const r3 = parser.bypassEqOperator("\t  = Test", 0) as number;
    assert.isDefined(r3);
    assert.strictEqual(r3, 5);
  });

  test("correctly handles multiple equality operators", () => {
    const r1 = parser.bypassEqOperator("== Test", 0);
    assert.isUndefined(r1);
  });

  test("returns undefined if given an empty string", () => {
    const index = parser.bypassEqOperator("", 0);
    assert.isUndefined(index);
  });

  test("returns undefined if given a whitespace-only string", () => {
    const index = parser.bypassEqOperator(" \t ", 0);
    assert.isUndefined(index);
  });

  test("returns undefined if given an out-of-range index", () => {
    const index = parser.bypassEqOperator("= Test", 6);
    assert.isUndefined(index);
  });
});

suite("Context Parsing -> bypassOperator", () => {
  test("returns undefined if the operator isn't followed by a value", () => {
    const r1 = parser.bypassOperator(">", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator("<  ", 0);
    assert.isUndefined(r2);

    const r3 = parser.bypassOperator(">= Test", 0) as number;
    assert.isDefined(r3);
    assert.strictEqual(r3, 3);
  });

  test("correctly handles leading whitespace", () => {
    const r1 = parser.bypassOperator(" >", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator(" >= Test", 0) as number;
    assert.isDefined(r2);
    assert.strictEqual(r2, 4);

    const r3 = parser.bypassOperator("\t  < Test", 0) as number;
    assert.isDefined(r3);
    assert.strictEqual(r3, 5);
  });

  test("correctly handles the '=' operator", () => {
    const r1 = parser.bypassOperator(" = ", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator(" = Test", 0) as number;
    assert.isDefined(r2);
    assert.strictEqual(r2, 3);
  });

  test("correctly handles the '>' operator", () => {
    const r1 = parser.bypassOperator(" > ", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator(" > Test", 0) as number;
    assert.isDefined(r2);
    assert.strictEqual(r2, 3);
  });

  test("correctly handles the '<' operator", () => {
    const r1 = parser.bypassOperator(" < ", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator(" < Test", 0) as number;
    assert.isDefined(r2);
    assert.strictEqual(r2, 3);
  });

  test("correctly handles the '>=' operator", () => {
    const r1 = parser.bypassOperator(" >= ", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator(" >= Test", 0) as number;
    assert.isDefined(r2);
    assert.strictEqual(r2, 4);
  });

  test("correctly handles the '<=' operator", () => {
    const r1 = parser.bypassOperator(" <= ", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator(" <= Test", 0) as number;
    assert.isDefined(r2);
    assert.strictEqual(r2, 4);
  });

  test("returns undefined when given multiple operators", () => {
    const r1 = parser.bypassOperator(" > = Test", 0);
    assert.isUndefined(r1);

    const r2 = parser.bypassOperator(" >= <= Test", 0);
    assert.isUndefined(r2);
  });

  test("returns undefined if given an empty string", () => {
    const index = parser.bypassOperator("", 0);
    assert.isUndefined(index);
  });

  test("returns undefined if given a whitespace-only string", () => {
    const index = parser.bypassOperator(" \t ", 0);
    assert.isUndefined(index);
  });

  test("returns undefined if given an out-of-range index", () => {
    const index = parser.bypassOperator("= Test", 6);
    assert.isUndefined(index);
  });
});

suite("Context Parsing -> getKeyword", () => {
  test("correctly handles a lone keyword", () => {
    const result = parser.getKeyword("BaseType", 0) as [string, Range];
    assert.isDefined(result);
    const [keyword, range] = result;
    assert.isDefined(keyword);
    assert.isDefined(range);
    assert.strictEqual(keyword, "BaseType");
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 8);
  });

  test("correctly handles trailing whitespace", () => {
    const result = parser.getKeyword("BaseType  ", 0) as [string, Range];
    assert.isDefined(result);
    const [keyword, range] = result;
    assert.isDefined(keyword);
    assert.isDefined(range);
    assert.strictEqual(keyword, "BaseType");
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 8);
  });

  test("correctly handles leading whitespace", () => {
    const result = parser.getKeyword("  BaseType", 0) as [string, Range];
    assert.isDefined(result);
    const [keyword, range] = result;
    assert.isDefined(keyword);
    assert.isDefined(range);
    assert.strictEqual(keyword, "BaseType");
    assert.strictEqual(range.start.character, 2);
    assert.strictEqual(range.end.character, 10);
  });

  test("correctly handles surrounding whitespace", () => {
    const result = parser.getKeyword(" \tBaseType \t", 0) as [string, Range];
    assert.isDefined(result);
    const [keyword, range] = result;
    assert.isDefined(keyword);
    assert.isDefined(range);
    assert.strictEqual(keyword, "BaseType");
    assert.strictEqual(range.start.character, 2);
    assert.strictEqual(range.end.character, 10);
  });

  test("correctly handles multiple words", () => {
    const result = parser.getKeyword("BaseType Class", 0) as [string, Range];
    assert.isDefined(result);
    const [keyword, range] = result;
    assert.isDefined(keyword);
    assert.isDefined(range);
    assert.strictEqual(keyword, "BaseType");
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 8);
  });

  test("correctly sets the line number for the range to the second parameter", () => {
    const result = parser.getKeyword("BaseType", 2) as [string, Range];
    assert.isDefined(result);
    const range = result["1"];
    assert.isDefined(range);
    assert.strictEqual(range.start.line, 2);
    assert.strictEqual(range.end.line, 2);
  });

  test("returns undefined when given an empty string", () => {
    const result = parser.getKeyword("", 0);
    assert.isUndefined(result);
  });

  test("returns undefined when given a whitespace-only string", () => {
    const result = parser.getKeyword(" \t ", 0);
    assert.isUndefined(result);
  });

  test("returns undefined when given a string value", () => {
    const result = parser.getKeyword('"BaseType"', 0);
    assert.isUndefined(result);
  });
});

suite("Context Parsing -> getNextValueRange()", () => {
  test("correctly handles a word value", () => {
    const range = parser.getNextValueRange("test", 0, 0) as Range;
    assert.isDefined(range);
    assert.isTrue(range.start.character === 0);
    assert.isTrue(range.end.character === 3);
  });

  test("correctly handles a word with leading whitespace", () => {
    const range = parser.getNextValueRange(" \t Test", 0, 0) as Range;
    assert.isDefined(range);
    assert.isTrue(range.start.character === 3);
    assert.isTrue(range.end.character === 6);
  });

  test("correctly handles a word with trailing whitespace", () => {
    const range = parser.getNextValueRange("test \t ", 0, 0) as Range;
    assert.isDefined(range);
    assert.isTrue(range.start.character === 0);
    assert.isTrue(range.end.character === 3);
  });

  test("correctly handles a word with surrounding whitespace", () => {
    const range = parser.getNextValueRange(" \t Test \t ", 0, 0) as Range;
    assert.isDefined(range);
    assert.isTrue(range.start.character === 3);
    assert.isTrue(range.end.character === 6);
  });

  test("correctly handles multiple words", () => {
    const range = parser.getNextValueRange(" Test Value", 0, 0) as Range;
    assert.isDefined(range);
    assert.isTrue(range.start.character === 1);
    assert.isTrue(range.end.character === 4);
  });

  test("correctly handles a number value", () => {
    const range = parser.getNextValueRange("42", 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 1);
  });

  test("correctly handles a number with leading whitespace", () => {
    const range = parser.getNextValueRange(" \t42", 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 2);
    assert.strictEqual(range.end.character, 3);
  });

  test("correctly handles a number with trailing whitespace", () => {
    const range = parser.getNextValueRange("42 \t", 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 1);
  });

  test("correctly handles a number with surrounding whitespace", () => {
    const range = parser.getNextValueRange(" \t42\t ", 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 2);
    assert.strictEqual(range.end.character, 3);
  });

  test("correctly handles multiple numbers", () => {
    const range = parser.getNextValueRange("42 84", 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 1);
  });

  test("correctly handles a string value", () => {
    const range = parser.getNextValueRange('"test"', 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 5);
  });

  test("correctly handles a string with leading whitespace", () => {
    const range = parser.getNextValueRange(' \t"Test"', 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 2);
    assert.strictEqual(range.end.character, 7);
  });

  test("correctly handles a string with trailing whitespace", () => {
    const range = parser.getNextValueRange('"Test"\t ', 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 5);
  });

  test("correctly handles a string with surrounding whitespace", () => {
    const range = parser.getNextValueRange(' \t"Test"  \t', 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 2);
    assert.strictEqual(range.end.character, 7);
  });

  test("correctly handles multiple strings", () => {
    const range = parser.getNextValueRange('"Test" "Value"', 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 5);
  });

  test("correctly handles a string containing whitespaces", () => {
    const range = parser.getNextValueRange('"Test Value"', 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 11);
  });

  test("correctly handles a string without a closing quotation mark", () => {
    const range = parser.getNextValueRange('"Test Value', 0, 0) as Range;
    assert.isDefined(range);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.character, 10);
  });

  test("correctly handles string whitespace-only string", () => {
    const range = parser.getNextValueRange("   ", 0, 0);
    assert.isUndefined(range);
  });

  test("correctly adjusts based on the given index", () => {
    const text = "42 Test";

    let index = 0;
    const r1 = parser.getNextValueRange(text, 0, index) as Range;
    assert.isDefined(r1);
    assert.strictEqual(r1.start.character, 0);
    assert.strictEqual(r1.end.character, 1);

    index = 3;
    const r2 = parser.getNextValueRange(text, 0, index) as Range;
    assert.isDefined(r2);
    assert.strictEqual(r2.start.character, 3);
    assert.strictEqual(r2.end.character, 6);
  });

  test("correctly handles an out-of-range index", () => {
    const range = parser.getNextValueRange("Test", 0, 4);
    assert.isUndefined(range);
  });
});

suite("Context Parsing -> getOpeningQuoteIndex", () => {

});

suite("Context Parsing -> isNextValue()", () => {
  test("correctly handles a word value", () => {
    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, "test", 0));
  });

  test("correctly handles a word value with leading whitespace", () => {
    const index = 0;
    const text = "  test";

    assert.isFalse(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 5 }, text, index));
  });

  test("correctly handles a word value with trailing whitespace", () => {
    const index = 0;
    const text = "test  ";

    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 4 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 5 }, text, index));
  });

  test("correctly handles a word with surrounding whitespace", () => {
    const index = 0;
    const text = "  test  ";

    assert.isFalse(parser.isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 6 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 7 }, text, index));
  });

  test("correctly handles multiple word values", () => {
    const index = 0;
    const text = "test value";

    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 3 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 4 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 5 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 9 }, text, index));
  });

  test("correctly handles a number value", () => {
    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, "42", 0));
  });

  test("correctly handles a number value with leading whitespace", () => {
    const index = 0;
    const text = "  42";

    assert.isFalse(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 3 }, text, index));
  });

  test("correctly handles a number value with trailing whitespace", () => {
    const index = 0;
    const text = "42  ";

    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 3 }, text, index));
  });

  test("correctly handles a number with surrounding whitespace", () => {
    const index = 0;
    const text = "  42  ";

    assert.isFalse(parser.isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 3 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 4 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 5 }, text, index));
  });

  test("correctly handles multiple number values", () => {
    const index = 0;
    const text = "42 84";

    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 3 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 4 }, text, index));
  });

  test("correctly handles a string value", () => {
    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, '"Test"', 0));
  });

  test("correctly handles a string value with leading whitespace", () => {
    const index = 0;
    const text = '  "Test"';

    assert.isFalse(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 7 }, text, index));
  });

  test("correctly handles a string value with trailing whitespace", () => {
    const index = 0;
    const text = '"Test"  ';

    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 5 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 6 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 7 }, text, index));
  });

  test("correctly handles a string with surrounding whitespace", () => {
    const index = 0;
    const text = '  "Test"  ';

    assert.isFalse(parser.isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 7 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 8 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 9 }, text, index));
  });

  test("correctly handles multiple string values", () => {
    const index = 0;
    const text = '"Test" "Tset"';

    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 6 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 7 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 12 }, text, index));
  });

  test("correctly handles strings containing spaces", () => {
    const index = 0;
    const text = '"Test Value" Test';

    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 5 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 6 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 11 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 12 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 13 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 16 }, text, index));
  });

  test("correctly handles a whitespace-only string", () => {
    const index = 0;
    const text = "          ";

    assert.isFalse(parser.isNextValue({ line: 0, character: 0 }, text, index));
  });

  test("correctly adjusts based on the given index", () => {
    const text = "42 Test";

    let index = 0;
    assert.isTrue(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 3 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 6 }, text, index));

    index = 3;
    assert.isFalse(parser.isNextValue({ line: 0, character: 0 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 1 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 3 }, text, index));
    assert.isTrue(parser.isNextValue({ line: 0, character: 6 }, text, index));
  });

  test("correctly associates positions at the end of a value", () => {
    const index = 0;
    const text = '"Test"  ';

    assert.isTrue(parser.isNextValue({ line: 0, character: 6 }, text, index));
  });

  test("correctly handles an out-of-range position", () => {
    const index = 0;
    const text = "Test";

    assert.isFalse(parser.isNextValue({ line: 0, character: 5 }, text, index));
    assert.isFalse(parser.isNextValue({ line: 0, character: 100 }, text, index));
  });

  test("correctly handles an out-of-range index", () => {
    const text = "Test";

    assert.isFalse(parser.isNextValue({ line: 0, character: 0 }, text, 4));
    assert.isFalse(parser.isNextValue({ line: 0, character: 0 }, text, 100));
  });
});
