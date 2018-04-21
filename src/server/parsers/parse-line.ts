/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import * as path from "path";
import { ColorInformation, Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";

import { dataRoot } from "../../common";
import { ConfigurationValues, FilterData, ItemData, SoundInformation } from "../../types";
import { stylizedArrayJoin } from "../helpers";
import { BlockContext } from "../item-filter";
import { TokenParser, ParseResult } from "./token-parser";

const itemData: ItemData = require(path.join(dataRoot, "items.json"));
const filterData: FilterData = require(path.join(dataRoot, "filter.json"));

/** The result of parsing an item filter line. */
export interface BaseLineParseResult {
  /** The line number of the parsed line. */
  row: number;

  /** The range of the text on the line. */
  lineRange: Range;

  /** The diagnostic messages reported by the parser. */
  diagnostics: Diagnostic[];

  /** Color information parsed from the line. */
  color?: ColorInformation;

  /** Sound information parsed from the line. */
  sound?: SoundInformation;
}

export interface KeywordedLineParseResult extends BaseLineParseResult {
  /** The keyword of the parsed line. */
  keyword: string;

  /** The range of the keyword parsed from the line. */
  keywordRange: Range;

  /** Whether the keyword was a known one. */
  knownKeyword: boolean;
}

export type LineParseResult = BaseLineParseResult | KeywordedLineParseResult;

export function isKeywordedLineParseResult(obj: object): obj is KeywordedLineParseResult {
  return (<KeywordedLineParseResult>obj).keyword != null;
}

function reportUnparseableKeyword(output: LineParseResult, context: BlockContext): void {
  output.diagnostics.push({
    message: "Unreadable keyword, likely due to a stray character.",
    range: output.lineRange,
    severity: DiagnosticSeverity.Error,
    source: context.source
  });
}

function reportUnknownKeyword(output: LineParseResult, context: BlockContext): void {
  const range = isKeywordedLineParseResult(output) ? output.keywordRange : output.lineRange;

  output.diagnostics.push({
    message: "Unknown filter keyword.",
    range,
    severity: DiagnosticSeverity.Error,
    source: context.source
  });
}

function resetBlockInformation(context: BlockContext): void {
  context.classes = [];
  context.previousRules.clear();
  context.root = undefined;
}

function reportTrailingText(output: LineParseResult, context: BlockContext,
  parser: TokenParser, severity: DiagnosticSeverity): void {

  const range: Range = {
    start: { line: output.row, character: parser.currentIndex },
    end: { line: output.row, character: parser.textEndIndex }
  };

  const message = severity === DiagnosticSeverity.Warning ?
    "This trailing text will be ignored by Path of Exile." :
    "This trailing text will be considered an error by Path of Exile.";

  output.diagnostics.push({
    message,
    range,
    severity,
    source: context.source
  });
}

function reportNonEqualityOperator(output: KeywordedLineParseResult, context: BlockContext,
  parse: ParseResult<string>): void {

  output.diagnostics.push({
    message: `Invalid operator for the ${output.keyword} rule. Only the equality` +
      " operator is supported by this rule.",
    range: parse.range,
    severity: DiagnosticSeverity.Error,
    source: context.source
  });
}

function reportInvalidColor(output: KeywordedLineParseResult, context: BlockContext,
  result: ParseResult<number>, min: number, max: number): void {

  output.diagnostics.push({
    message: `Invalid value for a ${output.keyword} rule.` +
      `Expected 3-4 numbers within the ${min}-${max} range.`,
    range: result.range,
    severity: DiagnosticSeverity.Error,
    source: context.source
  });
}

function reportMissingColor(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser, min: number, max: number): void {

  output.diagnostics.push({
    message: `Missing value for a ${output.keyword} rule.` +
      `Expected 3-4 numbers within the ${min}-${max} range.`,
    range: {
      start: { line: output.row, character: parser.textStartIndex },
      end: { line: output.row, character: parser.originalLength }
    },
    severity: DiagnosticSeverity.Error,
    source: context.source
  });
}

function reportDuplicateString(output: KeywordedLineParseResult, context: BlockContext,
  parse: ParseResult<string>): void {

  output.diagnostics.push({
    message: `Duplicate value detected within a ${output.keyword} rule.`,
    range: parse.range,
    severity: DiagnosticSeverity.Warning,
    source: context.source
  });
}

function expectNumber(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser): ParseResult<number> | undefined {

  const rangeLimits = filterData.ruleRanges[output.keyword];
  assert(rangeLimits !== undefined);
  const min = rangeLimits.min;
  const max = rangeLimits.max;
  const additionals = rangeLimits.additionals ? rangeLimits.additionals : [];

  const numberResult = parser.nextNumber();

  let secondPart: string;
  if (additionals.length > 0) {
    const additionalText = stylizedArrayJoin(additionals, ", or ");
    secondPart = ` Valid values are either ${min}-${max} or ${additionalText}.`;
  } else {
    secondPart = ` Valid values are between ${min} and ${max}.`;
  }

  if (numberResult) {
    let invalid = numberResult.value < min || numberResult.value > max;

    if (invalid) {
      for (const v of additionals) {
        if (numberResult.value === v) invalid = false;
      }
    }

    if (invalid) {
      output.diagnostics.push({
        message: `Invalid value for a ${output.keyword} rule. ${secondPart}`,
        range: numberResult.range,
        severity: DiagnosticSeverity.Error,
        source: context.source
      });
    } else {
      return numberResult;
    }
  } else {
    output.diagnostics.push({
      message: `Missing value for a ${output.keyword} rule. ${secondPart}`,
      range: {
        start: { line: output.row, character: parser.textStartIndex },
        end: { line: output.row, character: parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: context.source
    });
  }

  return undefined;
}

function parseBlock(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser): void {

  resetBlockInformation(context);
  context.root = output.keywordRange;

  if (parser.empty || parser.isCommented()) {
    return;
  }

  reportTrailingText(output, context, parser, DiagnosticSeverity.Warning);
}

function parseBooleanRule(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser): void {

  const operatorResult = parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(output, context, operatorResult);
    }
  }

  const booleanResult = parser.nextBoolean();
  if (!booleanResult) {
    output.diagnostics.push({
      message: "A boolean value, either True or False, was expected, yet not found.",
      range: {
        start: { line: output.row, character: parser.textStartIndex },
        end: { line: output.row, character: parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: context.source
    });
  }
}

/**
 * Parses a single number rule from the line.
 * @param equalityOnly True if only the equality operator is valid for this rule.
 * Defaults to false.
 */
function parseSingleNumberRule(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser, equalityOnly = false): void {

  const operatorResult = parser.nextOperator();
  if (operatorResult && equalityOnly) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(output, context, operatorResult);
    }
  }

  expectNumber(output, context, parser);

  if (!parser.empty && output.diagnostics.length === 0) {
    reportTrailingText(output, context, parser, DiagnosticSeverity.Error);
  }
}

function parseRarityRule(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser): void {

  const raritiesText = stylizedArrayJoin(filterData.rarities);

  parser.nextOperator();

  const valueResult = parser.nextString();
  if (valueResult) {
    if (!filterData.rarities.includes(valueResult.value)) {
      output.diagnostics.push({
        message: `Invalid value for a ${output.keyword} rule.` +
          ` Valid values are ${raritiesText}.`,
        range: valueResult.range,
        severity: DiagnosticSeverity.Error,
        source: context.source
      });
    }
  } else {
    output.diagnostics.push({
      message: `Missing value for a ${output.keyword} rule.` +
        ` Valid values are ${raritiesText}.`,
      range: {
        start: { line: output.row, character: parser.textStartIndex },
        end: { line: output.row, character: parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: context.source
    });
  }

  if (!parser.empty && output.diagnostics.length === 0) {
    reportTrailingText(output, context, parser, DiagnosticSeverity.Error);
  }
}

function parseSocketGroupRule(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser): void {

  const operatorResult = parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(output, context, operatorResult);
    }
  }

  const valueResult = parser.nextString();
  if (valueResult) {
    const groupRegex = new RegExp("^[rgbw]{1,6}$", "i");
    if (!groupRegex.test(valueResult.value)) {
      output.diagnostics.push({
        message: `Invalid value for a ${output.keyword} rule.` +
          " Expected a word consisting of the R, B, G, and W characters.",
        range: valueResult.range,
        severity: DiagnosticSeverity.Error,
        source: context.source
      });
    }
  } else {
    output.diagnostics.push({
      message: `Missing value for a ${output.keyword} rule.` +
        " Expected a word consisting of the R, B, G, and W characters.",
      range: {
        start: { line: output.row, character: parser.textStartIndex },
        end: { line: output.row, character: parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: context.source
    });
  }

  if (!parser.empty && output.diagnostics.length === 0) {
    reportTrailingText(output, context, parser, DiagnosticSeverity.Error);
  }
}

function parseColorRule(output: KeywordedLineParseResult, context: BlockContext,
  parser: TokenParser): void {

  const rangeLimits = filterData.ruleRanges[output.keyword];
  assert(rangeLimits !== undefined);
  const min = rangeLimits.min;
  const max = rangeLimits.max;

  const operatorResult = parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(output, context, operatorResult);
    }
  }

  let red: ParseResult<number> | undefined;
  const redResult = parser.nextNumber();
  if (redResult) {
    if (redResult.value >= min && redResult.value <= max) {
      red = redResult;
    } else {
      reportInvalidColor(output, context, redResult, min, max);
    }
  } else {
    reportMissingColor(output, context, parser, min, max);
  }

  let green: ParseResult<number> | undefined;
  const greenResult = parser.nextNumber();
  if (greenResult) {
    if (greenResult.value >= min && greenResult.value <= max) {
      green = greenResult;
    } else {
      reportInvalidColor(output, context, greenResult, min, max);
    }
  } else {
    reportMissingColor(output, context, parser, min, max);
  }

  let blue: ParseResult<number> | undefined;
  const blueResult = parser.nextNumber();
  if (blueResult) {
    if (blueResult.value >= min && blueResult.value <= max) {
      blue = blueResult;
    } else {
      reportInvalidColor(output, context, blueResult, min, max);
    }
  } else {
    reportMissingColor(output, context, parser, min, max);
  }

  let alpha: ParseResult<number> | undefined;
  const alphaResult = parser.nextNumber();
  if (alphaResult) {
    if (alphaResult.value >= min && alphaResult.value <= max) {
      alpha = alphaResult;
    } else {
      reportInvalidColor(output, context, alphaResult, min, max);
    }
  }

  if (red && green && blue) {
    const redValue = red.value / 255;
    const greenValue = green.value / 255;
    const blueValue = blue.value / 255;
    const alphaValue = alpha === undefined ? 1 : alpha.value / 255;

    const endIndex = alpha ? alpha.range.end.character : blue.range.end.character;
    const range: Range = {
      start: { line: output.row, character: red.range.start.character },
      end: { line: output.row, character: endIndex }
    };

    output.color = {
      color: {
        red: redValue,
        blue: blueValue,
        green: greenValue,
        alpha: alphaValue
      },
      range
    };
  }

  if (!parser.isIgnored() && output.diagnostics.length === 0) {
    reportTrailingText(output, context, parser, DiagnosticSeverity.Error);
  }
}

function parseSoundRule(output: KeywordedLineParseResult, config: ConfigurationValues,
  context: BlockContext, parser: TokenParser) {

  const operatorResult = parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(output, context, operatorResult);
    }
  }

  let identifier: string | undefined;
  let volume: number | undefined;
  let range: Range | undefined;
  let knownIdentifier = false;

  const min = filterData.sounds.numberIdentifier.min;
  const max = filterData.sounds.numberIdentifier.max;
  const secondPart = ` Expected a number from ${min}-${max} or a valid sound identifier.`;

  let invalidIdentifier = true;
  const wordResult = parser.nextWord();
  if (wordResult) {
    for (const id in filterData.sounds.stringIdentifiers) {
      if (id === wordResult.value) {
        identifier = wordResult.value;
        range = wordResult.range;
        knownIdentifier = true;
        invalidIdentifier = false;
      }
    }

    for (const id of config.soundWhitelist) {
      if (id === wordResult.value) {
        identifier = wordResult.value;
        range = wordResult.range;
        invalidIdentifier = false;
      }
    }

    if (invalidIdentifier) {
      output.diagnostics.push({
        message: `Invalid value for a ${output.keyword} rule. ${secondPart}`,
        range: wordResult.range,
        severity: DiagnosticSeverity.Error,
        source: context.source
      });
    }
  } else {
    const numberResult = parser.nextNumber();
    if (numberResult) {
      if (numberResult.value >= min && numberResult.value <= max) {
        identifier = `${numberResult.value}`;
        range = numberResult.range;
        knownIdentifier = true;
        invalidIdentifier = false;
      } else {
        output.diagnostics.push({
          message: `Invalid value for a ${output.keyword} rule. ${secondPart}`,
          range: numberResult.range,
          severity: DiagnosticSeverity.Error,
          source: context.source
        });
      }
    } else {
      output.diagnostics.push({
        message: `Missing value for a ${output.keyword} rule. ${secondPart}`,
        range: {
          start: { line: output.row, character: parser.textStartIndex },
          end: { line: output.row, character: parser.originalLength }
        },
        severity: DiagnosticSeverity.Error,
        source: context.source
      });

      return;
    }
  }

  const volumeResult = parser.nextNumber();
  if (volumeResult) {
    if (volumeResult.value < 0 || volumeResult.value > 300) {
      output.diagnostics.push({
        message: `Invalid value for a ${output.keyword} rule.` +
          "A volume is expected to be a value between 0 and 300.",
        range: volumeResult.range,
        severity: DiagnosticSeverity.Error,
        source: context.source
      });
    } else {
      volume = volumeResult.value;
    }
  }

  if (!parser.isIgnored() && output.diagnostics.length === 0) {
    reportTrailingText(output, context, parser, DiagnosticSeverity.Error);
  }

  if (identifier && range) {
    const v: number = volume === undefined ? 100 : volume;
    output.sound = { knownIdentifier, identifier, volume: v, range };
  }
}

