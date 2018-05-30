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
import { ConfigurationValues, ItemData, FilterData, ModData, SuggestionData } from "../types";
import * as parser from "./context-parsing";

const itemData = <ItemData>require(path.join(dataRoot, "items.json"));
const filterData = <FilterData>require(path.join(dataRoot, "filter.json"));
const suggestionData = <SuggestionData>require(path.join(dataRoot, "suggestions.json"));
const modData = <ModData>require(path.join(dataRoot, "mods.json"));

const whitespaceRegex = /^\s*$/;
const whitespaceCharacterRegex = /\s/;
const spaceRegex = / /;

/**
 * Synchronously returns completion suggestions for the given position in the
 * text document.
 * @param document The document to provide completion suggestions for.
 * @param position The context within the document to provide suggestions for.
 */
export function getCompletionSuggestions(config: ConfigurationValues, lineText: string,
  position: Position): CompletionItem[] {

  const keywordResult = parser.getKeyword(lineText, position.character);

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
        return getRarityCompletions(config, position, lineText, currentIndex);
      case "Identified":
      case "Corrupted":
      case "ElderItem":
      case "ShaperItem":
      case "ShapedMap":
      case "ElderMap":
      case "DisableDropSound":
        return getBooleanCompletions(config, position, lineText, currentIndex);
      case "HasExplicitMod":
        return getModCompletions(config, position, lineText, currentIndex);
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
    const suggestion = keywordToCompletionItem(wlk, range);
    suggestion.kind = CompletionItemKind.Reference;
    result.push(suggestion);
  }

  return result;
}

function completionForStringRange(text: string, range: Range, useQuotes: boolean):
  CompletionItem {

  return {
    label: text,
    filterText: `"${text}"`,
    kind: CompletionItemKind.Value,
    textEdit: {
      newText: spaceRegex.test(text) || useQuotes ? `"${text}"` : `${text}`,
      range
    }
  };
}

