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

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { dataOutputRoot, splitLines } from "../helpers";
import { IDisposable } from "../kits/events";
import * as contextParser from "../parsers/context";
import * as types from "../types";
import { range2CodeRange } from "../converters";
import { ConfigurationManager } from "../managers/configuration";

const itemData = <types.ItemData>require(path.join(dataOutputRoot, "items.json"));
const filterData = <types.FilterData>require(path.join(dataOutputRoot, "filter.json"));
const suggestionData = <types.SuggestionData>require(path.join(dataOutputRoot,
  "suggestions.json"));
const modData = <types.ModData>require(path.join(dataOutputRoot, "mods.json"));

const whitespaceRegex = /^\s*$/;
const whitespaceCharacterRegex = /\s/;
const spaceRegex = / /;

export const completionTriggers = ['"', "\\"];

export class FilterCompletionProvider implements vscode.CompletionItemProvider, IDisposable {
  private _config: types.ConfigurationValues;
  private readonly _configManager: ConfigurationManager;
  private readonly _subscription: IDisposable;

  constructor(configManager: ConfigurationManager) {
    this._configManager = configManager;
    this._config = configManager.values;

    this._subscription = this._configManager.onDidChange(newConfig => {
      this._config = newConfig;
    });
  }

  dispose(): void {
    this._subscription.dispose();
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position,
    token: vscode.CancellationToken, context: vscode.CompletionContext):
    vscode.ProviderResult<vscode.CompletionItem[]> {

    const lines = splitLines(document.getText());
    return this._getCompletionsForLine(lines[position.line], position, document.eol);
  }

  private _getCompletionsForLine(lineText: string, position: vscode.Position,
    eol: vscode.EndOfLine): vscode.CompletionItem[] {

    const keywordResult = contextParser.getKeyword(lineText, position.character);

    if (keywordResult) {
      const [keyword, keywordRange] = keywordResult;

      if (position.character < keywordRange.start.character) {
        return getKeywordCompletions(this._config, eol, position);
      } else if (position.character <= keywordRange.end.character) {
        const start = new vscode.Position(position.line, keywordRange.start.character);
        const end = new vscode.Position(position.line, keywordRange.end.character);
        return getKeywordCompletions(this._config, eol, start, end);
      }

      const currentIndex = keywordRange.end.character;
      switch (keyword) {
        case "Class":
          return getClassCompletions(this._config, position, lineText, currentIndex, eol);
        case "BaseType":
          return getBaseCompletions(this._config, position, lineText, currentIndex, eol);
        case "PlayAlertSound":
        case "PlayAlertSoundPositional":
          return getAlertSoundCompletions(this._config, position, lineText, currentIndex, eol);
        case "Rarity":
          return getRarityCompletions(this._config, position, lineText, currentIndex, eol);
        case "Identified":
        case "Corrupted":
        case "ElderItem":
        case "ShaperItem":
        case "ShapedMap":
        case "ElderMap":
          return getBooleanCompletions(this._config, position, lineText, currentIndex, eol);
        case "HasExplicitMod":
          return getModCompletions(this._config, position, lineText, currentIndex, eol);
        case "MinimapIcon":
          return getMinimapIconCompletions(position, lineText, currentIndex, eol);
        case "PlayEffect":
          return getPlayEffectCompletions(position, lineText, currentIndex);
        case "CustomAlertSound":
          return getCustomSoundCompletions(this._config, position, lineText, currentIndex, eol);
        default:
          return [];
      }
    } else {
      const isEmpty = whitespaceRegex.test(lineText);
      if (isEmpty) return getKeywordCompletions(this._config, eol, position);

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
        return getKeywordCompletions(this._config, eol, position);
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
    pushCompletions(range2CodeRange(valueRange));
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
    pushCompletions(range2CodeRange(valueRange));
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
    pushCompletions(range2CodeRange(valueRange));
  }

  return result;
}

function getMinimapIconCompletions(pos: vscode.Position, text: string,
  index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  const pushCompletions = (range: vscode.Range, arr: string[]) => {
    for (const v of arr) {
      result.push(completionForStringRange(`${v}`, range, eol, false));
    }
  };

  const sizeStrings: string[] = [];
  filterData.minimapIcons.sizes.forEach(value => sizeStrings.push(`${value}`));

  let valueIndex = contextParser.bypassEqOperator(text, index);
  if (valueIndex == null || pos.character < valueIndex) {
    pushCompletions(new vscode.Range(pos.line, pos.character, pos.line, pos.character),
      sizeStrings);
    return result;
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range == null) {
      return result;
    }

    if (contextParser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(range2CodeRange(range), sizeStrings);
      return result;
    } else {
      range.end.character++;
      valueIndex = range.end.character;
    }
  }

  valueIndex = contextParser.bypassWhitespace(text, valueIndex);
  if (pos.character <= valueIndex) {
    pushCompletions(new vscode.Range(pos.line, pos.character, pos.line, pos.character),
      filterData.minimapIcons.colors);
    return result;
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range == null) {
      return result;
    }

    if (contextParser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(range2CodeRange(range), filterData.minimapIcons.colors);
      return result;
    } else {
      range.end.character++;
      valueIndex = range.end.character;
    }
  }

  valueIndex = contextParser.bypassWhitespace(text, valueIndex);
  if (pos.character <= valueIndex) {
    pushCompletions(new vscode.Range(pos.line, pos.character, pos.line, pos.character),
      filterData.minimapIcons.shapes);
    return result;
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range == null) {
      return result;
    }

    if (contextParser.isNextValue(range, pos)) {
      range.end.character++;
      pushCompletions(range2CodeRange(range), filterData.minimapIcons.shapes);
      return result;
    } else {
      range.end.character++;
      valueIndex = range.end.character;
    }
  }

  return result;
}