function parseClassRule(output: KeywordedLineParseResult, config: ConfigurationValues,
  context: BlockContext, parser: TokenParser) {

  const operatorResult = parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(output, context, operatorResult);
    }
  }

  const parsedClasses: string[] = [];

  while (true) {
    const valueResult = parser.nextString();

    if (valueResult) {
      if (parsedClasses.includes(valueResult.value)) {
        reportDuplicateString(output, context, valueResult);
      }

      let invalid = true;
      for (const c of itemData.classes) {
        if (c.includes(valueResult.value)) {
          invalid = false;
          break;
        }
      }

      if (invalid) {
        for (const wlc of config.classWhitelist) {
          if (wlc.includes(valueResult.value)) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        output.diagnostics.push({
          message: `Invalid value for a ${output.keyword} rule. Only item classes` +
            " are valid values for this rule.",
          range: valueResult.range,
          severity: DiagnosticSeverity.Error,
          source: context.source
        });
      } else {
        context.classes.push(valueResult.value);
        parsedClasses.push(valueResult.value);
      }
    } else {
      if (parsedClasses.length === 0) {
        output.diagnostics.push({
          message: `Missing value for ${output.keyword} rule. A string value was expected.`,
          range: {
            start: { line: output.row, character: parser.textStartIndex },
            end: { line: output.row, character: parser.originalLength }
          },
          severity: DiagnosticSeverity.Error,
          source: context.source
        });
      }

      break;
    }
  }
}

