/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import { Position, Range } from "vscode-languageserver";

import { TokenParser } from "./index";

export const whitespaceRegex = /^\s*$/;
const keywordRegex = /^(\s*)([A-Z]+)(?=\s|$)/i;

export interface TextResult {
  /** The text of the keyword. */
  text: string;

  /** The range of the keyword on the line. */
  range: Range;
}

/**
 * A parser useful when trying to establish the context of a position on a line
 * of text.
 */
export class ContextParser {
  /** Whether we've attempted to parse the keyword for this text already. */
  private attemptedKeywordParse: boolean;

  /** Whether we've attempted to parse the operator for this text already. */
  private attemptedOperatorParse: boolean;

  /** The current character index of the parser. */
  private currentIndex: number;

  /** The position at which the context was requested. */
  private readonly requestPosition: Position;

  /** The text for the line on which the context was requested. */
  private readonly text: string;

  /** The keyword found on the line, if one has been previously parsed. */
  keyword: TextResult | undefined;

  /**
   * Constructs a new ContextParser instance.
   * @param text The full, unmodified line of text we're establishing context on.
   * @param row The zero-indexed row for that line of text within the editor.
   */
  constructor(text: string, position: Position) {
    this.text = text;
    this.requestPosition = position;
    this.currentIndex = 0;
    this.attemptedKeywordParse = false;
    this.attemptedOperatorParse = false;
  }

  /**
   * Attempts to parse a keyword from the given line.
   * @return If found, returns an interface containing the text for the keyword
   * as well as its range on the range.
   */
  getKeyword(): TextResult | undefined {
    const keywordResult = keywordRegex.exec(this.text);
    this.attemptedKeywordParse = true;
    if (keywordResult) {
      const leadingWSLength = keywordResult[1].length;
      const keyword = keywordResult[2];
      const startIndex = leadingWSLength;
      const endIndex = leadingWSLength + keyword.length;
      const result: TextResult = {
        text: keywordResult[2],
        range: {
          start: { character: startIndex, line: this.requestPosition.line },
          end: { character: endIndex, line: this.requestPosition.line }
        }
      };

      this.keyword = result;
      this.currentIndex = endIndex;

      return result;
    } else {
      return undefined;
    }
  }

  /**
   * Bypasses all equality operators and whitespace prior to the first potential
   * value of the filter rule.
   * @param equalityOnly Set to true if the rule only supports the equality operator.
   * @return The index to the first entity that follows, or undefined is one
   *  doesn't exist.
   */
  bypassOperator(equalityOnly = false): number {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");

    this.attemptedOperatorParse = true;

    const remainingCharacters = this.text.length - (this.currentIndex + 1);
    for (let i = 1; i <= remainingCharacters; i++) {
      const character = this.text.charAt(this.currentIndex + i);

      if (!equalityOnly && character === ">" || character === "<") {
        let nextCharacter = this.text.charAt(this.currentIndex + i + 1);
        if (nextCharacter === "=") {
          nextCharacter = this.text.charAt(this.currentIndex + i + 2);
          if (whitespaceRegex.test(nextCharacter)) {
            // This will result in two increments, thus bypassing a two-character operator.
            i++;
          } else {
            // We don't have an operator with a space following, so we cant bypass it.
            return this.currentIndex;
          }
        } else {
          // Bypass the operator by allowing the for loop to increment normally.
          continue;
        }
      } else if (character === "=" || whitespaceRegex.test(character)) {
        continue;
      } else {
        this.currentIndex += i;
        return this.currentIndex;
      }
    }

    this.currentIndex += remainingCharacters;
    return this.currentIndex;
  }

  /** Returns the range of the next word within the text, if it exists. */
  getNextNumberRange(): Range | undefined {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");
    assert(this.attemptedOperatorParse, "should have parsed the operator beforehand");
    assert(!this.isBeforeCurrentIndex(), "expected to be able to scan backwards to the " +
      "current index.");

    const tokenParser = new TokenParser(this.text.slice(this.currentIndex),
      this.requestPosition.line);
    const number = tokenParser.nextNumber();

    if (number) {
      number.range.start.character += this.currentIndex;
      number.range.end.character += this.currentIndex;
      this.currentIndex += tokenParser.currentIndex;
      return number.range;
    } else {
      return undefined;
    }
  }

  getNextStringRange(): Range | undefined {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");
    assert(this.attemptedOperatorParse, "should have parsed the operator beforehand");
    assert(!this.isBeforeCurrentIndex(), "expected to be able to scan backwards to the " +
      "current index.");

    const tokenParser = new TokenParser(this.text.slice(this.currentIndex),
      this.requestPosition.line);
    const str = tokenParser.nextString();

    if (str) {
      str.range.start.character += this.currentIndex;
      str.range.end.character += this.currentIndex;
      this.currentIndex += tokenParser.currentIndex;
      return str.range;
    } else {
      return undefined;
    }
  }

