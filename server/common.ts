/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  ruleWhitelist: string[];
  performanceHints: boolean;
  alwaysShowAlpha: boolean;
}

export interface Point {
  line: number;
  character: number;
}

export interface Stretch {
  position: Point;
  length: number;
}