function parseBaseTypeRule(output: KeywordedLineParseResult, config: ConfigurationValues,
  context: BlockContext, parser: TokenParser) {

  // This function is the hotpath of the entire language server. Validating
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
  // The combination currently has parsing down to about 130ms within large
  // item filters with 4,000+ lines, which is within our performance goal.

  const operatorResult = parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(output, context, operatorResult);
    }
  }

  const parsedBases: string[] = [];
  let basePool: string[] = [];
  let classText: string | undefined;

  // If we assume ~30 items per class, then around 5 is when the class strategy
  // starts to actually perform worse. We could cutoff there, but we want to
  // have consistency with the diagnostics.
  const usingClasses = context.classes.length > 0;

  if (usingClasses) {
    const classList: string[] = [];
    for (const itemClass of context.classes) {
      // The above item class could still be partial, so pull the item bases
      // for each matching class.
      for (const fullItemClass of itemData.classes) {
        if (fullItemClass.includes(itemClass)) {
          basePool.push.apply(basePool, itemData.classesToBases[fullItemClass]);
          classList.push(fullItemClass);
        }
      }
    }
    classText = stylizedArrayJoin(classList);
  } else {
    basePool = itemData.sortedBases;
  }

  while (true) {
    const valueResult = parser.nextString();

    if (valueResult) {
      const value = valueResult.value;
      if (parsedBases.includes(value)) {
        reportDuplicateString(output, context, valueResult);
      }

      let invalid = true;
      if (usingClasses) {
        for (const itemBase of basePool) {
          if (itemBase.length >= value.length && itemBase.includes(value)) {
            invalid = false;
            break;
          }
        }
      } else {
        const startIndex = itemData.sortedBasesIndices[value.length - 1];
        for (let i = startIndex; i < itemData.sortedBases.length; i++) {
          const itemBase = basePool[i];
          if (itemBase.includes(value)) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        for (const wlb of config.baseWhitelist) {
          if (wlb.includes(value)) {
            invalid = false;
            break;
          }
        }
      }

      if (invalid) {
        if (classText) {
          output.diagnostics.push({
            message: `Invalid value for a ${output.keyword} rule. No value found` +
              ` for the following classes: ${classText}.`,
            range: valueResult.range,
            severity: DiagnosticSeverity.Error,
            source: context.source
          });
        } else {
          output.diagnostics.push({
            message: `Invalid value for a ${output.keyword} rule. Only item bases` +
              " are valid values for this rule.",
            range: valueResult.range,
            severity: DiagnosticSeverity.Error,
            source: context.source
          });
        }
      } else {
        parsedBases.push(value);
      }
    } else {
      if (parsedBases.length === 0 && output.diagnostics.length === 0) {
        output.diagnostics.push({
          message: `Missing value for ${output.keyword} rule. A string value was expected.`,
          range: {
            start: { line: output.row, character: parser.textStartIndex },
            end: { line: output.row, character: parser.originalLength }
          },
          severity: DiagnosticSeverity.Error,
          source: context.source
        });
      }

      break;
    }
  }
}

