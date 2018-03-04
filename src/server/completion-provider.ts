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

import { ConfigurationValues, ItemData, FilterData, SuggestionData } from "../types";
import {
  whitespaceRegex, whitespaceCharacterRegex, bypassEqOperator, bypassOperator,
  getKeyword, getStringRangeAtPosition
} from "./line-utilities";

const itemData: ItemData = require("../../items.json");
const filterData: FilterData = require("../../filter.json");
const suggestionData: SuggestionData = require("../../suggestions.json");

/**
 * Synchronously returns completion suggestions for the given position in the
 * text document.
 * @param document The document to provide completion suggestions for.
 * @param position The context within the document to provide suggestions for.
 */
export function getCompletionSuggestions(config: ConfigurationValues, lineText: string,
  position: Position): CompletionItem[] {

  const keywordResult = getKeyword(lineText, position.line);

  if (keywordResult) {
    const [keyword, keywordRange] = keywordResult;

    if (position.character < keywordRange.start.character) {
      return getKeywordCompletions(config, position);
    } else if (position.character <= keywordRange.end.character) {
      const start: Position = { line: position.line, character: keywordRange.start.character };
      const end: Position = { line: position.line, character: keywordRange.end.character };
      return getKeywordCompletions(config, start, end);
    }

    const currentIndex = keywordRange.end.character;
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
      case "ElderMap":
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
  };
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

  for (const extraSuggestion of suggestionData.extraClasses) {
    if (typeof(extraSuggestion) === "string") {
      result.push(completionForStringRange(extraSuggestion, valueRange));
    } else {
      result.push({
        label: `${extraSuggestion.name}`,
        filterText: `"${extraSuggestion.name}"`,
        kind: CompletionItemKind.Text,
        textEdit: {
          newText: `${extraSuggestion.text}`,
          range: valueRange
        }
      });
    }
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

  for (const extraSuggestion of suggestionData.extraBases) {
    if (typeof(extraSuggestion) === "string") {
      result.push(completionForStringRange(extraSuggestion, valueRange));
    } else {
      result.push({
        label: `${extraSuggestion.name}`,
        filterText: `"${extraSuggestion.name}"`,
        kind: CompletionItemKind.Text,
        textEdit: {
          newText: `${extraSuggestion.text}`,
          range: valueRange
        }
      });
    }
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
