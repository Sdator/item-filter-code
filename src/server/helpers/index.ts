/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Position } from "vscode-languageserver";

import { isError } from "../../common";

export function assertUnreachable(_: never): never {
  throw new Error("Should never hit this assertion at runtime.");
}

export function equalArrays<T>(lha: T[], rha: T[]): boolean {
  if (lha === rha) return true;
  if (lha.length !== rha.length) return false;

  for (let i = 0; i < lha.length; i++) {
    if (lha[i] !== rha[i]) return false;
  }

  return true;
}

export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  // tslint:disable-next-line:restrict-plus-operands
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// tslint:disable-next-line:no-any
export function stylizedArrayJoin(array: any[], finalPrefix = ", and "): string {
  if (array.length === 0) {
    return "";
  } else if (array.length === 1) {
    return `${array[0]}`;
  } else {
    return `${array.slice(0, -1).join(", ")}${finalPrefix} ${array.slice(-1)}`;
  }
}

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/g);
}

/**
 * Splits the given text into lines, while preserving the linebreak at the end
 * of each of those lines.
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

export function atSamePosition(lha: Position, rha: Position): boolean {
  if (lha.line === rha.line && lha.character === rha.character) return true;
  return false;
}

// These two functions are originally from the following source file:
// https://github.com/Microsoft/vscode/blob/1.20.1/extensions/css/server/src/utils/errors.ts
//
// They are subject to the following license:
//  Copyright (c) Microsoft Corporation. All rights reserved.
//  Licensed under the MIT License. See License.txt in the project root for license information.
export function formatError(message: string, err: Error|string): string {
  if (err instanceof Error) {
    const error = err;
    return `${message}: ${error.message}\n${error.stack}`;
  } else if (typeof err === "string") {
    return `${message}: ${err}`;
  }

  return message;
}
export function runSafe<T>(func: () => Thenable<T> | T, errorVal: T,
  errorMessage: string): Thenable<T> | T {

  try {
    const t = func();
    if (t instanceof Promise) {
      return t.then(void 0, e => {
        if (isError(e) || typeof(e) === "string") {
        console.error(formatError(errorMessage, e));
        }
        return errorVal;
      });
    }
    return t;
  } catch (e) {
    if (isError(e) || typeof(e) === "string") {
    console.error(formatError(errorMessage, e));
    }
    return errorVal;
  }
}
