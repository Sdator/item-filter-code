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

/** A unique item within Path of Exile. */
export interface UniqueItem {
  /** The name of the unique item. */
  name: string;
  /** The boss that drops the unique item. */
  boss?: string;
  /** The league that this unique item is tied to. */
  league?: string | string[];
  /** The location that this unique item is specific to.  */
  location?: string;
}

/** Unique item information for Path of Exile. */
export interface UniqueData {
  /** An item base and its associated unique items. */
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
