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
import { BlockContext, FilterContext } from "../item-filter";
import { TokenParser, ParseResult } from "./token-parser";

const itemData = <ItemData> require(path.join(dataRoot, "items.json"));
const filterData = <FilterData> require(path.join(dataRoot, "filter.json"));

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

/** The result of parsing an item filter line containing a keyword. */
export interface KeywordedLineParseResult extends BaseLineParseResult {
  /** The keyword of the parsed line. */
  keyword: string;

  /** The range of the keyword parsed from the line. */
  keywordRange: Range;

  /** Whether the keyword was a known one. */
  knownKeyword: boolean;
}

export type LineParseResult = BaseLineParseResult | KeywordedLineParseResult;

/** A bundle of all data relevant when dealing with the current line. */
export interface LineInformation {
  /** The ongoing result of parsing the current line. */
  result: KeywordedLineParseResult;

  /** The configuration variables for the extension. */
  config: ConfigurationValues;

  /** Data associated with only the current block within the item filter. */
  blockContext: BlockContext;

  /** Data associated with the entirety of the item filter. */
  filterContext: FilterContext;

  /** The token parser being used to parse the current line. */
  parser: TokenParser;
}

export function isKeywordedLineParseResult(obj: object): obj is KeywordedLineParseResult {
  return (<KeywordedLineParseResult>obj).keyword != null;
}

function reportUnknownKeyword(line: LineInformation): void {
  line.result.diagnostics.push({
    message: "Unknown filter keyword.",
    range: line.result.keywordRange,
    severity: DiagnosticSeverity.Error,
    source: line.filterContext.source
  });
}

function resetBlockInformation(context: BlockContext): void {
  context.classes = [];
  context.previousRules.clear();
  context.root = undefined;
}

function reportTrailingText(line: LineInformation, severity: DiagnosticSeverity): void {
  const range: Range = {
    start: { line: line.result.row, character: line.parser.currentIndex },
    end: { line: line.result.row, character: line.parser.textEndIndex }
  };

  const message = severity === DiagnosticSeverity.Warning ?
    "This trailing text will be ignored by Path of Exile." :
    "This trailing text will be considered an error by Path of Exile.";

  line.result.diagnostics.push({
    message,
    range,
    severity,
    source: line.filterContext.source
  });
}

function reportNonEqualityOperator(line: LineInformation, parse: ParseResult<string>): void {
  line.result.diagnostics.push({
    message: `Invalid operator for the ${line.result.keyword} rule. Only the equality` +
      " operator is supported by this rule.",
    range: parse.range,
    severity: DiagnosticSeverity.Error,
    source: line.filterContext.source
  });
}

function reportInvalidColor(line: LineInformation, result: ParseResult<number>,
  min: number, max: number): void {

  line.result.diagnostics.push({
    message: `Invalid value for a ${line.result.keyword} rule.` +
      `Expected 3-4 numbers within the ${min}-${max} range.`,
    range: result.range,
    severity: DiagnosticSeverity.Error,
    source: line.filterContext.source
  });
}

function reportMissingColor(line: LineInformation, min: number, max: number): void {
  line.result.diagnostics.push({
    message: `Missing value for a ${line.result.keyword} rule.` +
      `Expected 3-4 numbers within the ${min}-${max} range.`,
    range: {
      start: { line: line.result.row, character: line.parser.textStartIndex },
      end: { line: line.result.row, character: line.parser.originalLength }
    },
    severity: DiagnosticSeverity.Error,
    source: line.filterContext.source
  });
}

function reportDuplicateString(line: LineInformation, parse: ParseResult<string>): void {
  line.result.diagnostics.push({
    message: `Duplicate value detected within a ${line.result.keyword} rule.`,
    range: parse.range,
    severity: DiagnosticSeverity.Warning,
    source: line.filterContext.source
  });
}

function expectNumber(line: LineInformation): ParseResult<number> | undefined {
  const rangeLimits = filterData.ruleRanges[line.result.keyword];
  assert(rangeLimits !== undefined);
  const min = rangeLimits.min;
  const max = rangeLimits.max;
  const additionals = rangeLimits.additionals ? rangeLimits.additionals : [];

  const numberResult = line.parser.nextNumber();

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
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule. ${secondPart}`,
        range: numberResult.range,
        severity: DiagnosticSeverity.Error,
        source: line.filterContext.source
      });
    } else {
      return numberResult;
    }
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule. ${secondPart}`,
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: line.filterContext.source
    });
  }

  return undefined;
}

