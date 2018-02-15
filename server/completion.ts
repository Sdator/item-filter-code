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

// TODO(glen): measure performance regarding filtering beforehand vs. just
//  letting VSCode do so. JSONRPC should have enough throughput that sending
//  over ~2000 suggestions shouldn't be an issue.

import {
  CompletionItem, CompletionItemKind, Position, Range
} from "vscode-languageserver";

import { ItemData, ConfigurationValues, FilterData } from "./common";

const itemData: ItemData = require("../items.json");
const filterData: FilterData = require("../filter.json");

const whitespaceRegex = /^\s*$/;
const whitespaceCharacterRegex = /\s/;
const equalityOpRegex = /=/;

/**
 * Synchronously returns completion suggestions for the given position in the
 * text document.
 * @param document The document to provide completion suggestions for.
 * @param position The context within the document to provide suggestions for.
 */
export function getCompletionSuggestions(config: ConfigurationValues, lineText: string,
  position: Position): CompletionItem[] {

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
      return getKeywordCompletions(config, position);
    } else if (position.character >= keywordStartIndex && position.character <= keywordEndIndex) {
      const start: Position = { line: position.line, character: keywordStartIndex };
      const end: Position = { line: position.line, character: keywordEndIndex };
      return getKeywordCompletions(config, start, end);
    }

    const currentIndex = keywordEndIndex;
    switch (keyword) {
      case "Class":
        return getClassCompletions(config, position, lineText, currentIndex);
      case "BaseType":
        return getBaseCompletions(config, position, lineText, currentIndex);
      case "PlayAlertSound":
      case "PlayAlertSoundPositional":
        return getAlertSoundCompletions(config, position, lineText, currentIndex);
      case "Rarity":
        return getRarityCompletions(position, lineText, currentIndex);
      case "Identified":
      case "Corrupted":
      case "ElderItem":
      case "ShaperItem":
      case "ShapedMap":
        return getBooleanCompletions(position, lineText, currentIndex);
      default:
        return [];
    }
  } else {
    const isEmpty = whitespaceRegex.test(lineText);
    if (isEmpty) return getKeywordCompletions(config, position);

    let foundContent = false;
    for (let i = 0; i <= position.character; i++) {
      const character = lineText.charAt(i);
      if (whitespaceCharacterRegex.test(character)) {
        // The position is preceded by some unknown entity, so we cant provide
        // any meaningful suggestions.
        if (foundContent) return [];
      } else {
        if (foundContent) continue;
        foundContent = true;
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
      return getKeywordCompletions(config, position);
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

function colorKeywordToCompletionItem(text: string, range: Range): CompletionItem {
  return {
    label: text,
    kind: CompletionItemKind.Property,
    textEdit: {
      newText: `${text} 255 255 255`,
      range
    }
  }
}

function getKeywordCompletions(config: ConfigurationValues, pos: Position,
  endPos?: Position): CompletionItem[] {

  const result: CompletionItem[] = [];

  let range: Range;
  if (endPos) {
    range = {
      start: pos,
      end: endPos
    };
  } else {
    range = {
      start: { line: pos.line, character: pos.character },
      end: { line: pos.line, character: pos.character }
    };
  }

  for (const k of filterData.rules) {
    if (k === "SetBorderColor" || k === "SetTextColor" || k === "SetBackgroundColor") {
      result.push(colorKeywordToCompletionItem(k, range));
    } else {
      result.push(keywordToCompletionItem(k, range));
    }
  }

  for (const wlk of config.ruleWhitelist) {
    result.push(keywordToCompletionItem(wlk, range));
  }

  return result;
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
function bypassEqOperator(text: string, index: number): number | undefined {
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
function bypassOperator(text: string, index: number): number | undefined {
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
 * Returns both the string and range for the string directly under the position
 * within the given text.
 *
 * This function assumes that the given index is that of the first value.
 */
function getStringRangeAtPosition(pos: Position, text: string, index: number): Range {

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

function completionForStringRange(text: string, range: Range): CompletionItem {
  return {
    label: `${text}`,
    filterText: `"${text}"`,
    kind: CompletionItemKind.Value,
    textEdit: {
      newText: `"${text}"`,
      range
    }
  };
}

function getClassCompletions(config: ConfigurationValues, pos: Position, text: string,
  index: number): CompletionItem[] {

  const result: CompletionItem[] = [];
  const valueIndex = bypassEqOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    for (const c in itemData.classesToBases) {
      result.push({
        label: c,
        insertText: `"${c}"`,
        kind: CompletionItemKind.Value
      });
    }

    for (const wlc of config.classWhitelist) {
      result.push({
        label: wlc,
        insertText: `"${wlc}"`,
        kind: CompletionItemKind.Reference
      });
    }

    return result;
  }

  const valueRange = getStringRangeAtPosition(pos, text, valueIndex);

  for (const c in itemData.classesToBases) {
    result.push(completionForStringRange(c, valueRange));
  }

  for (const wlc of config.classWhitelist) {
    const suggestion = completionForStringRange(wlc, valueRange);
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
    for (const c of itemData.sortedBases) {
      result.push({
        label: c,
        insertText: `"${c}"`,
        kind: CompletionItemKind.Value
      });
    }

    for (const wlb of config.baseWhitelist) {
      result.push({
        label: wlb,
        insertText: `"${wlb}"`,
        kind: CompletionItemKind.Reference
      });
    }

    return result;
  }

  const valueRange = getStringRangeAtPosition(pos, text, valueIndex);

  for (const b of itemData.sortedBases) {
    result.push(completionForStringRange(b, valueRange));
  }

  for (const wlb of config.baseWhitelist) {
    const suggestion = completionForStringRange(wlb, valueRange);
    suggestion.kind = CompletionItemKind.Reference;
    result.push(suggestion);
  }

  return result;
}

function getAlertSoundCompletions(config: ConfigurationValues, pos: Position, text: string,
  index: number): CompletionItem[] {

  const result: CompletionItem[] = [];
  const valueIndex = bypassEqOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    for (const id in filterData.sounds.stringIdentifiers) {
      const label = filterData.sounds.stringIdentifiers[id];
      result.push({
        label,
        insertText: id,
        kind: CompletionItemKind.Variable
      });
    }

    for (const wls of config.soundWhitelist) {
      result.push({
        label: wls,
        kind: CompletionItemKind.Reference
      });
    }

    return result;
  }

  // Get the range for the first value. The first value can only be either a
  // number or a word (without quotations).
  const startIndex = valueIndex;
  let endIndex: number | undefined;
  for (let i = startIndex; i < text.length; i++) {
    const c = text[i];
    if (whitespaceCharacterRegex.test(c)) {
      endIndex = i - 1;
      break;
    }
  }
  if (endIndex === undefined) endIndex = text.length - 1;
  if (pos.character > endIndex + 1) return result;

  const range: Range = {
    start: { line: pos.line, character: startIndex },
    end: { line: pos.line, character: endIndex + 1 }
  };

  for (const id in filterData.sounds.stringIdentifiers) {
    const label = filterData.sounds.stringIdentifiers[id];
    result.push({
      label,
      filterText: id,
      textEdit: {
        newText: id,
        range
      },

      kind: CompletionItemKind.Variable
    });
  }

  for (const wls of config.soundWhitelist) {
    result.push({
      label: wls,
      textEdit: {
        newText: wls,
        range
      }
    });
  }

  return result;
}

function getRarityCompletions(pos: Position, text: string, index: number): CompletionItem[] {
  const result: CompletionItem[] = [];
  const valueIndex = bypassOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    for (const rarity of filterData.rarities) {
      result.push({
        label: rarity,
        kind: CompletionItemKind.Variable
      });
    }

    return result;
  }

  // A rarity can appear with or without the quotation marks.
  const valuePosition: Position = { line: pos.line, character: valueIndex };
  const range = getStringRangeAtPosition(valuePosition, text, valueIndex);
  if (pos.character > range.end.character) return result;

  for (const r of filterData.rarities) {
    result.push({
      label: r,
      kind: CompletionItemKind.Variable,
      textEdit: {
        newText: r,
        range
      }
    });
  }

  return result;
}

function getBooleanCompletions(pos: Position, text: string, index: number): CompletionItem[] {
  const result: CompletionItem[] = [];
  const valueIndex = bypassOperator(text, index);

  if (valueIndex === undefined || pos.character < valueIndex) {
    for (const bool of filterData.booleans) {
      result.push({
        label: bool,
        kind: CompletionItemKind.Variable
      });
    }

    return result;
  }

  // A boolean can appear with or without quotation marks.
  const valuePosition: Position = { line: pos.line, character: valueIndex };
  const range = getStringRangeAtPosition(valuePosition, text, valueIndex);
  if (pos.character > range.end.character) return result;

  for (const bool of filterData.booleans) {
    result.push({
      label: bool,
      kind: CompletionItemKind.Value,
      textEdit: {
        newText: bool,
        range
      }
    });
  }

  return result;
}
