/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import * as types from "../types";
import * as helpers from "../helpers";
import * as converters from "../converters";
import { TokenParser, TokenParseResult } from "./tokens";
import { isAlphabetical, CharacterCodes } from "../parsers-nextgen";

const whitespaceRegex = /^\s*$/;
const itemData = <types.ItemData>require(path.join(helpers.dataOutputRoot, "items.json"));
const filterData = <types.FilterData>require(path.join(helpers.dataOutputRoot, "filter.json"));
const modData = <types.ModData>require(path.join(helpers.dataOutputRoot, "mods.json"));

/** The result of parsing an item filter line. */
export interface BaseParseLineResult {
  /** The line number of the parsed line. */
  row: number;

  /** The range of the text on the line. */
  lineRange: types.Range;

  /** The diagnostic messages reported by the parser. */
  diagnostics: types.Diagnostic[];

  /** Color information parsed from the line. */
  color?: types.ColorInformation;

  /** Sound information parsed from the line. */
  sound?: types.SoundInformation;
}

/** The result of parsing an item filter line containing a keyword. */
export interface KeywordParseLineResult extends BaseParseLineResult {
  /** The keyword of the parsed line. */
  keyword: string;

  /** The range of the keyword parsed from the line. */
  keywordRange: types.Range;

  /** Whether the keyword was a known one. */
  knownKeyword: boolean;
}

export type ParseLineResult = BaseParseLineResult | KeywordParseLineResult;

/** A bundle of all data relevant when dealing with the current line. */
export interface LineInformation {
  /** The ongoing result of parsing the current line. */
  result: KeywordParseLineResult;

  /** The configuration variables for the extension. */
  config: types.ConfigurationValues;

  /** Data associated with only the current block within the item filter. */
  blockContext: types.BlockContext;

  /** Data associated with the entirety of the item filter. */
  filterContext: types.FilterContext;

  /** The token parser being used to parse the current line. */
  parser: TokenParser;
}

export class LineParser {
  private readonly _config: types.ConfigurationValues;
  private readonly _filterContext: types.FilterContext;
  private readonly _blockContext: types.BlockContext;

  constructor(config: types.ConfigurationValues, filterContext: types.FilterContext,
    blockContext: types.BlockContext) {

    this._config = config;
    this._filterContext = filterContext;
    this._blockContext = blockContext;
  }

  parse(text: string, row: number): ParseLineResult {
    const parser = new TokenParser(text, row);

    const baseResult: BaseParseLineResult = {
      row,
      lineRange: {
        start: { line: parser.row, character: parser.textStartIndex },
        end: { line: parser.row, character: parser.textEndIndex }
      },
      diagnostics: []
    };

    if (parser.isEmpty() || parser.isCommented()) {
      return baseResult;
    }

    const wordResult = parser.nextWord();
    if (!wordResult) {
      baseResult.diagnostics.push({
        message: "Unreadable keyword, likely due to a stray character.",
        range: baseResult.lineRange,
        severity: types.DiagnosticSeverity.Error
      });
      return baseResult;
    }

    const keywordResult: KeywordParseLineResult = {
      row,
      lineRange: baseResult.lineRange,
      diagnostics: baseResult.diagnostics,
      keyword: wordResult.value,
      keywordRange: wordResult.range,
      knownKeyword: true,
    };

    const lineInfo: LineInformation = {
      result: keywordResult,
      config: this._config,
      filterContext: this._filterContext,
      blockContext: this._blockContext,
      parser,
    };

    switch (keywordResult.keyword) {
      case "Show":
      case "Hide":
        parseBlock(lineInfo);
        break;
      case "ItemLevel":
      case "DropLevel":
      case "GemLevel":
      case "Quality":
      case "StackSize":
      case "Sockets":
      case "LinkedSockets":
      case "Height":
      case "Width":
      case "MapTier":
        parseRepeatingNumberRule(lineInfo);
        break;
      case "SetFontSize":
        parseSetFontSizeRule(lineInfo, true);
        break;
      case "Rarity":
        parseRarityRule(lineInfo);
        break;
      case "SocketGroup":
        parseSocketGroupRule(lineInfo);
        break;
      case "Identified":
      case "Corrupted":
      case "ElderItem":
      case "ShaperItem":
      case "ShapedMap":
      case "ElderMap":
        parseBooleanRule(lineInfo);
        break;
      case "DisableDropSound":
        parseDisableDropSoundRule(lineInfo);
        break;
      case "HasExplicitMod":
        parseModRule(lineInfo);
        break;
      case "SetBorderColor":
      case "SetTextColor":
      case "SetBackgroundColor":
        parseColorRule(lineInfo);
        break;
      case "Class":
        parseClassRule(lineInfo);
        break;
      case "BaseType":
        parseBaseTypeRule(lineInfo);
        break;
      case "PlayAlertSound":
      case "PlayAlertSoundPositional":
        parseSoundRule(lineInfo);
        break;
      case "CustomAlertSound":
        parseCustomSoundRule(lineInfo);
        break;
      case "MinimapIcon":
        parseMinimapIconRule(lineInfo);
        break;
      case "PlayEffect":
        parsePlayEffectRule(lineInfo);
        break;
      default:
        let whitelistedKeyword = false;
        for (const wlr of this._config.ruleWhitelist) {
          if (keywordResult.keyword === wlr) whitelistedKeyword = true;
        }

        keywordResult.knownKeyword = false;
        if (!whitelistedKeyword) reportUnknownKeyword(lineInfo);
    }

    return keywordResult;
  }
}

