/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Range } from "vscode-languageserver";

export { SoundNotification, SoundNotificationParams } from "./notifications";

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  ruleWhitelist: string[];
  soundWhitelist: string[];
  performanceHints: boolean;
  alwaysShowAlpha: boolean;
}

export type Result<T> = T | Promise<T>;

export interface ItemData {
  classesToBases: { [key: string]: string[] };
  basesToClasses: { [key: string]: string };
  classes: string[];
  sortedBases: string[];
  sortedBasesIndices: number[];
}

export interface FilterData {
  keywordDescriptions: { [keyword: string]: string };
  rules: string[];
  ruleLimits: { [key: string]: number };
  ruleRanges: {
    [key: string]: {
      min: number,
      max: number,
      additionals?: number[]
    }
  };
  rarities: string[];
  booleans: string[];
  sounds: {
    numberIdentifier: {
      min: number,
      max: number
    },
    stringIdentifiers: { [key: string]: string }
  };
}

export interface TestRunnerOptions {
  enabled?: boolean;
  relativeCoverageDir: string;
  relativeSourcePath: string;
  ignorePatterns: string[];
  includePid?: boolean;
  reports?: string[];
  verbose?: boolean;
}

export interface UniqueItem {
  name: string;
  boss?: string;
  league?: string;
  leagues?: string[];
  location?: string;
}

export interface UniqueData {
  [itemBase: string]: Array<string | UniqueItem>;
}

interface Suggestion {
  name: string;
  text: string;
}

export interface SuggestionData {
  extraBases: Array<string | Suggestion>;
  extraClasses: Array<string | Suggestion>;
}

export interface SoundInformation {
  knownIdentifier: boolean;
  identifier: string;
  volume: number;
  range: Range;
}
