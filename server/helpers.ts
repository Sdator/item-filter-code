/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

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