function parseBlock(line: LineInformation): void {
  resetBlockInformation(line.blockContext);
  line.blockContext.root = line.result.keywordRange;

  if (line.parser.isEmpty() || line.parser.isCommented()) {
    return;
  }

  reportTrailingText(line, types.DiagnosticSeverity.Warning);
}

function parseBooleanRule(line: LineInformation, optional = false): void {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  const booleanResult = line.parser.nextBoolean();
  if (!optional && !booleanResult) {
    line.result.diagnostics.push({
      message: "A boolean value, either True or False, was expected, yet not found.",
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: types.DiagnosticSeverity.Error
    });
  }

  if (!line.parser.isEmpty() && line.result.diagnostics.length === 0) {
    reportTrailingText(line, types.DiagnosticSeverity.Error);
  }
}

function parseDisableDropSoundRule(line: LineInformation): void {
  if (!line.parser.isEmpty() && line.result.diagnostics.length === 0) {
    reportTrailingText(line, types.DiagnosticSeverity.Hint);
  }
}

/**
 * Parses one or more numbers from the line.
 * @param equalsOnly True if only the equals operator is valid for this rule.
 * Defaults to false.
 */
function parseRepeatingNumberRule(line: LineInformation, equalsOnly = false): void {
  const operatorResult = line.parser.nextOperator();

  let operatorType: types.FilterOperator;
  if (operatorResult) {
    const operator = converters.textOperator2FilterOperator(operatorResult.value);
    if (operator === undefined) {
      line.result.diagnostics.push({
        message: `Unknown operator for a ${line.result.keyword} rule.`,
        range: operatorResult.range
      });
      return;
    } else {
      operatorType = operator;

      if (equalsOnly && operatorType !== types.FilterOperator.Equals) {
        reportNonEqualsOperator(line, operatorResult);
        return;
      }
    }
  } else {
    operatorType = types.FilterOperator.Equals;
  }

  const ruleRange = filterData.ruleRanges[line.result.keyword];

  let parsedValues = 0;
  let opReported = false;
  while (true) {
    const valueResult = line.parser.nextWordString();

    if (valueResult) {
      if (!opReported && parsedValues === 1 && operatorType !== types.FilterOperator.Equals) {
        if (equalsOnly) {
          reportNonEqualsOperator(line, operatorResult ? operatorResult : {
            value: "",
            range: {
              start: { line: line.result.row, character: line.parser.textStartIndex },
              end: { line: line.result.row, character: line.parser.originalLength }
            }
          });
        } else {
          line.result.diagnostics.push({
            message: `Invalid operator for an ${line.result.keyword} rule providing ` +
              "multiple values. Only the equals operator is allowed in this context, " +
              "as other operators are error prone.",
            range: operatorResult ? operatorResult.range : {
              start: { line: line.result.row, character: line.parser.textStartIndex },
              end: { line: line.result.row, character: line.parser.originalLength }
            },
            severity: types.DiagnosticSeverity.Error
          });
        }

        opReported = true;
      }

      validateNumber(line, valueResult, ruleRange.min, ruleRange.max);
      parsedValues++;
    } else {
      if (parsedValues === 0 && line.result.diagnostics.length === 0) {
        line.result.diagnostics.push({
          message: `Missing value for an ${line.result.keyword} rule. ` +
            `A value between ${ruleRange.min} and ${ruleRange.max} was expected.`,
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          },
          severity: types.DiagnosticSeverity.Error
        });
      }

      break;
    }
  }
}

