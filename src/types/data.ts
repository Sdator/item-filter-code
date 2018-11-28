/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

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
      max: number
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
  minimapIcons: {
    sizes: number[];
    colors: string[];
    shapes: string[];
  };
  dropEffects: {
    colors: string[];
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

export interface SoundEffectData {
  [key: string]: string;
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
  prefixes: string[];
  suffixes: string[];
}

export interface ImageData {
  [key: string]: string | undefined;
}
