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