/**
 * Parses a single number rule from the line.
 * @param equalsOnly True if only the equals operator is valid for this rule.
 * Defaults to false.
 */
function parseSetFontSizeRule(line: LineInformation, equalsOnly = false): void {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult && equalsOnly) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  expectNumber(line, false);

  if (!line.parser.isEmpty() && line.result.diagnostics.length === 0) {
    reportTrailingText(line, types.DiagnosticSeverity.Error);
  }
}

function parseRarityRule(line: LineInformation): void {
  const raritiesText = helpers.stylizedArrayJoin(filterData.rarities);

  const operatorResult = line.parser.nextOperator();

  let operatorType: types.FilterOperator;
  if (operatorResult) {
    const operator = converters.textOperator2FilterOperator(operatorResult.value);
    if (operator === undefined) {
      line.result.diagnostics.push({
        message: `Unknown operator for a ${line.result.keyword} rule.`,
        range: operatorResult.range
      });
      return;
    } else {
      operatorType = operator;
    }
  } else {
    operatorType = types.FilterOperator.Equals;
  }

  let parsedValues = 0;
  let opReported = false;
  while (true) {
    const valueResult = line.parser.nextWordString();

    if (valueResult) {
      if (!opReported && parsedValues === 1 && operatorType !== types.FilterOperator.Equals) {
        line.result.diagnostics.push({
          message: `Invalid operator for a ${line.result.keyword} rule providing ` +
            "multiple values. Only the equals operator is allowed in this context, " +
            "as other operators are error prone.",
          range: operatorResult ? operatorResult.range : {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          }
        });

        opReported = true;
      }

      if (!filterData.rarities.includes(valueResult.value)) {
        line.result.diagnostics.push({
          message: `Invalid value for a ${line.result.keyword} rule.` +
            ` Valid values are ${raritiesText}.`,
          range: valueResult.range,
          severity: types.DiagnosticSeverity.Error
        });
      }

      parsedValues++;
    } else {
      if (parsedValues === 0 && line.result.diagnostics.length === 0) {
        line.result.diagnostics.push({
          message: `Missing value for a ${line.result.keyword} rule.` +
            ` Valid values are ${raritiesText}.`,
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          },
          severity: types.DiagnosticSeverity.Error
        });
      }

      break;
    }
  }
}

function parseSocketGroupRule(line: LineInformation): void {
  const operatorResult = line.parser.nextOperator();

  let operatorType: types.FilterOperator;
  if (operatorResult) {
    const operator = converters.textOperator2FilterOperator(operatorResult.value);
    if (operator === undefined) {
      line.result.diagnostics.push({
        message: `Unknown operator for a ${line.result.keyword} rule.`,
        range: operatorResult.range
      });
      return;
    } else {
      operatorType = operator;

      if (operatorType !== types.FilterOperator.Equals) {
        reportNonEqualsOperator(line, operatorResult);
        return;
      }
    }
  } else {
    operatorType = types.FilterOperator.Equals;
  }

  const groupRegex = new RegExp("^[rgbw]{1,6}$", "i");

  let parsedValues = 0;
  let opReported = false;
  while (true) {
    const valueResult = line.parser.nextWordString();

    if (valueResult) {
      if (!opReported && parsedValues === 1 && operatorType !== types.FilterOperator.Equals) {
        reportNonEqualsOperator(line, operatorResult ? operatorResult : {
          value: "",
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          }
        });

        opReported = true;
      }

      if (!groupRegex.test(valueResult.value)) {
        line.result.diagnostics.push({
          message: `Invalid value for a ${line.result.keyword} rule.` +
            " Expected a word consisting of the R, B, G, and W characters.",
          range: valueResult.range,
          severity: types.DiagnosticSeverity.Error
        });
      }

      parsedValues++;
    } else {
      if (parsedValues === 0 && line.result.diagnostics.length === 0) {
        line.result.diagnostics.push({
          message: `Missing value for a ${line.result.keyword} rule.` +
            " Expected a word consisting of the R, B, G, and W characters.",
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          },
          severity: types.DiagnosticSeverity.Error
        });
      }

      break;
    }
  }
}

