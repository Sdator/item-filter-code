/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as helpers from "../src/helpers";

describe("getOrdinal", () => {
  test("it exists", () => {
    expect(helpers.getOrdinal).toBeDefined();
  });

  test("is a function", () => {
    expect(typeof helpers.getOrdinal === "function").toStrictEqual(true);
  });

  test("returns the ordinal text from a given number", () => {
    const m = new Map<number, string>([
      [1, "1st"], [2, "2nd"], [3, "3rd"], [4, "4th"], [5, "5th"], [6, "6th"],
      [7, "7th"], [8, "8th"], [9, "9th"], [10, "10th"]
    ]);

    for (const [input, output] of m) {
      expect(helpers.getOrdinal(input)).toStrictEqual(output);
    }
  });
});

describe("splitLines", () => {
  test("it exists", () => {
    expect(helpers.splitLines).toBeDefined();
  });

  test("is a function", () => {
    expect(typeof helpers.splitLines === "function").toStrictEqual(true);
  });

  test("splits a multiple-lined string into an array of strings", () => {
    const input = "test\ntest";
    const lines = helpers.splitLines(input);
    expect(lines.length).toStrictEqual(2);
    for (const e of lines) {
      expect(typeof e === "string").toStrictEqual(true);
    }
  });

  test("removes the line breaks from each string", () => {
    const input = "test\nvalue\n";
    const lines = helpers.splitLines(input);
    expect(lines[0]).toStrictEqual("test");
    expect(lines[1]).toStrictEqual("value");
    expect(lines[2]).toStrictEqual("");
  });

  test("optionally takes a second parameter that preserves those line breaks", () => {
    const input = "test\nvalue\n";
    const lines = helpers.splitLines(input, true);
    expect(lines.length).toStrictEqual(3);
    expect(lines[0]).toStrictEqual("test\n");
    expect(lines[1]).toStrictEqual("value\n");
    expect(lines[2]).toStrictEqual("");
  });

  test("never loses the last line if it is empty", () => {
    const input = "test\nvalue\n\n";
    const r1 = helpers.splitLines(input);
    expect(r1.length).toStrictEqual(4);
    const r2 = helpers.splitLines(input, true);
    expect(r2.length).toStrictEqual(4);
  });

  test("correctly handles strings that don't end with a line break", () => {
    const input = "test\nvalue";
    const r1 = helpers.splitLines(input);
    expect(r1.length).toStrictEqual(2);
    expect(r1[0]).toStrictEqual("test");
    expect(r1[1]).toStrictEqual("value");
    const r2 = helpers.splitLines(input, true);
    expect(r2.length).toStrictEqual(2);
    expect(r2[0]).toStrictEqual("test\n");
    expect(r2[1]).toStrictEqual("value");
  });

  test("correctly handles CRLF line endings", () => {
    const input = "test\r\nvalue";
    const r1 = helpers.splitLines(input);
    expect(r1[0]).toStrictEqual("test");
    expect(r1[1]).toStrictEqual("value");
    expect(r1.length).toStrictEqual(2);
    const r2 = helpers.splitLines(input, true);
    expect(r2[0]).toStrictEqual("test\r\n");
    expect(r2[1]).toStrictEqual("value");
    expect(r2.length).toStrictEqual(2);
  });
});

describe("equalArrays", () => {
  test("it exists", () => {
    expect(helpers.equalArrays).toBeDefined();
  });

  test("is a function", () => {
    expect(typeof helpers.equalArrays === "function").toStrictEqual(true);
  });

  test("compares two arrays, returning true if each ordered value is equal", () => {
    const a1 = [1, 2];
    const a2 = [1, 2];
    expect(helpers.equalArrays(a1, a2)).toStrictEqual(true);
  });

  test("returns true if given the same array twice", () => {
    const a = [1, 2];
    expect(helpers.equalArrays(a, a)).toStrictEqual(true);
  });

  test("returns false if array values are unequal", () => {
    const a1 = [1, 2];
    const a2 = [3, 4];
    expect(helpers.equalArrays(a1, a2)).toStrictEqual(false);
  });

  test("takes all values into account when testing for inequality", () => {
    const a1 = [1, 2, 3];
    const a2 = [1, 2, 2];
    expect(helpers.equalArrays(a1, a2)).toStrictEqual(false);
  });

  test("returns false if otherwise equal arrays have unequal length", () => {
    const a1 = [1, 2];
    const a2 = [1, 2, 3];
    expect(helpers.equalArrays(a1, a2)).toStrictEqual(false);
  });
});