function getClassCompletions(config: ConfigurationValues, pos: Position,
  text: string, index: number): CompletionItem[] {

  const result: CompletionItem[] = [];

  let valueIndex = parser.bypassEqOperator(text, index);

  const pushCompletions = (range: Range) => {
    for (const c in itemData.classesToBases) {
      result.push(completionForStringRange(c, range, config.itemValueQuotes));
    }

    for (const wlc of config.classWhitelist) {
      const suggestion = completionForStringRange(wlc, range, config.itemValueQuotes);
      suggestion.kind = CompletionItemKind.Reference;
      result.push(suggestion);
    }

    for (const extraSuggestion of suggestionData.extraClasses) {
      const suggestion = completionForStringRange(extraSuggestion, range, config.itemValueQuotes);
      suggestion.kind = CompletionItemKind.Text;
      result.push(suggestion);
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range: Range = {
      start: { line: pos.line, character: pos.character },
      end: { line: pos.line, character: pos.character }
    };
    pushCompletions(range);
  } else {
    let valueRange: Range | undefined;
    do {
      valueRange = parser.getNextValueRange(text, pos.line, valueIndex);

      if (valueRange) {
        valueIndex = valueRange.end.character + 1;
      } else {
        pushCompletions({
          start: { line: pos.line, character: pos.character },
          end: { line: pos.line, character: pos.character }
        });

        return result;
      }
    } while (!parser.isNextValue(valueRange, pos));

    valueRange.end.character++;
    pushCompletions(valueRange);
  }

  return result;
}

function getBaseCompletions(config: ConfigurationValues, pos: Position,
  text: string, index: number): CompletionItem[] {

  const result: CompletionItem[] = [];

  let valueIndex = parser.bypassEqOperator(text, index);

  const pushCompletions = (range: Range) => {
    for (const c of itemData.sortedBases) {
      result.push(completionForStringRange(c, range, config.itemValueQuotes));
    }

    for (const wlb of config.baseWhitelist) {
      const suggestion = completionForStringRange(wlb, range, config.itemValueQuotes);
      suggestion.kind = CompletionItemKind.Reference;
      result.push(suggestion);
    }

    for (const extraSuggestion of suggestionData.extraBases) {
      if (typeof extraSuggestion === "string") {
        const suggestion = completionForStringRange(extraSuggestion, range,
          config.itemValueQuotes);
        suggestion.kind = CompletionItemKind.Text;
        result.push(suggestion);
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
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range: Range = {
      start: { line: pos.line, character: pos.character },
      end: { line: pos.line, character: pos.character }
    };
    pushCompletions(range);
  } else {
    let valueRange: Range | undefined;
    do {
      valueRange = parser.getNextValueRange(text, pos.line, valueIndex);

      if (valueRange) {
        valueIndex = valueRange.end.character + 1;
      } else {
        pushCompletions({
          start: { line: pos.line, character: pos.character },
          end: { line: pos.line, character: pos.character }
        });

        return result;
      }
    } while (!parser.isNextValue(valueRange, pos));

    valueRange.end.character++;
    pushCompletions(valueRange);
  }

  return result;
}

function getModCompletions(config: ConfigurationValues, pos: Position,
  text: string, index: number): CompletionItem[] {

  const result: CompletionItem[] = [];

  let valueIndex = parser.bypassEqOperator(text, index);

  const pushCompletions = (range: Range) => {
    const prefixes = config.limitedModPool ? modData.limited.prefixes : modData.full.prefixes;
    const suffixes = config.limitedModPool ? modData.limited.suffixes : modData.full.suffixes;

    for (const mod of prefixes) {
      result.push(completionForStringRange(mod, range, config.modQuotes));
    }

    for (const mod of suffixes) {
      result.push(completionForStringRange(mod, range, config.modQuotes));
    }

    for (const mod of config.modWhitelist) {
      const suggestion = completionForStringRange(mod, range, config.modQuotes);
      suggestion.kind = CompletionItemKind.Reference;
      result.push(suggestion);
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range: Range = {
      start: { line: pos.line, character: pos.character },
      end: { line: pos.line, character: pos.character }
    };
    pushCompletions(range);
  } else {
    let valueRange: Range | undefined;
    do {
      valueRange = parser.getNextValueRange(text, pos.line, valueIndex);

      if (valueRange) {
        valueIndex = valueRange.end.character + 1;
      } else {
        pushCompletions({
          start: { line: pos.line, character: pos.character },
          end: { line: pos.line, character: pos.character }
        });

        return result;
      }
    } while (!parser.isNextValue(valueRange, pos));

    valueRange.end.character++;
    pushCompletions(valueRange);
  }

  return result;
}

function getAlertSoundCompletions(config: ConfigurationValues, pos: Position,
  text: string, index: number): CompletionItem[] {

  const result: CompletionItem[] = [];

  const valueIndex = parser.bypassEqOperator(text, index);

  const pushCompletions = (range: Range) => {
    for (const id in filterData.sounds.stringIdentifiers) {
      const label = filterData.sounds.stringIdentifiers[id];
      const suggestion = completionForStringRange(id, range, false);
      suggestion.label = label;
      result.push(suggestion);
    }

    for (const wls of config.soundWhitelist) {
      const suggestion = completionForStringRange(wls, range, false);
      suggestion.kind = CompletionItemKind.Reference;
      result.push(suggestion);
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range: Range = {
      start: { line: pos.line, character: pos.character },
      end: { line: pos.line, character: pos.character }
    };
    pushCompletions(range);
  } else {
    const range = parser.getNextValueRange(text, pos.line, valueIndex);
    if (range != null && parser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(range);
    }
  }

  return result;
}

function getRarityCompletions(config: ConfigurationValues, pos: Position,
  text: string, index: number): CompletionItem[] {

  const result: CompletionItem[] = [];

  const valueIndex = parser.bypassOperator(text, index);

  const pushCompletions = (range: Range) => {
    for (const rarity of filterData.rarities) {
      result.push(completionForStringRange(rarity, range, config.rarityQuotes));
    }
  };

  if (valueIndex === undefined || pos.character < valueIndex) {
    const range: Range = {
      start: { line: pos.line, character: pos.character },
      end: { line: pos.line, character: pos.character }
    };
    pushCompletions(range);
  } else {
    const range = parser.getNextValueRange(text, pos.line, valueIndex);
    if (range != null && parser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(range);
    }
  }

  return result;
}

function getBooleanCompletions(config: ConfigurationValues, pos: Position,
  text: string, index: number): CompletionItem[] {

  const result: CompletionItem[] = [];

  const valueIndex = parser.bypassEqOperator(text, index);

  const pushCompletions = (range: Range) => {
    for (const bool of filterData.booleans) {
      result.push(completionForStringRange(bool, range, config.booleanQuotes));
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range: Range = {
      start: { line: pos.line, character: pos.character },
      end: { line: pos.line, character: pos.character }
    };
    pushCompletions(range);
  } else {
    const range = parser.getNextValueRange(text, pos.line, valueIndex);
    if (range != null && parser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(range);
    }
  }

  return result;
}