function parseColorRule(line: LineInformation): void {
  const rangeLimits = filterData.ruleRanges[line.result.keyword];
  assert(rangeLimits !== undefined);
  const min = rangeLimits.min;
  const max = rangeLimits.max;

  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  let red: TokenParseResult<number> | undefined;
  const redResult = line.parser.nextNumber();
  if (redResult) {
    if (redResult.value >= min && redResult.value <= max) {
      red = redResult;
    } else {
      reportInvalidColor(line, redResult, min, max);
    }
  } else {
    reportMissingColor(line, min, max);
    return;
  }

  let green: TokenParseResult<number> | undefined;
  const greenResult = line.parser.nextNumber();
  if (greenResult) {
    if (greenResult.value >= min && greenResult.value <= max) {
      green = greenResult;
    } else {
      reportInvalidColor(line, greenResult, min, max);
    }
  } else {
    reportMissingColor(line, min, max);
    return;
  }

  let blue: TokenParseResult<number> | undefined;
  const blueResult = line.parser.nextNumber();
  if (blueResult) {
    if (blueResult.value >= min && blueResult.value <= max) {
      blue = blueResult;
    } else {
      reportInvalidColor(line, blueResult, min, max);
    }
  } else {
    reportMissingColor(line, min, max);
    return;
  }

  let alpha: TokenParseResult<number> | undefined;
  const alphaResult = line.parser.nextNumber();
  if (alphaResult) {
    if (alphaResult.value >= min && alphaResult.value <= max) {
      alpha = alphaResult;
    } else {
      reportInvalidColor(line, alphaResult, min, max);
    }
  }

  if (red && green && blue) {
    const redValue = red.value / 255;
    const greenValue = green.value / 255;
    const blueValue = blue.value / 255;
    const alphaValue = alpha === undefined ? 1 : alpha.value / 255;

    const endIndex = alpha ? alpha.range.end.character : blue.range.end.character;
    const range: types.Range = {
      start: { line: line.result.row, character: red.range.start.character },
      end: { line: line.result.row, character: endIndex }
    };

    line.result.color = {
      color: {
        red: redValue,
        blue: blueValue,
        green: greenValue,
        alpha: alphaValue
      },
      range
    };
  }

  if (!line.parser.isIgnored() && line.result.diagnostics.length === 0) {
    reportTrailingText(line, types.DiagnosticSeverity.Error);
  }
}

function parseSoundRule(line: LineInformation) {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  let identifier: string | undefined;
  let volume: number | undefined;
  let range: types.Range | undefined;
  let knownIdentifier = false;

  const min = filterData.sounds.numberIdentifier.min;
  const max = filterData.sounds.numberIdentifier.max;
  const secondPart = `Expected a number from ${min}-${max} or a valid sound identifier.`;

  let invalidIdentifier = true;
  const wordResult = line.parser.nextWord();
  if (wordResult) {
    for (const id in filterData.sounds.stringIdentifiers) {
      if (id === wordResult.value) {
        identifier = wordResult.value;
        range = wordResult.range;
        knownIdentifier = true;
        invalidIdentifier = false;
      }
    }

    for (const id of line.config.soundWhitelist) {
      if (id === wordResult.value) {
        identifier = wordResult.value;
        range = wordResult.range;
        invalidIdentifier = false;
      }
    }

    if (invalidIdentifier) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ${secondPart}`,
        range: wordResult.range,
        severity: types.DiagnosticSeverity.Error
      });
    }
  } else {
    const numberResult = line.parser.nextNumber();
    if (numberResult) {
      if (numberResult.value >= min && numberResult.value <= max) {
        identifier = `${numberResult.value}`;
        range = numberResult.range;
        knownIdentifier = true;
        invalidIdentifier = false;
      } else {
        line.result.diagnostics.push({
          message: `Invalid value for a ${line.result.keyword} rule. ${secondPart}`,
          range: numberResult.range,
          severity: types.DiagnosticSeverity.Error
        });
      }
    } else {
      line.result.diagnostics.push({
        message: `Missing value for a ${line.result.keyword} rule. ${secondPart}`,
        range: {
          start: { line: line.result.row, character: line.parser.textStartIndex },
          end: { line: line.result.row, character: line.parser.originalLength }
        },
        severity: types.DiagnosticSeverity.Error
      });

      return;
    }
  }

  const volumeResult = line.parser.nextNumber();
  if (volumeResult) {
    if (volumeResult.value < 0 || volumeResult.value > 300) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ` +
          "A volume is expected to be a value between 0 and 300.",
        range: volumeResult.range,
        severity: types.DiagnosticSeverity.Error
      });
    } else {
      volume = volumeResult.value;
    }
  }

  if (!line.parser.isIgnored() && line.result.diagnostics.length === 0) {
    reportTrailingText(line, types.DiagnosticSeverity.Error);
  }

  if (identifier && range) {
    const v: number = volume === undefined ? 100 : volume;
    line.result.sound = { knownIdentifier, identifier, volume: v, range };
  }
}

