/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Position, Range } from "../types";

const keywordRegex = /^(\s*)([A-Z]+)(?=\s|$)/i;
const whitespaceCharacterRegex = /\s/;

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
  // There's essentially no sense in bypassing an operator if the remaining
  // line is empty, so we also assert that there's a value beyond the operator
  // within this function.

  if (index >= text.length) return undefined;

  let equalityFound = false;
  for (let i = index; i < text.length; i++) {
    const character = text.charAt(i);
    if (character === "=") {
      if (equalityFound) {
        return undefined;
      } else {
        equalityFound = true;
      }
    } else if (!whitespaceCharacterRegex.test(character)) {
      return i;
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
  if (index >= text.length) return undefined;

  let operatorFound = false;
  for (let i = index; i < text.length; i++) {
    const character = text.charAt(i);
    const characters = text.substr(i, 2);

    if (characters === ">=" || characters === "<=") {
      if (operatorFound) {
        return undefined;
      } else {
        operatorFound = true;
        i++;
      }
    } else if (character === "=" || character === ">" || character === "<") {
      if (operatorFound) {
        return undefined;
      } else {
        operatorFound = true;
      }
    } else if (!whitespaceCharacterRegex.test(character)) {
      return i;
    }
  }

  return undefined;
}

/**
 * Skips all whitespace, returning the index immediately preceding the first
 * non-whitespace character.
 * @param text The line text we're parsing.
 * @param index The current index for the line.
 * @return The index immediately preceding the first non-whitespace character.
 */
export function bypassWhitespace(text: string, index: number): number {
  while (index < text.length) {
    const character = text.charAt(index);

    if (!whitespaceCharacterRegex.test(character)) {
      return index - 1;
    }

    index++;
  }

  return index;
}

/**
 * Attempts to parse a keyword from the given line.
 * @param text The line of text within the item filter.
 * @param line The line number associated with the given text.
 * @return If found, a tuple containing the keyword and its range. If not found,
 * undefined.
 */
export function getKeyword(text: string, line: number): [string, Range] | undefined {
  const keywordResult = keywordRegex.exec(text);
  if (keywordResult == null) return undefined;

  const keyword = keywordResult[2];
  const startIndex = keywordResult[1].length;
  const endIndex = startIndex + keyword.length;

  const range: Range = {
    start: { line, character: startIndex },
    end: { line, character: endIndex }
  };

  return [keyword, range];
}

/**
 * Returns the range for the next value at or beyond the given index within the text.
 * @param text The text for the entire line.
 * @param line The row of this line within the document.
 * @param index The index at which to begin searching for a value within that text.
 */
export function getNextValueRange(text: string, line: number, index: number): Range | undefined {
  let quotationOpenIndex: number | undefined;
  let wordStartIndex: number | undefined;

  if (index >= text.length) return undefined;

  for (let i = index; i < text.length; i++) {
    const character = text.charAt(i);

    if (character === '"') {
      if (quotationOpenIndex == null) {
        quotationOpenIndex = i;
        continue;
      } else {
        return {
          start: {
            line, character: quotationOpenIndex
          },
          end: {
            line, character: i
          }
        };
      }
    } else if (whitespaceCharacterRegex.test(character)) {
      if (quotationOpenIndex != null) {
        continue;
      } else if (wordStartIndex == null) {
        continue;
      } else {
        return {
          start: {
            line, character: wordStartIndex
          },
          end: {
            line, character: i - 1
          }
        };
      }
    } else {
      if (quotationOpenIndex == null && wordStartIndex == null) {
        wordStartIndex = i;
      }
    }
  }

  if (quotationOpenIndex != null) {
    return {
      start: {
        line, character: quotationOpenIndex
      },
      end: {
        line, character: text.length - 1
      }
    };
  } else if (wordStartIndex != null) {
    return {
      start: {
        line, character: wordStartIndex
      },
      end: {
        line, character: text.length - 1
      }
    };
  } else {
    return undefined;
  }
}

/**
 * Returns whether a position lies within the given value range.
 * @param valueRange The range of the value that may contain the position.
 * @param pos The position of the request.
 */
export function isNextValue(valueRange: Range, pos: Position): boolean {
  return pos.character >= valueRange.start.character &&
    pos.character <= valueRange.end.character + 1;
}
