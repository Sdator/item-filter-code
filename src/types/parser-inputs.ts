/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Preliminary planning of the inputs for the next generation parser.

/** A value for an item filter rule. */
export interface Value {
  /** A description of the value. */
  description: string;
  /** Whether this value is required. */
  required: boolean;
  /** Whether this value is repeating. */
  repeating: boolean;
  /** Whether this value can be wrapped within double quotation marks. */
  quotable: boolean;
}

/** An integer value for an item filter rule. */
export interface IntegerValue extends Value {
  /** The range of valid values. */
  range: {
    /** The minimum possible value. */
    min: number;
    /** The maximum possible value. */
    max: number;
  };
}

/** A word value for an item filter rule. */
export interface WordValue extends Value {
  /** Whether this word is case sensitive. */
  caseSensitive: boolean;
  /** Either a reference or a list of valid values. */
  pick: string | string[];
}

/** An operator for an item filter rule. */
export interface Operator {
  /** Whether this rule requires an operator. */
  required: boolean;
  /** Whether this rule only accepts the equals operator. */
  equalsOnly: boolean;
  // TODO(glen): should we add equalsOnlyOnMulti?
}

export interface TrailingTextProperties {
  /** Whether trailing text should be marked as ignored by the client. */
  ignored: boolean;
  /** Whether a comment can appear on this line. */
  commented: boolean;
}

export interface Block {
  keyword: string;
  description: string;
  trail: TrailingTextProperties;
}

/** A rule to be supported within item filters. */
export interface Rule {
  /** The keyword for the rule. */
  keyword: string;
  /** The operator for the rule. */
  operator: Operator;
  /** The description of this rule. */
  description: string;
  /** The value information for this rule. */
  value: IntegerValue | WordValue;
  /** The trailing text information for this rule. */
  trail: TrailingTextProperties;
}

export interface FilterParseData {
  /** A list of blocks supported within an item filter. */
  blocks: Block[];
  /** A list of rules supported within an item filter. */
  rules: Rule[];
}
