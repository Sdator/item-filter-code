/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";

/** The root path of the project. */
export const projectRoot = path.join(__dirname, "..", "..");

/** The root path of the output directory. */
export const outputRoot = path.join(projectRoot, "out");

/** The root path of the data output directory. */
export const dataOutputRoot = path.join(outputRoot, "data");

/** The root path of the assets directory. */
export const assetRoot = path.join(projectRoot, "assets");

/** The root path of the tools directory. */
export const toolsRoot = path.join(assetRoot, "tools");

/** The root path of the sound effects directory. */
export const sfxRoot = path.join(assetRoot, "sfx");

/**
 * A TypeScript-only check allowing us to implement things like exhaustive
 * switch statements.
 */
export function assertUnreachable(_: never): never {
  return _;
}

/**
 * Returns the ordinal representation of the given number. For example, the ordinal
 * representation of `1` would be `1st`.
 */
export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  // tslint:disable-next-line:restrict-plus-operands
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Splits the given text into lines.
 *
 * **NOTE**: only supports LF and CRLF.
 * @param text The text to be split into lines.
 * @param lineBreaks Whether to preserve the line breaks at the end of each line.
 * @return The lines contained within the text.
 */
export function splitLines(text: string, lineBreaks?: boolean): string[] {
  if (lineBreaks) {
    const splitResult = text.split(/([^\n]*(?:\r?\n|$))/g);
    const filterResult = splitResult.filter(value => value.length !== 0);

    // We lose the last line if it's completely empty above, so we need to add it
    // back in.
    const index = text.lastIndexOf("\n") + 1;
    if (text[index] === undefined) {
      filterResult.push("");
    }

    return filterResult;
  } else {
    return text.split(/\r?\n/g);
  }
}

/** Determines whether the two given arrays are strictly equal. */
export function equalArrays<T>(lha: T[], rha: T[]): boolean {
  if (lha === rha) return true;
  if (lha.length !== rha.length) return false;

  for (let i = 0; i < lha.length; i++) {
    if (lha[i] !== rha[i]) return false;
  }

  return true;
}

/**
 * Returns a merger of the two given arrays with duplicates removed.
 *
 * The arrays are merged shallowly, with references to values maintained.
 * @param lha The first array, whose values will appear first in the merged array.
 * @param rha The second array.
 * @returns A new array containing the unique elements from the given arrays.
 */
export function uniqueArrayMerge<T>(lha: T[], rha: T[]): T[] {
  const result = lha.slice();

  for (const value of rha) {
    if (result.includes(value)) {
      continue;
    } else {
      result.push(value);
    }
  }

  return result;
}

/**
 * Returns a stylized representation of the given array. Given `[1, 2, 3]`, this
 * function would by default return `"1, 2, and 3"`.
 * @param values The array, expected to contain only numbers and strings.
 * @param exclusive Whether the values of the array are exclusive. Essentially,
 * whether to use "or" instead of "and".
 * @return A string representation of the given array.
 */
export function stylizedArrayJoin(values: Array<string | number>, exclusive?: boolean): string {
  if (values.length === 0) {
    return "";
  } else if (values.length === 1) {
    return `${values[0]}`;
  } else {
    const divider: string = values.length === 2 ? (exclusive ? " or " : " and ") :
      (exclusive ? ", or " : ", and ");

    return `${values.slice(0, -1).join(", ")}${divider}${values.slice(-1)}`;
  }
}
