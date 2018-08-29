/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { CharacterCodes } from ".";
import { Position } from "../types";

interface ITokenParser {
  isNumber(): boolean;
  // consumeNumber(): Node;

  isBoolean(): boolean;
  // consumeBoolean(): Node;

  isOperator(): boolean;
  // consumeOperator(): Node;

  // isWord(): boolean;
  // consumeWord(): Node;

  // isKeyword(): boolean;
  // consumeKeyword(): Node;

  // isString(): boolean;
  // consumeString(): Node;

  // isComment(): boolean;
  // consumeComment(): Node;

  // isSingleLineWhitespace(): boolean;
  // consumeSingleLineWhitespace(): Node;

  // isLineBreak(): boolean;
  // consumeLineBreak(): Node;

  // isDisallowedWhitespace(): boolean;
  // consumeDisallowedWhitespace(): Node;

  // consumeLine(): Node;

  // isEndOfFile(): void;
}

/**
 * Returns whether the given character code represents the spacing between tokens.
 * @param ch A character code.
 * @return A boolean indicating whether the character code can separate tokens.
 */
export function isTokenSeparatingWhitespace(ch: number): boolean {
  return ch === CharacterCodes.space ||
    ch === CharacterCodes.tab ||
    ch === CharacterCodes.verticalTab ||
    ch === CharacterCodes.noBreakSpace ||
    ch >= CharacterCodes.enQuad && ch <= CharacterCodes.hairSpace ||
    ch === CharacterCodes.narrowNoBreakSpace ||
    ch === CharacterCodes.ideographicSpace ||
    ch === CharacterCodes.mathematicalSpace ||
    ch === CharacterCodes.ogham ||
    ch === CharacterCodes.formFeed ||
    ch === CharacterCodes.byteOrderMark;
}

/**
 * Returns whether the given character code represents a line breaker.
 * @param ch A character code.
 * @return A boolean indicating whether the character code causes a line break.
 */
export function isLineBreakingWhitespace(ch: number): boolean {
  return ch === CharacterCodes.lineFeed;
}

/**
 * Returns whether the given character code represents disallowed whitespace.
 * @param ch A character code.
 * @return A boolean indicating whether the character code is a disallowed whitespace.
 */
export function isDisallowedWhitespace(ch: number): boolean {
  return ch === CharacterCodes.lineSeparator ||
    ch === CharacterCodes.paragraphSeparator ||
    ch === CharacterCodes.nextLine ||
    ch === CharacterCodes.zeroWidthSpace;
}

/**
 * Returns whether the given character code represents a numerical digit.
 * @param ch A character code.
 * @return A boolean indicating whether the character code represents a numerical digit.
 */
export function isDigit(ch: number): boolean {
  return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}

/**
 * Returns whether the given character code represents an alphabetical character.
 *
 * This does not handle unicode characters.
 * @param ch A character code.
 * @return A boolean indicating whether the character code represents an alphabetic character.
 */
export function isAlphabetical(ch: number): boolean {
  return (ch >= CharacterCodes.a && ch <= CharacterCodes.z) ||
    (ch >= CharacterCodes.A && ch <= CharacterCodes.Z);
}

/**
 * Returns whether the given character code is valid within an item filter word value.
 * @param ch A character code.
 * @return A boolean indicating whether the character code is valid within a word.
 */
export function isValidWordCharacter(ch: number): boolean {
  return isAlphabetical(ch) || isDigit(ch) || ch === CharacterCodes.openParen ||
    ch === CharacterCodes.closeParen || ch === CharacterCodes.minus ||
    ch === CharacterCodes.latinSmallOWithDiaeresis;
}

/**
 * Returns the character index for the position within the text.
 * @param text The full text containing the given position.
 * @param position A position within the given text.
 * @return The position's index within the text.
 */