function parseCustomSoundRule(line: LineInformation) {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  const valueResult = line.parser.nextString();

  if (valueResult) {
    verifyFilesExistence(line, valueResult);
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule.` +
        " Expected a string containing either the file name or a full file path.",
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: types.DiagnosticSeverity.Error
    });
  }
}

function parseMinimapIconRule(line: LineInformation): void {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  const sizeResult = line.parser.nextNumber();
  if (sizeResult) {
    if (!filterData.minimapIcons.sizes.includes(sizeResult.value)) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ` +
          `Valid values are: ${helpers.stylizedArrayJoin(filterData.minimapIcons.sizes)}.`,
        range: sizeResult.range
      });
      return;
    }
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule. ` +
        `Valid values are: ${helpers.stylizedArrayJoin(filterData.minimapIcons.sizes)}.`,
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: types.DiagnosticSeverity.Error
    });
    return;
  }

  const colorResult = line.parser.nextWord();
  if (colorResult) {
    let found = false;
    for (const color of filterData.minimapIcons.colors) {
      if (colorResult.value === color) {
        found = true;
      }
    }

    if (!found) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ` +
          `Valid values are: ${helpers.stylizedArrayJoin(filterData.minimapIcons.colors)}.`,
        range: colorResult.range
      });
      return;
    }
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule. ` +
        `Valid values are: ${helpers.stylizedArrayJoin(filterData.minimapIcons.colors)}.`,
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: types.DiagnosticSeverity.Error
    });
    return;
  }

  const shapeResult = line.parser.nextWord();
  if (shapeResult) {
    let found = false;
    for (const color of filterData.minimapIcons.shapes) {
      if (shapeResult.value === color) {
        found = true;
      }
    }

    if (!found) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ` +
          `Valid values are: ${helpers.stylizedArrayJoin(filterData.minimapIcons.shapes)}.`,
        range: shapeResult.range
      });
      return;
    }
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule. ` +
        `Valid values are: ${helpers.stylizedArrayJoin(filterData.minimapIcons.shapes)}.`,
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: types.DiagnosticSeverity.Error
    });
    return;
  }
}

function parsePlayEffectRule(line: LineInformation) {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  const colorResult = line.parser.nextWord();
  if (colorResult) {
    let found = false;
    for (const color of filterData.dropEffects.colors) {
      if (colorResult.value === color) {
        found = true;
      }
    }

    if (!found) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ` +
          `Valid values are: ${helpers.stylizedArrayJoin(filterData.dropEffects.colors)}.`,
        range: colorResult.range
      });
      return;
    }
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule. ` +
        `Valid values are: ${helpers.stylizedArrayJoin(filterData.dropEffects.colors)}.`,
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: types.DiagnosticSeverity.Error
    });
    return;
  }

  const tempResult = line.parser.nextWord();
  if (tempResult) {
    if (tempResult.value !== "Temp") {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ` +
          "Valid values are: Temp.",
        range: tempResult.range
      });
      return;
    }
  }
}

