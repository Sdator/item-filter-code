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
import * as vscode from "vscode";
import { dataOutputRoot, splitLines } from "../../common";
import { IDisposable } from "../../common/event-kit";
import * as contextParser from "../../common/parsers/context";
import * as types from "../../common/types";
import { intoCodeRange } from "../converters";
import { ConfigurationManager } from "../managers/configuration";

const itemData = <types.ItemData>require(path.join(dataOutputRoot, "items.json"));
const filterData = <types.FilterData>require(path.join(dataOutputRoot, "filter.json"));
const suggestionData = <types.SuggestionData>require(path.join(dataOutputRoot,
  "suggestions.json"));
const modData = <types.ModData>require(path.join(dataOutputRoot, "mods.json"));

const whitespaceRegex = /^\s*$/;
const whitespaceCharacterRegex = /\s/;
const spaceRegex = / /;

export class FilterCompletionProvider implements vscode.CompletionItemProvider, IDisposable {
  private config: types.ConfigurationValues;
  private readonly configManager: ConfigurationManager;
  private readonly subscriptions: IDisposable[];

  constructor(configManager: ConfigurationManager) {
    this.configManager = configManager;
    this.config = configManager.values;

    this.subscriptions = [
      this.configManager.onDidChange(newConfig => {
        this.config = newConfig;
      })
    ];
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position,
    token: vscode.CancellationToken, context: vscode.CompletionContext):
    vscode.ProviderResult<vscode.CompletionItem[]> {

    const lines = splitLines(document.getText());
    return this.getCompletionsForLine(lines[position.line], position, document.eol);
  }

  dispose(): void {
    while (this.subscriptions.length) {
      const s = this.subscriptions.pop();
      if (s) s.dispose();
    }
  }

  private getCompletionsForLine(lineText: string, position: vscode.Position,
    eol: vscode.EndOfLine): vscode.CompletionItem[] {

    const keywordResult = contextParser.getKeyword(lineText, position.character);

    if (keywordResult) {
      const [keyword, keywordRange] = keywordResult;

      if (position.character < keywordRange.start.character) {
        return getKeywordCompletions(this.config, eol, position);
      } else if (position.character <= keywordRange.end.character) {
        const start = new vscode.Position(position.line, keywordRange.start.character);
        const end = new vscode.Position(position.line, keywordRange.end.character);
        return getKeywordCompletions(this.config, eol, start, end);
      }

      const currentIndex = keywordRange.end.character;
      switch (keyword) {
        case "Class":
          return getClassCompletions(this.config, position, lineText, currentIndex, eol);
        case "BaseType":
          return getBaseCompletions(this.config, position, lineText, currentIndex, eol);
        case "PlayAlertSound":
        case "PlayAlertSoundPositional":
          return getAlertSoundCompletions(this.config, position, lineText, currentIndex, eol);
        case "Rarity":
          return getRarityCompletions(this.config, position, lineText, currentIndex, eol);
        case "Identified":
        case "Corrupted":
        case "ElderItem":
        case "ShaperItem":
        case "ShapedMap":
        case "ElderMap":
        case "DisableDropSound":
          return getBooleanCompletions(this.config, position, lineText, currentIndex, eol);
        case "HasExplicitMod":
          return getModCompletions(this.config, position, lineText, currentIndex, eol);
        default:
          return [];
      }
    } else {
      const isEmpty = whitespaceRegex.test(lineText);
      if (isEmpty) return getKeywordCompletions(this.config, eol, position);

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
        return getKeywordCompletions(this.config, eol, position);
      }
    }
  }
}

function keywordToCompletionItem(text: string, range: vscode.Range,
  eol: vscode.EndOfLine): vscode.CompletionItem {

  return {
    label: text,
    kind: vscode.CompletionItemKind.Property,
    textEdit: {
      newText: text,
      newEol: eol,
      range
    }
  };
}

