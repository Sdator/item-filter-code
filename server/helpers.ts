/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Stretch } from "./common";
import { Range } from "vscode-languageserver";

export function assertUnreachable(_: never): never {
  throw new Error("Should never hit this assertion at runtime.");
}

export function stretchToRange(stretch: Stretch): Range {
  return {
    start: {
      line: stretch.position.line,
      character: stretch.position.character
    },
    end: {
      line: stretch.position.line,
      character: stretch.position.character + stretch.length - 1
    }
  };
}

export function rangeToStretch(range: Range): Stretch {
  const stretch: Stretch = {
    position: {
      line: range.start.line,
      character: range.start.character
    },
    length: range.end.character - range.start.character + 1
  };
  return stretch;
}

export function equalArrays<T>(lha: T[], rha: T[]): boolean {
  if (lha === rha) return true;
  if (lha.length !== rha.length) return false;

  for (let i = 0; i < lha.length; i++) {
    if (lha[i] !== rha[i]) return false;
  }

  return true;
}
