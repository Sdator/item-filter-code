/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  ruleWhitelist: string[];
  soundWhitelist: string[];
  performanceHints: boolean;
  alwaysShowAlpha: boolean;
}

export interface ItemData {
  classesToBases: { [key: string]: string[] };
  basesToClasses: { [key: string]: string };
  classes: string[];
  sortedBases: string[];
  sortedBasesIndices: number[];
}

export interface FilterData {
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

interface UniqueItem {
  name: string;
	boss?: string;
	league?: string;
	leagues?: string[];
	location?: string;
}

export interface UniqueData {
  [itemBase: string]: Array<string|UniqueItem>;
}

interface Suggestion {
	name: string;
	text: string;
}

export interface SuggestionData {
	extraBases: Array<string|Suggestion>;
	extraClasses: Array<string|Suggestion>;
}