function parseClassRule(line: LineInformation) {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  const parsedClasses: string[] = [];

  while (true) {
    const valueResult = line.parser.nextWordString();

    if (valueResult) {
      if (parsedClasses.includes(valueResult.value)) {
        reportDuplicateString(line, valueResult);
        continue;
      }

      let invalid = true;
      for (const c of itemData.classes) {
        if (c.indexOf(valueResult.value) !== -1) {
          invalid = false;
          break;
        }
      }

      if (invalid) {
        for (const wlc of line.config.classWhitelist) {
          if (wlc.includes(valueResult.value)) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        line.result.diagnostics.push({
          message: `Invalid value for a ${line.result.keyword} rule. Only item classes` +
            " are valid values for this rule.",
          range: valueResult.range,
          severity: types.DiagnosticSeverity.Error
        });
      } else {
        line.blockContext.classes.push(valueResult.value);
        parsedClasses.push(valueResult.value);
      }
    } else {
      if (parsedClasses.length === 0 && line.result.diagnostics.length === 0) {
        line.result.diagnostics.push({
          message: `Missing value for ${line.result.keyword} rule. A string value was expected.`,
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          },
          severity: types.DiagnosticSeverity.Error
        });
      }

      break;
    }
  }
}

function parseBaseTypeRule(line: LineInformation) {
  // This function is the hot path of the entire extension. Validating
  // values naively requires you to look through potentially 2,000 values
  // in order to find the match. We currently use two techniques to get that
  // number down as low as possible in the majority of cases, though sometimes
  // we really do need to go through the entire list.
  //
  // Strategy #1: If we were preceded by a Class rule, then get the item bases
  //  associated with those classes and check against that list. This has better
  //  performance until that class list contains ~5 entries.
  // Strategy #2: Sort a list of item bases by length, then jump straight
  //  to the length of the current item base in that list. It's impossible to
  //  match strings that are smaller and most item base values are exact
  //  matches, so this will take you to the set of the most likely values.
  //  The largest one of these sets is ~180 item bases.
  //
  // The combination currently has parsing down to about 40ms within large
  // item filters with 4,000+ lines, which is within our performance goal.

  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  const parsedBases: string[] = [];
  let basePool: string[] = [];
  let classText: string | undefined;

  // If we assume ~30 items per class, then around 5 is when the class strategy
  // starts to actually perform worse. We could cutoff there, but we want to
  // have consistency with the diagnostics.
  const usingClasses = line.blockContext.classes.length > 0;

  if (usingClasses) {
    const classList: string[] = [];
    for (const itemClass of line.blockContext.classes) {
      // The above item class could still be partial, so pull the item bases
      // for each matching class.
      for (const fullItemClass of itemData.classes) {
        if (fullItemClass.includes(itemClass)) {
          basePool.push.apply(basePool, itemData.classesToBases[fullItemClass]);
          classList.push(fullItemClass);
        }
      }
    }
    classText = helpers.stylizedArrayJoin(classList);
  } else {
    basePool = itemData.sortedBases;
  }

  while (true) {
    const valueResult = line.parser.nextWordString();

    if (valueResult) {
      const value = valueResult.value;
      if (parsedBases.includes(value)) {
        reportDuplicateString(line, valueResult);
        continue;
      }

      let invalid = true;
      if (usingClasses) {
        for (const itemBase of basePool) {
          if (itemBase.length >= value.length && itemBase.indexOf(value) !== -1) {
            invalid = false;
            break;
          }
        }
      } else {
        const startIndex = itemData.sortedBasesIndices[value.length - 1];
        for (let i = startIndex; i < itemData.sortedBases.length; i++) {
          const itemBase = basePool[i];
          if (itemBase.indexOf(value) !== -1) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        for (const wlb of line.config.baseWhitelist) {
          if (wlb.includes(value)) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        if (classText) {
          line.result.diagnostics.push({
            message: `Invalid value for a ${line.result.keyword} rule. No value found` +
              ` for the following classes: ${classText}.`,
            range: valueResult.range,
            severity: types.DiagnosticSeverity.Error
          });
        } else {
          line.result.diagnostics.push({
            message: `Invalid value for a ${line.result.keyword} rule. Only item bases` +
              " are valid values for this rule.",
            range: valueResult.range,
            severity: types.DiagnosticSeverity.Error
          });
        }
      } else {
        parsedBases.push(value);
      }
    } else {
      if (parsedBases.length === 0 && line.result.diagnostics.length === 0) {
        line.result.diagnostics.push({
          message: `Missing value for ${line.result.keyword} rule. A string value was expected.`,
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          },
          severity: types.DiagnosticSeverity.Error
        });
      }

      break;
    }
  }
}

function parseModRule(line: LineInformation): void {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualsOperator(line, operatorResult);
    }
  }

  const parsedMods: string[] = [];

  while (true) {
    const valueResult = line.parser.nextWordString();

    if (valueResult) {
      const value = valueResult.value;
      let invalid = true;

      if (parsedMods.includes(value)) {
        reportDuplicateString(line, valueResult);
        continue;
      }

      for (const mod of modData.prefixes) {
        if (mod.includes(value)) {
          invalid = false;
          break;
        }
      }

      if (invalid) {
        for (const mod of modData.suffixes) {
          if (mod.includes(value)) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        for (const mod of line.config.modWhitelist) {
          if (mod.includes(value)) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        line.result.diagnostics.push({
          message: `Invalid value for a ${line.result.keyword} rule. Expected an item mod, ` +
            "such as Tyrannical.",
          range: valueResult.range,
          severity: types.DiagnosticSeverity.Error
        });
      } else {
        parsedMods.push(value);
      }
    } else {
      if (parsedMods.length === 0 && line.result.diagnostics.length === 0) {
        line.result.diagnostics.push({
          message: `Missing value for ${line.result.keyword} rule. A string value was expected.`,
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          },
          severity: types.DiagnosticSeverity.Error
        });
      }

      break;
    }
  }
}