export function getCharacterIndexForPosition(text: string, position: Position): number {
  let characterIndex = 0;

  // We need to determine the line length of each preceding line in order to
  // calculate its true index within the text.
  for (let line = 0; line < position.line; line++) {
    while (!isLineBreakingWhitespace(text.charCodeAt(characterIndex))) {
      // We were given an off-the-end line position.
      if (characterIndex === text.length) {
        throw new Error(`line '${position.line}' exceeds text's maximum of '${line}'`);
      }

      characterIndex++;
    }

    characterIndex++;
  }

  // Ensure that we weren't given an off-the-end character position.
  let idx = 0;
  while (characterIndex !== text.length) {
    if (position.character === idx) {
      return characterIndex;
    }

    // This index would actually fall on the next line, meaning this position
    // is invalid.
    if (isLineBreakingWhitespace(text.charCodeAt(characterIndex))) {
      throw new Error(`character index of '${position.character}' does not fall on ` +
        `line '${position.line}'`);
    }

    idx++;
    characterIndex++;
  }

  throw new Error(`character index of '${position.character}' exceeds the line's ` +
    `max index of '${idx - 1}'`);
}

/**
 * A high-performance, forward-iterating token parser. This class is designed
 * to facilitate the creation of top-down item filter parsers.
*/
export class TokenParser implements ITokenParser {
  private readonly _text: string;
  private readonly _startPosition: Position;
  private readonly _currentPosition: Position;
  private readonly _characterIndex: number;

  constructor(text: string, position?: Position) {
    this._text = text;
    this._startPosition = position ? position : { line: 0, character: 0 };
    this._currentPosition = {
      line: this._startPosition.line,
      character: this._startPosition.character
    };
    this._characterIndex = position ? getCharacterIndexForPosition(text, position) : 0;
  }

  /**
   * Determines whether the token under the current position is a number.
   * @return A boolean indicating whether the next token is a number.
   */
  isNumber(): boolean {
    let result = this._parseToken();

    if (!result) {
      return false;
    }

    let [_, token] = result;
    for (let i = 0; i < token.length; i++) {
      const ch = token.charCodeAt(i);

      if (!isDigit(ch)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Determines whether the token under the current position is a boolean.
   * @return A boolean indicating whether the next token is a boolean.
   */
  isBoolean(): boolean {
    let result = this._parseToken();

    if (!result) {
      return false;
    }

    let [_, token] = result;
    if (token === "True" || token === "False" || token === '"True"' || token === '"False"') {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Determines whether the token under the current position is an operator.
   * @return A boolean indicating whether the next token is an operator.
   */
  isOperator(): boolean {
    let result = this._parseToken();

    if (!result) {
      return false;
    }

    let [_, token] = result;
    if (token.length === 1) {
      const ch = token.charCodeAt(0);

      return ch === CharacterCodes.greaterThan || ch === CharacterCodes.lessThan ||
        ch === CharacterCodes.equals;
    } else if (token.length === 2) {
      const left = token.charCodeAt(0);
      const right = token.charCodeAt(1);

      return (left === CharacterCodes.greaterThan && right === CharacterCodes.equals) ||
        (left === CharacterCodes.lessThan && right === CharacterCodes.equals);
    }

    return false;
  }

  /**
   * Determines whether the token under the current position is a word.
   * @return A boolean indicating whether the next token is a word.
   */
  // isWord(): boolean {
  //   let result = this._parseToken();

  //   if (!result) {
  //     return false;
  //   }

  //   let [_, token] = result;
  //   for ()
  // }

  /**
   * Attempts to parse a string token from the current position in the text
   * without modifying the state of the parser.
   * @returns A tuple containing the end index and the token text if a token parsed successfully.
   */
  private _parseToken(): [number, string] | undefined {
    const startIdx = this._characterIndex;
    let endIdx = startIdx;

    let token = "";
    while (endIdx < this._text.length) {
      const ch = this._text.charCodeAt(endIdx);

      if (isLineBreakingWhitespace(ch) || isTokenSeparatingWhitespace(ch)) {
        break;
      }

      token += String.fromCharCode(ch);
      endIdx++;
    }

    if (token.length === 0) {
      return undefined;
    }

    return [endIdx, this._text.slice(startIdx, endIdx)];
  }
}
