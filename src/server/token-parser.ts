/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Range } from "vscode-languageserver";

const numberRegex = /^(\s*)([-0-9]+)(\s|$)/;
const wordRegex = /^(\s*)([A-Za-z\u00F6]+)(\s|$)/;
const stringRegex = /^(\s*)("[^"]*"|[^\s\"\'><=]+)(\s|$)/;
const commentRegex = /^(\s*)((#.*\S+)|(#\s*))(\s*)$/;
const operatorRegex = /^(\s*)(<=|>=|=|<|>){1}(\s+|$)/;
const booleanRegex = /^(\s*)("true"|true|"false"|false)(\s+|$)/i;

const quotationRegex = /^(")([^\"]*)(")$/;
const textRegex = /\S+/;
const eolRegex = /(\r|\n)/;
const surroundingWSRegex = /^(\s*)(.*\S)\s*$/;

export interface ParseResult<T> {
  value: T;
  range: Range;
}

/** Parses item filter tokens from a line. */
export class TokenParser {
  text: string;
  readonly originalLength: number;
  readonly row: number;
  readonly textStartIndex: number;
  readonly textEndIndex: number;
  currentIndex: number;
  empty: boolean;

  constructor(text: string, row: number) {
    if (eolRegex.test(text)) throw new Error("string spans multiple lines");

    this.text = text;
    this.row = row;
    this.currentIndex = 0;
    this.originalLength = text.length;

    if (textRegex.test(text)) {
      const surroundingResult = surroundingWSRegex.exec(text);
      if (!surroundingResult) throw new Error("unexpected RegExp result");

      this.textStartIndex = surroundingResult[1].length;
      this.textEndIndex = this.textStartIndex + surroundingResult[2].length;
      this.empty = false;
    } else {
      this.textStartIndex = 0;
      this.textEndIndex = 0;
      this.empty = true;
    }
  }

  /**
   * Returns whether or not the internal text value would be considered a
   * comment by Path of Exile.
   */
  isCommented() {
    const result = this.text.search(commentRegex);
    if (result === -1) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Returns whether or not the internal text string would be ignored entirely
   * by Path of Exile.
   */
  isIgnored() {
    if (this.empty || this.isCommented()) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Parses a single value from the given line using the given Regular Expression.
   * @param regex The regular expression to use to parse the value.
   * @return Returns a ParseResult if a value was found, otherwise null.
   */
  parseSingleValue(regex: RegExp): ParseResult<string>|undefined {
    const regexResult = regex.exec(this.text);
    if (!regexResult) return undefined;

    const leadingWS = regexResult[1];
    const value = regexResult[2];
    const shiftBy = leadingWS.length + value.length;
    const range: Range = {
      start: { line: this.row, character: this.currentIndex + leadingWS.length },
      end: { line: this.row, character: this.currentIndex + shiftBy }
    };

    this.text = this.text.substr(shiftBy);
    this.currentIndex += shiftBy;

    if (!textRegex.test(this.text)) {
      this.empty = true;
    }

    return { value, range };
  }

  /** Parses a number if one is next on the line. */
  nextNumber(): ParseResult<number>|undefined {
    const result = this.parseSingleValue(numberRegex);

    if (result) {
      const value = parseInt(result.value, 10);
      const range = result.range;
      return { value, range };
    } else {
      return undefined;
    }
  }

  /** Parses a boolean if one is next on the line. */
  nextBoolean(): ParseResult<boolean>|undefined {
    const result = this.parseSingleValue(booleanRegex);

    // Booleans are case-insensitive, and may be surrounded by either single or
    // double quotation marks.
    if (result) {
      const value = result.value.toLowerCase().indexOf("true") === -1 ? false : true;
      const range = result.range;
      return { value, range };
    } else {
      return undefined;
    }
  }

  /** Parses an next operator if one is next on the line. */
  nextOperator(): ParseResult<string>|undefined {
    return this.parseSingleValue(operatorRegex);
  }

  /**
   * Parses a word if one is next on the line.
   * A word is considered a string of letters from any langauge.
   */
  nextWord(): ParseResult<string>|undefined {
    return this.parseSingleValue(wordRegex);
  }

  /**
   * Parses a string if one is next on the line.
   * Strings containing multiple words must be contained within double quotation marks.
   */
  nextString(): ParseResult<string>|undefined {
    const result = this.parseSingleValue(stringRegex);

    if (result) {
      const quotationResult = quotationRegex.exec(result.value);
      if (quotationResult) result.value = quotationResult[2];
      return result;
    } else {
      return undefined;
    }
  }

  /**
   * Parses a comment if one is next on the line.
   * A comment consumes the remainder of the line.
   */
  parseComment(): ParseResult<string>|undefined {
    return this.parseSingleValue(commentRegex);
  }
}
