/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export * from "./data";

export type Result<T> = T | Promise<T>;

/** Represents a line and character position, such as the position of the cursor. */
export interface Position {
  /** The zero-based line value. */
  line: number;

  /** The zero-based character value. */
  character: number;
}

/** A range represents an ordered pair of two positions. */
export interface Range {
  /** The start position. It is before or equal to the `end`. */
  start: Position;

  /** The end position. It is after or equal to the `start`. */
  end: Position;
}

/** Represents a color in RGBA space. */
export interface Color {
  /** The red component of this color in the range [0-1]. */
  red: number;

  /** The green component of this color in the range [0-1]. */
  green: number;

  /** The blue component of this color in the range [0-1]. */
  blue: number;

  /** The alpha component of this color in the range [0-1]. */
  alpha: number;
}

/** The diagnostic's severity. */
export enum DiagnosticSeverity {
  /** Reports an error. */
  Error = 1,

  /** Reports a warning. */
  Warning = 2,

  /** Reports an information. */
  Information = 3,

  /** Reports a hint. */
  Hint = 4
}

/** Represents a diagnostic, such as a compiler error or warning. */
export interface Diagnostic {
  /** The range at which the message applies. */
  range: Range;

  /**
   * The diagnostic's severity. Can be omitted. If omitted it is up to the
   * client to interpret diagnostics as error, warning, info or hint.
   */
  severity?: DiagnosticSeverity;

  /** The diagnostic's message. */
  message: string;
}

/** Represents a color range from a document. */
export interface ColorInformation {
  /** The range in the document where this color appers. */
  range: Range;

  /** The actual color value for this color range. */
  color: Color;
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
  verifyCustomSounds: boolean;
  windowsDocumentFolder: string;
}

export interface SoundInformation {
  knownIdentifier: boolean;
  identifier: string;
  volume: number;
  range: Range;
}

export interface FilterContext {
  config: ConfigurationValues;
  blockFound: boolean;
}

export enum FilterOperator {
  Equals,
  GreaterThan,
  GreaterThanEquals,
  LessThan,
  LessThanEquals
}

export interface BlockContext {
  root?: Range;
  classes: string[];
  previousRules: Map<string, number>;
}

/** Determines whether the given entity is an Error. */
// tslint:disable-next-line:no-any
export function isError(entity: any): entity is Error {
  if (entity != null && entity instanceof Error) return true;
  else return false;
}