function parseBlock(line: LineInformation): void {
  resetBlockInformation(line.blockContext);
  line.blockContext.root = line.result.keywordRange;

  if (line.parser.empty || line.parser.isCommented()) {
    return;
  }

  reportTrailingText(line, DiagnosticSeverity.Warning);
}

function parseBooleanRule(line: LineInformation): void {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(line, operatorResult);
    }
  }

  const booleanResult = line.parser.nextBoolean();
  if (!booleanResult) {
    line.result.diagnostics.push({
      message: "A boolean value, either True or False, was expected, yet not found.",
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: line.filterContext.source
    });
  }
}

/**
 * Parses a single number rule from the line.
 * @param equalityOnly True if only the equality operator is valid for this rule.
 * Defaults to false.
 */
function parseSingleNumberRule(line: LineInformation, equalityOnly = false): void {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult && equalityOnly) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(line, operatorResult);
    }
  }

  expectNumber(line);

  if (!line.parser.empty && line.result.diagnostics.length === 0) {
    reportTrailingText(line, DiagnosticSeverity.Error);
  }
}

function parseRarityRule(line: LineInformation): void {
  const raritiesText = stylizedArrayJoin(filterData.rarities);

  line.parser.nextOperator();

  const valueResult = line.parser.nextString();
  if (valueResult) {
    if (!filterData.rarities.includes(valueResult.value)) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule.` +
          ` Valid values are ${raritiesText}.`,
        range: valueResult.range,
        severity: DiagnosticSeverity.Error,
        source: line.filterContext.source
      });
    }
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule.` +
        ` Valid values are ${raritiesText}.`,
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: line.filterContext.source
    });
  }

  if (!line.parser.empty && line.result.diagnostics.length === 0) {
    reportTrailingText(line, DiagnosticSeverity.Error);
  }
}

