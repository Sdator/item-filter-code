/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Range } from "./range";

export { AssertUnreachable } from "./helpers";
export { Overseer } from "./overseer";
export { Point } from "./point";
export { Range } from "./range";

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
}

export enum CompletionResultType {
  Block,
  Rule,
  Rarity,
  Class,
  BaseType,
  Boolean,
  Color,
  Sound
}

export interface CompletionResult {
  text: string;
  displayText?: string;
  type: CompletionResultType;
}

export interface LinterMessage {}

export interface TextChange {
  lines: string[];
  range: Range;
}
