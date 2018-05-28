/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { getNextValueRange, isNextValue } from "../../server/context-parsing";

declare const assert: Chai.Assert;

suite("Context Parsing -> getNextValueRange()", () => {
  test("correctly handles a word value", () => {
    const range = getNextValueRange("test", 0, 0);
    assert.isDefined(range);
    assert.isTrue(range != null && range.start.character === 0);
    assert.isTrue(range != null && range.end.character === 3);
  });
});

suite("Context Parsing -> isNextValue()", () => {
  test("correctly handles a word value", () => {
    assert.isTrue(isNextValue({ line: 0, character: 0 }, "test", 0));
  });

  test("correctly handles a word value with leading whitespace", () => {
    const index = 0;
    const text = "  test";

    assert.isFalse(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 5 }, text, index));
  });

  test("correctly handles a word value with trailing whitespace", () => {
    const index = 0;
    const text = "test  ";

    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 4 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 5 }, text, index));
  });

  test("correctly handles a word with surrounding whitespace", () => {
    const index = 0;
    const text = "  test  ";

    assert.isFalse(isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 6 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 7 }, text, index));
  });

  test("correctly handles multiple word values", () => {
    const index = 0;
    const text = "test value";

    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 3 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 4 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 5 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 9 }, text, index));
  });

  test("correctly handles a number value", () => {
    assert.isTrue(isNextValue({ line: 0, character: 0 }, "42", 0));
  });

  test("correctly handles a number value with leading whitespace", () => {
    const index = 0;
    const text = "  42";

    assert.isFalse(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 3 }, text, index));
  });

  test("correctly handles a number value with trailing whitespace", () => {
    const index = 0;
    const text = "42  ";

    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 3 }, text, index));
  });

  test("correctly handles a number with surrounding whitespace", () => {
    const index = 0;
    const text = "  42  ";

    assert.isFalse(isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 3 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 4 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 5 }, text, index));
  });

  test("correctly handles multiple number values", () => {
    const index = 0;
    const text = "42 84";

    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 3 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 4 }, text, index));
  });

  test("correctly handles a string value", () => {
    assert.isTrue(isNextValue({ line: 0, character: 0 }, '"Test"', 0));
  });

  test("correctly handles a string value with leading whitespace", () => {
    const index = 0;
    const text = '  "Test"';

    assert.isFalse(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 7 }, text, index));
  });

  test("correctly handles a string value with trailing whitespace", () => {
    const index = 0;
    const text = '"Test"  ';

    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 5 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 6 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 7 }, text, index));
  });

  test("correctly handles a string with surrounding whitespace", () => {
    const index = 0;
    const text = '  "Test"  ';

    assert.isFalse(isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 7 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 8 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 9 }, text, index));
  });

  test("correctly handles multiple string values", () => {
    const index = 0;
    const text = '"Test" "Tset"';

    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 6 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 7 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 12 }, text, index));
  });

  test("correctly handles strings containing spaces", () => {
    const index = 0;
    const text = '"Test Value" Test';

    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 5 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 6 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 11 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 12 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 13 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 16 }, text, index));
  });

  test("correctly handles an empty string", () => {
    const index = 0;
    const text = "          ";

    assert.isFalse(isNextValue({ line: 0, character: 0 }, text, index));
  });

  test("correctly adjusts based on the given index", () => {
    const text = "42 Test";

    let index = 0;
    assert.isTrue(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 1 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 3 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 6 }, text, index));

    index = 3;
    assert.isFalse(isNextValue({ line: 0, character: 0 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 1 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 2 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 3 }, text, index));
    assert.isTrue(isNextValue({ line: 0, character: 6 }, text, index));
  });

  test("correctly associates positions at the end of a value", () => {
    const index = 0;
    const text = '"Test"  ';

    assert.isTrue(isNextValue({ line: 0, character: 6 }, text, index));
  });

  test("correctly handles an off the end position", () => {
    const index = 0;
    const text = "Test";

    assert.isFalse(isNextValue({ line: 0, character: 5 }, text, index));
    assert.isFalse(isNextValue({ line: 0, character: 100 }, text, index));
  });

  test("correctly handles an off the end index", () => {
    const text = "Test";

    assert.isFalse(isNextValue({ line: 0, character: 0 }, text, 4));
    assert.isFalse(isNextValue({ line: 0, character: 0 }, text, 100));
  });
});