export function isKeywordParseLineResult(obj: object): obj is KeywordParseLineResult {
  return (<KeywordParseLineResult>obj).keyword != null;
}

function expectNumber(line: LineInformation, quoted = true): void {
  const rangeLimits = filterData.ruleRanges[line.result.keyword];
  assert(rangeLimits !== undefined);
  const min = rangeLimits.min;
  const max = rangeLimits.max;

  const numberResult = quoted ? line.parser.nextString() : line.parser.nextNumber();

  if (numberResult) {
    validateNumber(line, numberResult, min, max);
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule. Expected a value ` +
        `between ${min} and ${max}.`,
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: types.DiagnosticSeverity.Error
    });
  }
}

function reportUnknownKeyword(line: LineInformation): void {
  line.result.diagnostics.push({
    message: "Unknown filter keyword.",
    range: line.result.keywordRange,
    severity: types.DiagnosticSeverity.Error
  });
}

function resetBlockInformation(context: types.BlockContext): void {
  context.classes = [];
  context.previousRules.clear();
  context.root = undefined;
}

function reportTrailingText(line: LineInformation, severity: types.DiagnosticSeverity): void {
  const range: types.Range = {
    start: { line: line.result.row, character: line.parser.currentIndex },
    end: { line: line.result.row, character: line.parser.textEndIndex }
  };

  let message: string;

  switch (severity) {
    case types.DiagnosticSeverity.Error:
      message = "This trailing text will be considered an error by Path of Exile.";
      break;
    case types.DiagnosticSeverity.Warning:
    case types.DiagnosticSeverity.Hint:
    case types.DiagnosticSeverity.Information:
      message = "This trailing text will be ignored by Path of Exile.";
      break;
    default:
      return helpers.assertUnreachable(severity);
  }

  line.result.diagnostics.push({
    message,
    range,
    severity
  });
}

function reportNonEqualsOperator(line: LineInformation, parse: TokenParseResult<string>): void {
  line.result.diagnostics.push({
    message: `Invalid operator for the ${line.result.keyword} rule. Only the equals` +
      " operator is supported by this rule.",
    range: parse.range,
    severity: types.DiagnosticSeverity.Error
  });
}

function reportInvalidColor(line: LineInformation, result: TokenParseResult<number>,
  min: number, max: number): void {

  line.result.diagnostics.push({
    message: `Invalid value for a ${line.result.keyword} rule.` +
      ` Expected 3-4 numbers within the ${min}-${max} range.`,
    range: result.range,
    severity: types.DiagnosticSeverity.Error
  });
}

function reportMissingColor(line: LineInformation, min: number, max: number): void {
  line.result.diagnostics.push({
    message: `Missing value for a ${line.result.keyword} rule.` +
      ` Expected 3-4 numbers within the ${min}-${max} range.`,
    range: {
      start: { line: line.result.row, character: line.parser.textStartIndex },
      end: { line: line.result.row, character: line.parser.originalLength }
    },
    severity: types.DiagnosticSeverity.Error
  });
}

function reportDuplicateString(line: LineInformation, parse: TokenParseResult<string>): void {
  line.result.diagnostics.push({
    message: `Duplicate value detected within a ${line.result.keyword} rule.`,
    range: parse.range,
    severity: types.DiagnosticSeverity.Hint
  });
}

function verifyFilesExistence(line: LineInformation, parse: TokenParseResult<string>): void {
  const extension = path.extname(parse.value).toLowerCase();

  if (parse.value.length === 0 || whitespaceRegex.test(parse.value)) {
    line.result.diagnostics.push({
      message: `Empty value for a ${line.result.keyword} rule.` +
        " Expected the string to contain either a file name or full file path.",
      range: parse.range
    });
    return;
  } else if (parse.value.length <= 4) {
    // Going by what we know, the path must be at least 5 characters long in
    // due to the file extension, with 'mp3' and 'wav' being supported.
    line.result.diagnostics.push({
      message: `Invalid value for a ${line.result.keyword} rule.` +
        " Expected a file name or full file path ending with a file extension.",
      range: parse.range
    });
    return;
  } else if (extension !== ".mp3" && extension !== ".wav") {
    line.result.diagnostics.push({
      message: `Invalid value for a ${line.result.keyword} rule.` +
        " Expected the file to end with either '.mp3' or '.wav'.",
      range: parse.range
    });
    return;
  }

  if (!line.config.verifyCustomSounds || os.platform() !== "win32") {
    return;
  }

  const firstCharacter = parse.value.charCodeAt(0);
  const secondCharacter = parse.value.charCodeAt(1);

  // Were we given a full path?
  if (isAlphabetical(firstCharacter) && secondCharacter === CharacterCodes.colon) {
    const exists = fs.existsSync(parse.value);

    if (exists) {
      line.result.sound = {
        type: converters.textExtensionToSoundType(extension),
        path: parse.value,
        range: parse.range
      };
    } else {
      line.result.diagnostics.push({
        message: "Invalid value for a CustomAlertSound rule. Expected the given full" +
          " file path to exist on your system.",
        range: parse.range
      });
    }
  } else {
    const documentsPath = line.config.windowsDocumentFolder !== "" ?
      line.config.windowsDocumentFolder : path.join(os.homedir(), "Documents");
    const gameDataRoot = path.join(documentsPath, "My Games", "Path of Exile");
    const fullFilePath = path.join(gameDataRoot, parse.value);

    const exists = fs.existsSync(fullFilePath);

    if (exists) {
      line.result.sound = {
        type: converters.textExtensionToSoundType(extension),
        path: fullFilePath,
        range: parse.range
      };
    } else {
      line.result.diagnostics.push({
        message: "Invalid value for a CustomAlertSound rule. " +
          `Expected a file named ${parse.value} to exist at the following ` +
          `path:\n\n${gameDataRoot}`,
        range: parse.range
      });
    }
  }
}

function validateNumber(line: LineInformation, parse: TokenParseResult<string> |
  TokenParseResult<number>, min: number, max: number): void {

  const message = `Invalid value for a ${line.result.keyword} rule. Valid values ` +
    `are between ${min} and ${max}.`;

  let parsedValue: number;
  if (typeof parse.value === "string") {
    for (const char of parse.value) {
      const value = parseInt(char, 10);

      if (isNaN(value)) {
        line.result.diagnostics.push({
          message,
          range: parse.range,
          severity: types.DiagnosticSeverity.Error
        });

        return;
      }
    }

    parsedValue = parseInt(parse.value, 10);
  } else {
    parsedValue = parse.value;
  }

  if (parsedValue < min || parsedValue > max) {
    line.result.diagnostics.push({
      message,
      range: parse.range,
      severity: types.DiagnosticSeverity.Error
    });
  } else {
    return;
  }
}