  /**
   * Returns the range for the word directly under the position within the given
   * text.
   */
  getWordRangeAtRequestPosition(): Range {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");
    assert(this.attemptedOperatorParse, "should have parsed the operator beforehand");
    assert(!this.isBeforeCurrentIndex(), "expected to be able to scan backwards to the " +
      "current index.");

    let forwardsIndex = this.requestPosition.character;
    let forwardsWS = false;
    while (forwardsIndex < this.text.length) {
      const character = this.text.charAt(forwardsIndex);
      if (whitespaceRegex.test(character)) {
        forwardsWS = true;
        break;
      }
      forwardsIndex++;
    }

    let startIndex: number;
    const endIndex = forwardsWS ? forwardsIndex - 1 : forwardsIndex;

    // Ensure that we can actually tranverse backwards without hitting the current
    // index of the parser.
    if (this.currentIndex < this.requestPosition.character) {
      let backwardsIndex = this.requestPosition.character - 1;
      let backwardsWS = false;

      while (backwardsIndex > this.currentIndex) {
        const character = this.text.charAt(backwardsIndex);
        if (whitespaceRegex.test(character)) {
          backwardsWS = true;
          break;
        }
        backwardsIndex--;
      }

      startIndex = backwardsWS ? backwardsIndex + 1 : backwardsIndex;
    } else {
      startIndex = this.currentIndex;
    }

    return {
      start: { line: this.requestPosition.line, character: startIndex },
      end: { line: this.requestPosition.line, character: endIndex }
    };
  }

  /**
   * Returns the range for the string starting at the given character index within
   * the text for the line.
   * @param start The zero-based character index at which the string value starts.
   */
  getStringRangeAt(start: number): Range {
    // This will replace the entire line if the user has a string value without
    // a closing quotation mark, but there's really no way to prevent this without
    // this function return inaccurate values and using VSCode behavior as a
    // crutch.
    for (let i = start + 1; i < this.text.length; i++) {
      const character = this.text.charAt(i);
      if (character === '"') {
        return {
          start: {
            line: this.requestPosition.line,
            character: start
          },
          end: {
            line: this.requestPosition.line,
            character: i + 1
          }
        };
      }
    }

    return {
      start: {
        line: this.requestPosition.line,
        character: start
      },
      end: {
        line: this.requestPosition.line,
        character: this.text.length
      }
    };
  }

  /**
   * Returns the range for the string directly under the position within the
   * text for the line.
   */
  getStringRangeAtRequestPosition(): Range {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");
    assert(this.attemptedOperatorParse, "should have parsed the operator beforehand");
    assert(!this.isBeforeCurrentIndex(), "expected to be able to scan backwards to the " +
      "current index.");

    let openQuotation = false;
    let quotationOpenIndex: number | undefined;
    let quotationCloseIndex: number | undefined;
    for (let i = this.currentIndex; i < this.requestPosition.character; i++) {
      const character = this.text.charAt(i);
      if (character === '"') {
        if (openQuotation) {
          openQuotation = false;
          quotationCloseIndex = i;
        } else {
          openQuotation = true;
          quotationOpenIndex = i;
        }
      }
    }

    if (openQuotation) {
      // Open quotation, meaning we have an open index.
      return this.getStringRangeAt(quotationOpenIndex as number);
    } else if (quotationCloseIndex === this.requestPosition.character - 1) {
      // If there was a quotation close index, then there was also an open index.
      return {
        start: {
          line: this.requestPosition.line,
          character: quotationOpenIndex as number
        },
        end: {
          line: this.requestPosition.line,
          character: quotationCloseIndex
        }
      };
    } else {
      return this.getWordRangeAtRequestPosition();
    }
  }

  /**
   * Returns the string contents for the given range within the text for the line.
   * @param range
   */
  getStringAtRange(range: Range): string {
    return this.text.slice(range.start.character, range.end.character);
  }

  /** Returns whether the request position has been passed by the parser already. */
  isBeforeCurrentIndex(): boolean {
    return this.requestPosition.character < this.currentIndex;
  }

  /** Returns whether the request position preceeds the range of the keyword. */
  isBeforeKeyword(): boolean {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");

    if (this.keyword == null) {
      return false;
    } else {
      return this.keyword.range.start.character > this.requestPosition.character;
    }
  }

  /** Returns whether the request position falls within the range of the keyword. */
  isWithinKeyword(): boolean {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");

    if (this.keyword == null) {
      return false;
    } else {
      return this.keyword.range.start.character <= this.requestPosition.character &&
        this.keyword.range.end.character > this.requestPosition.character;
    }
  }

  /** Returns whether the request positions falls within the given range. */
  isWithinRange(range: Range): boolean {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");
    assert(this.attemptedOperatorParse, "should have parsed the operator beforehand");

    return this.requestPosition.character >= range.start.character &&
    this.requestPosition.character <= range.end.character;
  }

  /**
   * Determines whether or not a value at the request position would be the first
   * value for the line.
   */
  isFirstValue(): boolean {
    assert(this.attemptedKeywordParse, "should have parsed the keyword beforehand");
    assert(this.attemptedOperatorParse, "should have parsed the operator beforehand");
    assert(!this.isBeforeCurrentIndex(), "expected to be able to scan backwards to the " +
      "current index.");

    let whitespaceFound = false;
    for (let i = this.requestPosition.character - 1; i > this.currentIndex; i--) {
      const character = this.text.charAt(i);
      if (whitespaceRegex.test(character)) {
        whitespaceFound = true;
      } else {
        if (whitespaceFound) return false;
      }
    }
    return true;
  }
}