describe("uniqueArrayMerge", () => {
  test("it exists", () => {
    expect(helpers.uniqueArrayMerge).toBeDefined();
  });

  test("is a function", () => {
    expect(typeof helpers.uniqueArrayMerge === "function").toStrictEqual(true);
  });

  test("merges two arrays another array", () => {
    const a1 = [1, 2];
    const a2 = [3, 4, 5];
    const result = helpers.uniqueArrayMerge(a1, a2);
    expect(result instanceof Array).toStrictEqual(true);
    expect(result.length).toStrictEqual(5);
    expect(result.includes(1)).toStrictEqual(true);
  });

  test("places the first array's elements before the second's elements", () => {
    const a1 = [1, 2];
    const a2 = [3, 4];
    const result = helpers.uniqueArrayMerge(a1, a2);
    expect(result[0]).toStrictEqual(1);
    expect(result[1]).toStrictEqual(2);
    expect(result[2]).toStrictEqual(3);
    expect(result[3]).toStrictEqual(4);
  });

  test("removes duplicate values during the merger", () => {
    const a1 = [1, 2];
    const a2 = [2, 3];
    const result = helpers.uniqueArrayMerge(a1, a2);
    expect(result.length).toStrictEqual(3);
    expect(result[0]).toStrictEqual(1);
    expect(result[1]).toStrictEqual(2);
    expect(result[2]).toStrictEqual(3);
  });

  test("returns a shallow copy", () => {
    const a1 = [{ a: 1 }];
    const a2 = [{ a: 2 }];
    const result = helpers.uniqueArrayMerge(a1, a2);
    a1.push({ a: 3 });
    expect(result.length).toStrictEqual(2);
    a1[0].a = 2;
    expect(result[0].a).toStrictEqual(2);
  });

  test("correctly handles being given the same array twice", () => {
    const a = [1, 2];
    const result = helpers.uniqueArrayMerge(a, a);
    expect(result.length).toStrictEqual(2);
    expect(result[0]).toStrictEqual(1);
    expect(result[1]).toStrictEqual(2);
  });

  test("does not throw when given empty arrays", () => {
    // tslint:disable-next-line:no-any
    const a1: any = [];
    // tslint:disable-next-line:no-any
    const a2: any = [];
    expect(() => {
      helpers.uniqueArrayMerge(a1, a2);
    }).not.toThrow();
  });
});

describe("stylizedArrayJoin", () => {
  test("it exists", () => {
    expect(helpers.stylizedArrayJoin).toBeDefined();
  });

  test("is a function", () => {
    expect(typeof helpers.stylizedArrayJoin === "function").toStrictEqual(true);
  });

  test("returns a stylized string representation of the given array", () => {
    const a = [1, 2, 3];
    expect(helpers.stylizedArrayJoin(a)).toStrictEqual("1, 2, and 3");
  });

  test("correctly handles arrays containing strings", () => {
    const a = ["one", "two", "three"];
    expect(helpers.stylizedArrayJoin(a)).toStrictEqual("one, two, and three");
  });

  test("correctly handles an array containing a single value", () => {
    expect(helpers.stylizedArrayJoin([1])).toStrictEqual("1");
    expect(helpers.stylizedArrayJoin(["test"])).toStrictEqual("test");
  });

  test("correctly handles an array containing two values", () => {
    const a = [1, 2];
    expect(helpers.stylizedArrayJoin(a)).toStrictEqual("1 and 2");
  });

  test("correctly handles mixed value arrays", () => {
    const a = [1, "test"];
    expect(helpers.stylizedArrayJoin(a)).toStrictEqual("1 and test");
  });

  test("returns an empty string if given an empty array", () => {
    expect(helpers.stylizedArrayJoin([])).toStrictEqual("");
  });

  test("has a second parameter that switches the 'and' to 'or'", () => {
    expect(helpers.stylizedArrayJoin([1, 2], true)).toStrictEqual("1 or 2");
    expect(helpers.stylizedArrayJoin([1, 2, 3], true)).toStrictEqual("1, 2, or 3");
  });
});
