/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Utilities for working with lines within an item filter.

import { Position, Range } from "vscode-languageserver";

export const whitespaceRegex = /^\s*$/;
export const whitespaceCharacterRegex = /\s/;
export const equalityOpRegex = /=/;
export const keywordRegex = /^\s*[A-Z]+(?=\s|$)/i;
export const wordRegex = /[A-Z]+(?=\s|$)/i;

/**
 * Bypasses all equality operators and whitespace prior to the first potential
 * value of the filter rule.
 * @param text The line text we're parsing.
 * @param index The current index for the line. This should generally be the
 *  very first space following the keyword.
 * @return The index to the first entity that follows, or undefined is one
 *  doesn't exist.
 */
export function bypassEqOperator(text: string, index: number): number | undefined {
  // All rules accept an optional operator, which we need to bypass first. We
  // also need to verify that there even is a value while we're at it.
  const remainingCharacters = text.length - (index + 1);
  for (let i = 1; i <= remainingCharacters; i++) {
    const character = text[i + index];
    if (!equalityOpRegex.test(character) && !whitespaceRegex.test(character)) {
      return index + i;
    }
  }

  return undefined;
}

/**
 * Bypasses all equality operators and whitespace prior to the first potential
 * value of the filter rule.
 * @param text The line text we're parsing.
 * @param index The current index for the line. This should generally be the
 *  very first space following the keyword.
 * @return The index to the first entity that follows, or undefined is one
 *  doesn't exist.
 */
export function bypassOperator(text: string, index: number): number | undefined {
  // All rules accept an optional operator, which we need to bypass first. We
  // also need to verify that there even is a value while we're at it.
  const remainingCharacters = text.length - (index + 1);
  const singleCharOperators = /^(>|=|<)(?=\s)/;
  const dualCharOperators = /^(>=|<=)(?=\s)/;
  for (let i = 1; i <= remainingCharacters; i++) {
    const remainingText = text.slice(i + index);
    if (dualCharOperators.test(remainingText)) {
      i++;
      continue;
    } else if (singleCharOperators.test(remainingText)) {
      continue;
    } else {
      const character = text[i + index];
      if (!whitespaceRegex.test(character)) return index + i;
    }
  }

  return undefined;
}

/**
 * Attempts to parse a keyword from the given line.
 * @param text The line of text within the item filter.
 * @param line The line number associated with the given text.
 * @return If found, a tuple containing the keyword and its range. If not found,
 * undefined.
 */
export function getKeyword(text: string, line: number): [string, Range] | undefined {
  if (!keywordRegex.test(text)) return undefined;

  const keywordResult = wordRegex.exec(text);
  if (!keywordResult) return undefined;

  const keyword = keywordResult[0];
  const startIndex = keywordResult.index;
  const endIndex = startIndex + keyword.length;

  const range: Range = {
    start: { line, character: startIndex },
    end: { line, character: endIndex }
  };

  return [keyword, range];
}

/**
 * Determines the context for the string at the given position. Returns a number
 * with the start index of the opening quotation mark if the position is to be
 * contained within a quotation pairing.
 */
function getStringContext(position: Position, text: string, index: number): number | undefined {
  let start: number | undefined;

  for (let i = index; i < position.character; i++) {
    const character = text.charAt(i);

    if (character === '"') {
      start = start === undefined ? i : undefined;
    }
  }

  return start;
}

/**
 * Returns the range for the string directly under the position within the given
 * text. This function assumes that the given index is that of the first value.
 */
export function getStringRangeAtPosition(pos: Position, text: string, index: number): Range {
  const result = getStringContext(pos, text, index);
  const character = text[pos.character];
  const priorCharacter = text[pos.character - 1];

  let range: Range;
  if (result) {
    // The position is within a quoted string.
    let endIndex = text.indexOf('"', result + 1);
    if (endIndex === -1) {
      for (let i = result; i < text.length; i++) {
        const c = text[i];
        if (whitespaceCharacterRegex.test(c)) {
          endIndex = i - 1;
          break;
        }
      }
      if (endIndex === -1) endIndex = text.length - 1;
    }
    range = {
      start: { line: pos.line, character: result },
      end: { line: pos.line, character: endIndex + 1 }
    };
  } else if (character === undefined || whitespaceCharacterRegex.test(character)) {
    // We're following a value.
    const croppedText = text.slice(0, pos.character);
    if (priorCharacter === '"') {
      const startIndex = croppedText.lastIndexOf('"', pos.character - 2);
      const endIndex = pos.character;
      range = {
        start: { line: pos.line, character: startIndex },
        end: { line: pos.line, character: endIndex }
      };
    } else {
      let startIndex = 0;
      const endIndex = pos.character;

      for (let i = endIndex - 1; i > 0; i--) {
        const c = text[i];
        if (whitespaceCharacterRegex.test(c)) {
          startIndex = i + 1;
          break;
        }
      }

      range = {
        start: { line: pos.line, character: startIndex },
        end: { line: pos.line, character: endIndex + 1 }
      };
    }
  } else if (whitespaceCharacterRegex.test(priorCharacter)) {
    // We're at the start of a value.
    if (character === '"') {
      const startIndex = pos.character;
      const endIndex = text.indexOf('"', pos.character + 1);
      range = {
        start: { line: pos.line, character: startIndex },
        end: { line: pos.line, character: endIndex + 1 }
      };
    } else {
      const startIndex = pos.character;
      let endIndex: number | undefined;

      for (let i = startIndex; i < text.length; i++) {
        const c = text[i];
        if (whitespaceCharacterRegex.test(c)) {
          endIndex = i - 1;
          break;
        }
      }
      if (endIndex === undefined) endIndex = text.length - 1;

      range = {
        start: { line: pos.line, character: startIndex },
        end: { line: pos.line, character: endIndex + 1 }
      };
    }
  } else {
    let startIndex = 0;
    let endIndex: number | undefined;

    for (let i = pos.character - 1; i > 0; i--) {
      const c = text[i];
      if (whitespaceCharacterRegex.test(c)) {
        startIndex = i + 1;
        break;
      }
    }

    for (let i = startIndex; i < text.length; i++) {
      const c = text[i];
      if (whitespaceCharacterRegex.test(c)) {
        endIndex = i - 1;
        break;
      }
    }
    if (endIndex === undefined) endIndex = text.length - 1;

    range = {
      start: { line: pos.line, character: startIndex },
      end: { line: pos.line, character: endIndex + 1 }
    };
  }

  return range;
}
