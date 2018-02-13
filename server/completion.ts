/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// The most accurate way to actually provide autocompletions for an item filter
// is to simply parse the entire line in order to figure out the context. We
// don't have to worry about other lines at all with item filters, which makes
// this fast and easy. This also means that we don't have to wait for data from
// the item filter parser, as we can parse independently.
//
// Filtering suggestions based on block constraints would be intrusive and
// is better handled through diagnostics.

import {
  CompletionItem, CompletionItemKind, Position, Range, TextDocument
} from "vscode-languageserver";

import { ruleKeywords, ItemData, ConfigurationValues } from "./common";

const itemData: ItemData = require("../items.json");

const whitespaceRegex = /^\s*$/;
const whitespaceCharacterRegex = /\s/;
const nonwhitespaceCharacterRegex = /\S/;
const equalityOpRegex = /=/;

/**
 * Synchronously returns completion suggestions for the given position in the
 * text document.
 * @param document The document to provide completion suggestions for.
 * @param position The context within the document to provide suggestions for.
 */
export function getCompletionSuggestions(config: ConfigurationValues, document: TextDocument,
  position: Position): CompletionItem[] {

  const lines = document.getText().split(/\r?\n/g);
  const lineText = lines[position.line];
  const keywordRegex = /^\s*[A-Z]+(?=\s|$)/i;
  const wordRegex = /[A-Z]+(?=\s|$)/i;

  const hasKeyword = keywordRegex.test(lineText);

  if (hasKeyword) {
    const keywordResult = wordRegex.exec(lineText);
    if (!keywordResult) return [];

    const keyword = keywordResult[0];
    const keywordStartIndex = keywordResult.index;
    const keywordEndIndex = keywordStartIndex + keyword.length;

    if (position.character < keywordStartIndex) {
      return getKeywordCompletions(position);
    } else if (position.character >= keywordStartIndex && position.character <= keywordEndIndex) {
      const range: Range = {
        start: { line: position.line, character: keywordStartIndex },
        end: { line: position.line, character: keywordEndIndex }
      };
      return getFilteredKeywordCompletions(position, keyword, range);
    }

    const currentIndex = keywordEndIndex;
    switch (keyword) {
      case "Class":
        return getClassCompletions(config, position, lineText, currentIndex);
      case "BaseType":
        return getBaseCompletions(config, position, lineText, currentIndex);
      default:
        return [];
    }
  } else {
    const isEmpty = whitespaceRegex.test(lineText);
    if (isEmpty) return getKeywordCompletions(position);

    let foundContent = false;
    let contentStartIndex: number | undefined;
    for (let i = 0; i <= position.character; i++) {
      const character = lineText.charAt(i);
      if (whitespaceCharacterRegex.test(character)) {
        // The position is preceded by some unknown entity, so we cant provide
        // any meaningful suggestions.
        if (foundContent) return [];
      } else {
        if (foundContent) continue;
        foundContent = true;
        contentStartIndex = i;
      }
    }

    if (foundContent) {
      // This is a very rare case. It's when we're editing an invalid keyword
      // into a valid one and request autocompletion results. For instance,
      // we might have "BaseT|42" as the value, where | is the position. Note
      // that "BaseT| 42" would be caught by a case above.
      //
      // Other packages generally don't provide completions for this case, so
      // we wont either.
      return [];
    } else {
      // Stuff towards the end of the line, with a request for completions at
      // the beginning.
      return getKeywordCompletions(position);
    }
  }
}

function keywordToCompletionItem(text: string, range: Range): CompletionItem {
  return {
    label: text,
    kind: CompletionItemKind.Property,
    textEdit: {
      newText: text,
      range
    }
  };
}

function getKeywordCompletions(pos: Position): CompletionItem[] {
  const result: CompletionItem[] = [];
  const range: Range = {
    start: { line: pos.line, character: pos.character },
    end: { line: pos.line, character: pos.character }
  };

  for (const k of ruleKeywords) {
    result.push(keywordToCompletionItem(k, range));
  }

  return result;
}

function getFilteredKeywordCompletions(pos: Position, text: string, range: Range):
  CompletionItem[] {

  const result: CompletionItem[] = [];

  for (const k of ruleKeywords) {
    if (k.includes(text)) {
      result.push(keywordToCompletionItem(k, range));
    }
  }

  return result;
}