function parseSocketGroupRule(line: LineInformation): void {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(line, operatorResult);
    }
  }

  const valueResult = line.parser.nextString();
  if (valueResult) {
    const groupRegex = new RegExp("^[rgbw]{1,6}$", "i");
    if (!groupRegex.test(valueResult.value)) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule.` +
          " Expected a word consisting of the R, B, G, and W characters.",
        range: valueResult.range,
        severity: DiagnosticSeverity.Error,
        source: line.filterContext.source
      });
    }
  } else {
    line.result.diagnostics.push({
      message: `Missing value for a ${line.result.keyword} rule.` +
        " Expected a word consisting of the R, B, G, and W characters.",
      range: {
        start: { line: line.result.row, character: line.parser.textStartIndex },
        end: { line: line.result.row, character: line.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: line.filterContext.source
    });
  }

  if (!line.parser.empty && line.result.diagnostics.length === 0) {
    reportTrailingText(line, DiagnosticSeverity.Error);
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
      reportNonEqualityOperator(line, operatorResult);
    }
  }

  let red: ParseResult<number> | undefined;
  const redResult = line.parser.nextNumber();
  if (redResult) {
    if (redResult.value >= min && redResult.value <= max) {
      red = redResult;
    } else {
      reportInvalidColor(line, redResult, min, max);
    }
  } else {
    reportMissingColor(line, min, max);
  }

  let green: ParseResult<number> | undefined;
  const greenResult = line.parser.nextNumber();
  if (greenResult) {
    if (greenResult.value >= min && greenResult.value <= max) {
      green = greenResult;
    } else {
      reportInvalidColor(line, greenResult, min, max);
    }
  } else {
    reportMissingColor(line, min, max);
  }

  let blue: ParseResult<number> | undefined;
  const blueResult = line.parser.nextNumber();
  if (blueResult) {
    if (blueResult.value >= min && blueResult.value <= max) {
      blue = blueResult;
    } else {
      reportInvalidColor(line, blueResult, min, max);
    }
  } else {
    reportMissingColor(line, min, max);
  }

  let alpha: ParseResult<number> | undefined;
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
    const range: Range = {
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
    reportTrailingText(line, DiagnosticSeverity.Error);
  }
}

function parseSoundRule(line: LineInformation) {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(line, operatorResult);
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
        severity: DiagnosticSeverity.Error,
        source: line.filterContext.source
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
          severity: DiagnosticSeverity.Error,
          source: line.filterContext.source
        });
      }
    } else {
      line.result.diagnostics.push({
        message: `Missing value for a ${line.result.keyword} rule. ${secondPart}`,
        range: {
          start: { line: line.result.row, character: line.parser.textStartIndex },
          end: { line: line.result.row, character: line.parser.originalLength }
        },
        severity: DiagnosticSeverity.Error,
        source: line.filterContext.source
      });

      return;
    }
  }

  const volumeResult = line.parser.nextNumber();
  if (volumeResult) {
    if (volumeResult.value < 0 || volumeResult.value > 300) {
      line.result.diagnostics.push({
        message: `Invalid value for a ${line.result.keyword} rule.` +
          "A volume is expected to be a value between 0 and 300.",
        range: volumeResult.range,
        severity: DiagnosticSeverity.Error,
        source: line.filterContext.source
      });
    } else {
      volume = volumeResult.value;
    }
  }

  if (!line.parser.isIgnored() && line.result.diagnostics.length === 0) {
    reportTrailingText(line, DiagnosticSeverity.Error);
  }

  if (identifier && range) {
    const v: number = volume === undefined ? 100 : volume;
    line.result.sound = { knownIdentifier, identifier, volume: v, range };
  }
}

function parseClassRule(line: LineInformation) {
  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(line, operatorResult);
    }
  }

  const parsedClasses: string[] = [];

  while (true) {
    const valueResult = line.parser.nextString();

    if (valueResult) {
      if (parsedClasses.includes(valueResult.value)) {
        reportDuplicateString(line, valueResult);
      }

      let invalid = true;
      for (const c of itemData.classes) {
        if (c.includes(valueResult.value)) {
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
          severity: DiagnosticSeverity.Error,
          source: line.filterContext.source
        });
      } else {
        line.blockContext.classes.push(valueResult.value);
        parsedClasses.push(valueResult.value);
      }
    } else {
      if (parsedClasses.length === 0) {
        line.result.diagnostics.push({
          message: `Missing value for ${line.result.keyword} rule. A string value was expected.`,
          range: {
            start: { line: line.result.row, character: line.parser.textStartIndex },
            end: { line: line.result.row, character: line.parser.originalLength }
          },
          severity: DiagnosticSeverity.Error,
          source: line.filterContext.source
        });
      }

      break;
    }
  }
}

function parseBaseTypeRule(line: LineInformation) {
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
  // The combination currently has parsing down to about 40ms within large
  // item filters with 4,000+ lines, which is within our performance goal.

  const operatorResult = line.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      reportNonEqualityOperator(line, operatorResult);
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
    classText = stylizedArrayJoin(classList);
  } else {
    basePool = itemData.sortedBases;
  }

  while (true) {
    const valueResult = line.parser.nextString();

    if (valueResult) {
      const value = valueResult.value;
      if (parsedBases.includes(value)) {
        reportDuplicateString(line, valueResult);
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
            severity: DiagnosticSeverity.Error,
            source: line.filterContext.source
          });
        } else {
          line.result.diagnostics.push({
            message: `Invalid value for a ${line.result.keyword} rule. Only item bases` +
              " are valid values for this rule.",
            range: valueResult.range,
            severity: DiagnosticSeverity.Error,
            source: line.filterContext.source
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
          severity: DiagnosticSeverity.Error,
          source: line.filterContext.source
        });
      }

      break;
    }
  }
}

export function parseLine(config: ConfigurationValues, filterContext: FilterContext,
  blockContext: BlockContext, text: string, row: number): LineParseResult {

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
    baseResult.diagnostics.push({
      message: "Unreadable keyword, likely due to a stray character.",
      range: baseResult.lineRange,
      severity: DiagnosticSeverity.Error,
      source: filterContext.source
    });
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

  const lineInfo: LineInformation = {
    result: keywordedResult,
    config,
    filterContext,
    blockContext,
    parser,
  };

  switch (keywordedResult.keyword) {
    case "Show":
    case "Hide":
      parseBlock(lineInfo);
      break;
    case "ItemLevel":
    case "DropLevel":
    case "Quality":
    case "Sockets":
    case "LinkedSockets":
    case "Height":
    case "Width":
      parseSingleNumberRule(lineInfo);
      break;
    case "SetFontSize":
      parseSingleNumberRule(lineInfo, true);
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
    case "DisableDropSound":
      parseBooleanRule(lineInfo);
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
    default:
      let whitelistedKeyword = false;
      for (const wlr of config.ruleWhitelist) {
        if (keywordedResult.keyword === wlr) whitelistedKeyword = true;
      }

      keywordedResult.knownKeyword = false;
      if (!whitelistedKeyword) reportUnknownKeyword(lineInfo);
  }

  return keywordedResult;
}
