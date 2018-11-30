/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

/** The common properties for the value types. */
interface SharedValueProperties {
  /** How the client interprets quotation marks surrounding the value. */
  quotes: "optional" | "required" | "never";
}

/** An integer value for an item filter rule. */
export interface IntegerValue extends SharedValueProperties {
  /** The range of valid values. */
  range: {
    /** The minimum possible value. */
    min: number;
    /** The maximum possible value. */
    max: number;
  };
}

/** A word value for an item filter rule that is verified against a list of values. */
export interface WordValue extends SharedValueProperties {
  /** Whether this word is case sensitive. */
  caseSensitive: boolean;
  /** Whether values can be partially matched. */
  partial: boolean;
  /** Either a reference or a list of valid values. */
  pick: string | string[];
}

/** A word value, comprised only of specified characters, for an item filter rule. */
export interface ComprisedWordValue extends SharedValueProperties {
  /** Whether this word is case sensitive. */
  caseSensitive: boolean;
  /** The characters that the word may be comprised of. */
  composition: string[];
}

/** A value for an item filter rule. */
export type Value = IntegerValue | WordValue | ComprisedWordValue;

/** A parameter for an item filter rule. */
export interface Parameter {
  /** A description of this parameter. */
  description: string;
  /** Whether this is a reoccurring parameter for this rule. */
  repeating: boolean;
  /** Whether this parameter is optional. */
  optional: boolean;
  /** The value of the parameter. */
  value: Value | Value[];
}

/** A rule to be supported within item filters. */
export interface Rule {
  /** The keyword for this rule. */
  keyword: string;
  /** The description of this rule. */
  description: string;
  /** The level of support for operators with this rule. */
  operator: "any" | "none" | "ignored";
  /** The parameters for this rule. */
  parameters: Parameter[];
  /** How the client interprets trailing text for this rule. */
  trailingText: "skip" | "comment" | "error";
  /** The number of times a rule may appear within a block. */
  blockLimit: number;
}

/** A block to be supported within item filters. */
export interface Block {
  /** The keyword for this block. */
  keyword: string;
  /** The description for this block. */
  description: string;
  /** How the client interprets trailing text for this block. */
  trailingText: "skip" | "comment" | "error";
}

/** Parsing information detailing an item filter and its constructs. */
export interface FilterParseData {
  /** A list of blocks supported within an item filter. */
  blocks: Block[];
  /** A list of rules supported within an item filter. */
  rules: Rule[];
}