/**
 * Bypasses all operators and whitespace prior to the first potential value of
 * the filter rule.
 * @param text The line text we're parsing.
 * @param index The current index for the line. This should generally be the
 *  very first space following the keyword.
 * @return The index to the first entity that follows, or undefined is one
 *  doesn't exist.
 */
function bypassEqOperator(text: string, index: number): number | undefined {
  // All rules accept an optional operator, which we need to bypass first. We
  // also need to verify that there even is a value while we're at it.
  let remainingCharacters = text.length - (index + 1);
  for (let i = 1; i <= remainingCharacters; i++) {
    const character = text[i + index];
    if (!equalityOpRegex.test(character) && !whitespaceRegex.test(character)) {
      return index + i;
    }
  }

  return undefined;
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
      if (start !== undefined) {
        start = undefined;
      } else {
        start = i;
      }
    }
  }

  return start;
}

/** Returns the string directly under the position within the given text. */
function getStringText(pos: Position, text: string, index: number): string {
  const result = getStringContext(pos, text, index);
  const character = text[pos.character];
  const priorCharacter = text[pos.character - 1];

  let value: string;
  if (result) {
    // The position is within a quoted string.
    const endIndex = text.indexOf('"', result + 1);
    value = text.slice(result + 1, endIndex - result); // Cut the quotes.
  } else if (character === undefined || whitespaceCharacterRegex.test(character)) {
    // We're following a value.
    const croppedText = text.slice(0, pos.character);
    if (priorCharacter === '"') {
      const startIndex = croppedText.lastIndexOf('"', pos.character - 2);
      const endIndex = pos.character;
      value = text.slice(startIndex + 1, endIndex - 1); // Cut the quotes.
    } else {
      let startIndex: number = 0;
      const endIndex = pos.character;

      for (let i = endIndex - 1; i > 0; i--) {
        const c = text[i];
        if (whitespaceCharacterRegex.test(c)) {
          startIndex = i + 1;
          break;
        }
      }

      value = text.slice(startIndex, endIndex);
    }
  } else if (whitespaceCharacterRegex.test(priorCharacter)) {
    // We're at the start of a value.
    if (character === '"') {
      const startIndex = pos.character;
      const endIndex = text.indexOf('"', pos.character + 1);
      value = text.slice(startIndex + 1, endIndex); // Cut the quotes.
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

      value = text.slice(startIndex, endIndex + 1);
    }
  } else {
    let startIndex: number = 0;
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

    value = text.slice(startIndex, endIndex + 1);
  }

  // We finally have a value...
  return value;
}

function completionFromClassText(text: string): CompletionItem {
  return {
    label: text,
    insertText: `"${text}"`,
    kind: CompletionItemKind.Value
  };
}

function completionFromBaseText(text: string): CompletionItem {
  return {
    label: text,
    insertText: `"${text}"`,
    kind: CompletionItemKind.Value
  }
}

function getClassCompletions(config: ConfigurationValues, pos: Position, text: string,
  index: number): CompletionItem[] {

  const result: CompletionItem[] = [];
  const valueIndex = bypassEqOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    for (const c in itemData.classesToBases) {
      result.push(completionFromClassText(c));
    }
    return result;
  }

  const value = getStringText(pos, text, valueIndex);

  for (const c in itemData.classesToBases) {
    if (value !== "") {
      if (!c.includes(value)) continue;
    }
    result.push(completionFromClassText(c));
  }

  for (const wlc of config.classWhitelist) {
    const suggestion = completionFromClassText(wlc);
    suggestion.kind = CompletionItemKind.Reference;
    result.push(suggestion);
  }
  return result;
}

function getBaseCompletions(config: ConfigurationValues, pos: Position, text: string,
  index: number): CompletionItem[] {

  const result: CompletionItem[] = [];
  const valueIndex = bypassEqOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    for (const c in itemData.sortedBases) {
      result.push(completionFromBaseText(c));
    }
    return result;
  }

  const value = getStringText(pos, text, valueIndex);

  for (const b of itemData.sortedBases) {
    result.push(completionFromBaseText(b));
  }

  for (const wlb of config.baseWhitelist) {
    const suggestion = completionFromBaseText(wlb);
    suggestion.kind = CompletionItemKind.Reference;
    result.push(suggestion);
  }
  return result;
}
