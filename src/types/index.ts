/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Range } from "vscode-languageserver";

export { SoundNotification, SoundNotificationParams } from "./notifications";

export interface Configuration {
  "item-filter": ConfigurationValues;
}

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
  extraClasses: string[];
}

export interface ModData {
  full: {
    prefixes: string[];
    suffixes: string[];
  }
  limited: {
    prefixes: string[];
    suffixes: string[];
  }
}

export interface SoundInformation {
  knownIdentifier: boolean;
  identifier: string;
  volume: number;
  range: Range;
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
