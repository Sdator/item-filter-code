/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Range } from "vscode";

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  ruleWhitelist: string[];
  soundWhitelist: string[];
  modWhitelist: string[];
  performanceHints: boolean;
  alwaysShowAlpha: boolean;
  limitedModPool: boolean;
  itemValueQuotes: boolean;
  booleanQuotes: boolean;
  rarityQuotes: boolean;
  modQuotes: boolean;
  linuxMPGAvailable: boolean;
  linuxMPGPath: string;
}

export interface PlaySoundOptions {
  id: string;
  volume: string;
}

export interface SoundInformation {
  knownIdentifier: boolean;
  identifier: string;
  volume: number;
  range: Range;
}