function colorKeywordToCompletionItem(text: string, range: vscode.Range,
  eol: vscode.EndOfLine): vscode.CompletionItem {

  return {
    label: text,
    kind: vscode.CompletionItemKind.Property,
    textEdit: {
      newText: `${text} 255 255 255`,
      newEol: eol,
      range
    }
  };
}

function getKeywordCompletions(config: types.ConfigurationValues, eol: vscode.EndOfLine,
  pos: vscode.Position, endPos?: vscode.Position): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  const range = endPos ? new vscode.Range(pos, endPos) : new vscode.Range(pos.line,
    pos.character, pos.line, pos.character);

  for (const k of filterData.rules) {
    if (k === "SetBorderColor" || k === "SetTextColor" || k === "SetBackgroundColor") {
      result.push(colorKeywordToCompletionItem(k, range, eol));
    } else {
      result.push(keywordToCompletionItem(k, range, eol));
    }
  }

  for (const wlk of config.ruleWhitelist) {
    const suggestion = keywordToCompletionItem(wlk, range, eol);
    suggestion.kind = vscode.CompletionItemKind.Reference;
    result.push(suggestion);
  }

  return result;
}

function completionForStringRange(text: string, range: vscode.Range,
  eol: vscode.EndOfLine, useQuotes: boolean): vscode.CompletionItem {

  return {
    label: text,
    filterText: `"${text}"`,
    kind: vscode.CompletionItemKind.Value,
    textEdit: {
      newText: spaceRegex.test(text) || useQuotes ? `"${text}"` : `${text}`,
      newEol: eol,
      range
    }
  };
}

function getClassCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  let valueIndex = contextParser.bypassEqOperator(text, index);

  const pushCompletions = (range: vscode.Range) => {
    for (const c in itemData.classesToBases) {
      result.push(completionForStringRange(c, range, eol, config.itemValueQuotes));
    }

    for (const wlc of config.classWhitelist) {
      const suggestion = completionForStringRange(wlc, range, eol, config.itemValueQuotes);
      suggestion.kind = vscode.CompletionItemKind.Reference;
      result.push(suggestion);
    }

    for (const extraSuggestion of suggestionData.extraClasses) {
      const suggestion = completionForStringRange(extraSuggestion, range, eol,
        config.itemValueQuotes);
      suggestion.kind = vscode.CompletionItemKind.Text;
      result.push(suggestion);
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range = new vscode.Range(pos.line, pos.character, pos.line, pos.character);
    pushCompletions(range);
  } else {
    let valueRange: types.Range | undefined;
    do {
      valueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

      if (valueRange) {
        valueIndex = valueRange.end.character + 1;
      } else {
        pushCompletions(new vscode.Range(pos.line, pos.character, pos.line, pos.character));
        return result;
      }
    } while (!contextParser.isNextValue(valueRange, pos));

    valueRange.end.character++;
    pushCompletions(intoCodeRange(valueRange));
  }

  return result;
}

function getBaseCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  let valueIndex = contextParser.bypassEqOperator(text, index);

  const pushCompletions = (range: vscode.Range) => {
    for (const c of itemData.sortedBases) {
      result.push(completionForStringRange(c, range, eol, config.itemValueQuotes));
    }

    for (const wlb of config.baseWhitelist) {
      const suggestion = completionForStringRange(wlb, range, eol, config.itemValueQuotes);
      suggestion.kind = vscode.CompletionItemKind.Reference;
      result.push(suggestion);
    }

    for (const extraSuggestion of suggestionData.extraBases) {
      if (typeof extraSuggestion === "string") {
        const suggestion = completionForStringRange(extraSuggestion, range, eol,
          config.itemValueQuotes);
        suggestion.kind = vscode.CompletionItemKind.Text;
        result.push(suggestion);
      } else {
        result.push({
          label: `${extraSuggestion.name}`,
          filterText: `"${extraSuggestion.name}"`,
          kind: vscode.CompletionItemKind.Text,
          textEdit: {
            newText: `${extraSuggestion.text}`,
            newEol: eol,
            range
          }
        });
      }
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range = new vscode.Range(pos.line, pos.character, pos.line, pos.character);
    pushCompletions(range);
  } else {
    let valueRange: types.Range | undefined;
    do {
      valueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

      if (valueRange) {
        valueIndex = valueRange.end.character + 1;
      } else {
        pushCompletions(new vscode.Range(pos.line, pos.character, pos.line, pos.character));
        return result;
      }
    } while (!contextParser.isNextValue(valueRange, pos));

    valueRange.end.character++;
    pushCompletions(intoCodeRange(valueRange));
  }

  return result;
}

function getModCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  let valueIndex = contextParser.bypassEqOperator(text, index);

  const pushCompletions = (range: vscode.Range) => {
    const prefixes = config.limitedModPool ? modData.limited.prefixes : modData.full.prefixes;
    const suffixes = config.limitedModPool ? modData.limited.suffixes : modData.full.suffixes;

    for (const mod of prefixes) {
      result.push(completionForStringRange(mod, range, eol, config.modQuotes));
    }

    for (const mod of suffixes) {
      result.push(completionForStringRange(mod, range, eol, config.modQuotes));
    }

    for (const mod of config.modWhitelist) {
      const suggestion = completionForStringRange(mod, range, eol, config.modQuotes);
      suggestion.kind = vscode.CompletionItemKind.Reference;
      result.push(suggestion);
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range = new vscode.Range(pos.line, pos.character, pos.line, pos.character);
    pushCompletions(range);
  } else {
    let valueRange: types.Range | undefined;
    do {
      valueRange = contextParser.getNextValueRange(text, pos.line, valueIndex);

      if (valueRange) {
        valueIndex = valueRange.end.character + 1;
      } else {
        pushCompletions(new vscode.Range(pos.line, pos.character, pos.line, pos.character));
        return result;
      }
    } while (!contextParser.isNextValue(valueRange, pos));

    valueRange.end.character++;
    pushCompletions(intoCodeRange(valueRange));
  }

  return result;
}

function getAlertSoundCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  const valueIndex = contextParser.bypassEqOperator(text, index);

  const pushCompletions = (range: vscode.Range) => {
    for (const id in filterData.sounds.stringIdentifiers) {
      const label = filterData.sounds.stringIdentifiers[id];
      const suggestion = completionForStringRange(id, range, eol, false);
      suggestion.label = label;
      result.push(suggestion);
    }

    for (const wls of config.soundWhitelist) {
      const suggestion = completionForStringRange(wls, range, eol, false);
      suggestion.kind = vscode.CompletionItemKind.Reference;
      result.push(suggestion);
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range = new vscode.Range(pos.line, pos.character, pos.line, pos.character);
    pushCompletions(range);
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range != null && contextParser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(intoCodeRange(range));
    }
  }

  return result;
}

function getRarityCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  const valueIndex = contextParser.bypassOperator(text, index);

  const pushCompletions = (range: vscode.Range) => {
    for (const rarity of filterData.rarities) {
      result.push(completionForStringRange(rarity, range, eol, config.rarityQuotes));
    }
  };

  if (valueIndex === undefined || pos.character < valueIndex) {
    const range = new vscode.Range(pos.line, pos.character, pos.line, pos.character);
    pushCompletions(range);
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range != null && contextParser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(intoCodeRange(range));
    }
  }

  return result;
}

function getBooleanCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  const valueIndex = contextParser.bypassEqOperator(text, index);

  const pushCompletions = (range: vscode.Range) => {
    for (const bool of filterData.booleans) {
      result.push(completionForStringRange(bool, range, eol, config.booleanQuotes));
    }
  };

  if (valueIndex == null || pos.character < valueIndex) {
    const range = new vscode.Range(pos.line, pos.character, pos.line, pos.character);
    pushCompletions(range);
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range != null && contextParser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(intoCodeRange(range));
    }
  }

  return result;
}
