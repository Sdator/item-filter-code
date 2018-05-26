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

import * as path from "path";

import {
  CompletionItem, CompletionItemKind, Position, Range
} from "vscode-languageserver";

import { dataRoot } from "../common";
import { ConfigurationValues, ItemData, FilterData, SuggestionData } from "../types";
import { whitespaceRegex, ContextParser } from "./parsers";

const itemData = <ItemData> require(path.join(dataRoot, "items.json"));
const filterData = <FilterData>require(path.join(dataRoot, "filter.json"));
const suggestionData = <SuggestionData> require(path.join(dataRoot, "suggestions.json"));

const whitespaceCharacterRegex = /\s/;

/**
 * Synchronously returns completion suggestions for the given position in the
 * text document.
 * @param document The document to provide completion suggestions for.
 * @param position The context within the document to provide suggestions for.
 */
export function getCompletionSuggestions(config: ConfigurationValues, lineText: string,
  position: Position): CompletionItem[] {

  const parser = new ContextParser(lineText, position);
  const keyword = parser.getKeyword();

  if (keyword) {
    if (position.character < keyword.range.start.character) {
      return getKeywordCompletions(config, position);
    } else if (position.character <= keyword.range.end.character) {
      const start: Position = { line: position.line, character: keyword.range.start.character };
      const end: Position = { line: position.line, character: keyword.range.end.character };
      return getKeywordCompletions(config, start, end);
    }

    switch (keyword.text) {
      case "Class":
        return getClassCompletions(config, parser);
      case "BaseType":
        return getBaseCompletions(config, parser);
      case "PlayAlertSound":
      case "PlayAlertSoundPositional":
        return getAlertSoundCompletions(config, parser);
      case "Rarity":
        return getRarityCompletions(parser);
      case "Identified":
      case "Corrupted":
      case "ElderItem":
      case "ShaperItem":
      case "ShapedMap":
      case "ElderMap":
      case "DisableDropSound":
        return getBooleanCompletions(parser);
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

function getClassCompletions(config: ConfigurationValues, parser: ContextParser): CompletionItem[] {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex()) return [];

  const range = parser.getStringRangeAtRequestPosition();

  const result: CompletionItem[] = [];

  for (const c in itemData.classesToBases) {
    result.push(completionForStringRange(c, range));
  }

  for (const wlc of config.classWhitelist) {
    const suggestion = completionForStringRange(wlc, range);
    suggestion.kind = CompletionItemKind.Reference;
    result.push(suggestion);
  }

  for (const extraSuggestion of suggestionData.extraClasses) {
    if (typeof(extraSuggestion) === "string") {
      result.push(completionForStringRange(extraSuggestion, range));
    } else {
      result.push({
        label: `${extraSuggestion.name}`,
        filterText: `"${extraSuggestion.name}"`,
        kind: CompletionItemKind.Text,
        textEdit: {
          newText: `${extraSuggestion.text}`,
          range
        }
      });
    }
  }

  return result;
}

function getBaseCompletions(config: ConfigurationValues, parser: ContextParser): CompletionItem[] {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex()) return [];

  const range = parser.getStringRangeAtRequestPosition();

  const result: CompletionItem[] = [];
  for (const b of itemData.sortedBases) {
    result.push(completionForStringRange(b, range));
  }

  for (const wlb of config.baseWhitelist) {
    const suggestion = completionForStringRange(wlb, range);
    suggestion.kind = CompletionItemKind.Reference;
    result.push(suggestion);
  }

  for (const extraSuggestion of suggestionData.extraBases) {
    if (typeof (extraSuggestion) === "string") {
      result.push(completionForStringRange(extraSuggestion, range));
    } else {
      result.push({
        label: `${extraSuggestion.name}`,
        filterText: `"${extraSuggestion.name}"`,
        kind: CompletionItemKind.Text,
        textEdit: {
          newText: `${extraSuggestion.text}`,
          range
        }
      });
    }
  }

  return result;
}

function getAlertSoundCompletions(config: ConfigurationValues, parser: ContextParser):
  CompletionItem[] {

  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex() || !parser.isFirstValue()) {
    return [];
  }

  const range = parser.getStringRangeAtRequestPosition();

  const result: CompletionItem[] = [];
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

function getRarityCompletions(parser: ContextParser): CompletionItem[] {
  parser.bypassOperator();

  if (parser.isBeforeCurrentIndex() || !parser.isFirstValue()) return [];

  const range = parser.getStringRangeAtRequestPosition();

  const result: CompletionItem[] = [];
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

function getBooleanCompletions(parser: ContextParser): CompletionItem[] {
  parser.bypassOperator(true);

  if (parser.isBeforeCurrentIndex() || !parser.isFirstValue()) return [];

  const result: CompletionItem[] = [];
  const range = parser.getStringRangeAtRequestPosition();
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