export function parseLine(config: ConfigurationValues, context: BlockContext,
  text: string, row: number): LineParseResult {

  const parser = new TokenParser(text, row);
  const baseResult: BaseLineParseResult = {
    row,
    lineRange: {
      start: { line: parser.row, character: parser.textStartIndex },
      end: { line: parser.row, character: parser.textEndIndex }
    },
    diagnostics: [],
  };

  // TODO(glen): implement isEmpty() with the parser revamp.
  if (parser.empty || parser.isCommented()) return baseResult;

  const keywordResult = parser.nextWord();
  if (!keywordResult) {
    reportUnparseableKeyword(baseResult, context);
    return baseResult;
  }

  const keywordedResult: KeywordedLineParseResult = {
    row,
    lineRange: baseResult.lineRange,
    diagnostics: baseResult.diagnostics,
    keyword: keywordResult.value,
    keywordRange: keywordResult.range,
    knownKeyword: true,
  };

  switch (keywordedResult.keyword) {
    case "Show":
    case "Hide":
      parseBlock(keywordedResult, context, parser);
      break;
    case "ItemLevel":
    case "DropLevel":
    case "Quality":
    case "Sockets":
    case "LinkedSockets":
    case "Height":
    case "Width":
      parseSingleNumberRule(keywordedResult, context, parser);
      break;
    case "SetFontSize":
      parseSingleNumberRule(keywordedResult, context, parser, true);
      break;
    case "Rarity":
      parseRarityRule(keywordedResult, context, parser);
      break;
    case "SocketGroup":
      parseSocketGroupRule(keywordedResult, context, parser);
      break;
    case "Identified":
    case "Corrupted":
    case "ElderItem":
    case "ShaperItem":
    case "ShapedMap":
    case "ElderMap":
    case "DisableDropSound":
      parseBooleanRule(keywordedResult, context, parser);
      break;
    case "SetBorderColor":
    case "SetTextColor":
    case "SetBackgroundColor":
      parseColorRule(keywordedResult, context, parser);
      break;
    case "Class":
      parseClassRule(keywordedResult, config, context, parser);
      break;
    case "BaseType":
      parseBaseTypeRule(keywordedResult, config, context, parser);
      break;
    case "PlayAlertSound":
    case "PlayAlertSoundPositional":
      parseSoundRule(keywordedResult, config, context, parser);
      break;
    default:
      let whitelistedKeyword = false;
      for (const wlr of config.ruleWhitelist) {
        if (keywordedResult.keyword === wlr) whitelistedKeyword = true;
      }

      keywordedResult.knownKeyword = false;
      if (!whitelistedKeyword) reportUnknownKeyword(keywordedResult, context);
  }

  return keywordedResult;
}