function getPlayEffectCompletions(pos: vscode.Position, text: string,
  index: number): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  const pushColorCompletions = (range: vscode.Range) => {
    for (const color of filterData.dropEffects.colors) {
      result.push({
        label: `${color}`,
        range
      });
    }
  };

  let valueIndex = contextParser.bypassEqOperator(text, index);
  if (valueIndex == null || pos.character < valueIndex) {
    pushColorCompletions(new vscode.Range(pos.line, pos.character, pos.line, pos.character));
    return result;
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range == null) {
      return result;
    }

    if (contextParser.isNextValue(range, pos)) {
      range.end.character++;
      pushColorCompletions(range2CodeRange(range));
      return result;
    } else {
      range.end.character++;
      valueIndex = range.end.character + 1;
    }
  }

  valueIndex = contextParser.bypassWhitespace(text, valueIndex);
  if (pos.character <= valueIndex) {
    result.push({
      label: "Temp",
      range: new vscode.Range(pos.line, pos.character, pos.line, pos.character)
    });
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range == null) {
      return result;
    }

    if (contextParser.isNextValue(range, pos)) {
      range.end.character++;
      result.push({
        label: "Temp",
        range: range2CodeRange(range)
      });
    }
  }

  return result;
}

function getCustomSoundCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  // The filter is being created for another system.
  if (os.platform() !== "win32") {
    return [];
  }

  const valueIndex = contextParser.bypassEqOperator(text, index);

  if (valueIndex == null || pos.character < valueIndex) {
    return [];
  } else {
    const range = contextParser.getNextValueRange(text, pos.line, valueIndex);
    if (range != null && contextParser.isNextValue(range, pos)) {
      const currentFilePath = text.slice(range.start.character + 1, range.end.character);
      range.end.character++;
      return getPathCompletions(config, currentFilePath, range2CodeRange(range), pos);
    }
  }

  return [];
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
      pushCompletions(range2CodeRange(range));
    }
  }

  return result;
}

function getRarityCompletions(config: types.ConfigurationValues, pos: vscode.Position,
  text: string, index: number, eol: vscode.EndOfLine): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  let valueIndex = contextParser.bypassOperator(text, index);

  const pushCompletions = (range: vscode.Range) => {
    for (const rarity of filterData.rarities) {
      result.push(completionForStringRange(rarity, range, eol, config.rarityQuotes));
    }
  };

  if (valueIndex === undefined || pos.character < valueIndex) {
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
    pushCompletions(range2CodeRange(valueRange));
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
      pushCompletions(range2CodeRange(range));
    }
  }

  return result;
}

function getPathCompletions(config: types.ConfigurationValues, text: string,
  range: vscode.Range, pos: vscode.Position): vscode.CompletionItem[] {

  const result: vscode.CompletionItem[] = [];

  const croppedPath = text.substr(0, pos.character - range.start.character - 1);

  let directory: string;
  let currentText: string;
  if (croppedPath.charAt(croppedPath.length - 1) === "\\") {
    directory = croppedPath;
    currentText = "";
  } else {
    directory = path.dirname(croppedPath);
    currentText = path.basename(croppedPath);
  }

  const documentsPath = config.windowsDocumentFolder !== "" ?
    config.windowsDocumentFolder : path.join(os.homedir(), "Documents");
  const gameDataRoot = path.join(documentsPath, "My Games", "Path of Exile");
  const gameDataListings = fs.readdirSync(gameDataRoot);

  for (const item of gameDataListings) {
    const extension = path.extname(item);
    if (extension !== ".mp3" && extension !== ".wav") {
      continue;
    }

    const itemPath = path.join(gameDataRoot, item);
    let stats: fs.Stats | undefined;
    try {
      stats = fs.statSync(itemPath);
    } catch (e) { }

    if (stats && stats.isFile()) {
      if (item.includes(currentText)) {
        result.push({
          label: item,
          insertText: `"${item}"`,
          filterText: `"${item}"`,
          range,
          kind: vscode.CompletionItemKind.File
        });
      }
    }
  }

  if (directory === ".") {
    return result;
  }

  const hasSeparator = directory.charAt(directory.length - 1) === "\\";

  const filesystemListings = fs.readdirSync(directory);
  for (const item of filesystemListings) {
    const itemPath = path.join(directory, item);
    let stats: fs.Stats | undefined;
    try {
      stats = fs.statSync(itemPath);
    } catch (e) { }

    if (stats && stats.isDirectory()) {
      if (currentText.length === 0 || item.includes(currentText)) {
        result.push({
          label: item,
          insertText: hasSeparator ? `${directory}${item}` : `${directory}\\${item}`,
          filterText: hasSeparator ? `"${directory}${item}"` : `"${directory}\\${currentText}"`,
          range: new vscode.Range(
            range.start.line, range.start.character + 1,
            range.end.line, range.end.character - 1
          ),
          kind: vscode.CompletionItemKind.Folder
        });
      }
    } else if (stats && stats.isFile()) {
      const extension = path.extname(item);
      if (extension !== ".mp3" && extension !== ".wav") {
        continue;
      }

      if (item.includes(currentText)) {
        result.push({
          label: item,
          insertText: hasSeparator ? `"${directory}${item}"` : `"${directory}\\${item}"`,
          filterText: hasSeparator ? `"${directory}${item}"` : `"${directory}\\${currentText}"`,
          range,
          kind: vscode.CompletionItemKind.File
        });
      }
    }
  }

  return result;
}
