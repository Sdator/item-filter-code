/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";

/** The root path of the project. */
export const projectRoot = path.join(__dirname, "..", "..", "..");

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
 * Returns the ordinal representation of the given number. For example, the ordinal
 * representation of `1` would be `1st`.
 */
export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  // tslint:disable-next-line:restrict-plus-operands
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Splits the given text into lines. Only supports LF and CRLF. */
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/g);
}

/**
 * Splits the given text into lines, while preserving the line break at the end
 * of each of those lines. Only supports LF and CRLF.
 * @param text The text to be split into lines.
 * @return The lines contained within the text.
 */
export function splitLinesWithBreaks(text: string): string[] {
  const splitResult = text.split(/([^\n]*(?:\r?\n|$))/g);
  const filterResult = splitResult.filter(value => value.length !== 0);

  // We lose the last line if it's completely empty above, so we need to add it
  // back in.
  const index = text.lastIndexOf("\n") + 1;
  if (text[index] === undefined) {
    filterResult.push("");
  }

  return filterResult;
}

/**
 * Returns a stylized representation of the given array. Given `[1, 2, 3]`, this
 * function would by default return `"1, 2, and 3"`.
 * @param array The array, expected to contain only primitive types.
 * @param finalDivider Allows you to optionally set the text for the final divider.
 * @return A string representation of the given array.
 */
// tslint:disable:no-unsafe-any
// tslint:disable-next-line:no-any
export function stylizedArrayJoin(array: any, finalDivider = ", and "): string {
  if (array.length === 0) {
    return "";
  } else if (array.length === 1) {
    return `${array[0]}`;
  } else {
    return `${array.slice(0, -1).join(", ")}${finalDivider}${array.slice(-1)}`;
  }
}
// tslint:enable:no-unsafe-any
