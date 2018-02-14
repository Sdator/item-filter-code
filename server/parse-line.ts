/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";
import { ColorInformation } from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { FilterData } from "./common";
import { getOrdinal, stylizedArrayJoin } from "./helpers";
import { FilterContext } from "./item-filter";
import { TokenParser, ParseResult, isParseResult } from "./token-parser";

const filterData: FilterData = require("../filter.json");

export interface ParseLineResult {
  diagnostics?: Diagnostic[];
  color?: ColorInformation;
}

interface LineContext {
  line: number;
  parser: TokenParser;
  keyword: string;
  keywordRange: Range;
  lineRange: Range;
}

function reportTrailingText(filterContext: FilterContext, lineContext: LineContext,
  severity: DiagnosticSeverity = DiagnosticSeverity.Error): Diagnostic {

  const range: Range = {
    start: { line: lineContext.line, character: lineContext.parser.currentIndex },
    end: { line: lineContext.line, character: lineContext.parser.textEndIndex }
  };

  const message = severity === DiagnosticSeverity.Warning ?
    "This trailing text will be ignored by Path of Exile." :
    "This trailing text will be considered an error by Path of Exile.";

  return {
    message,
    range,
    severity,
    source: filterContext.source
  };
}

function reportNonEqualityOperator(filterContext: FilterContext, lineContext: LineContext,
  parse: ParseResult<string>): Diagnostic {

  return {
    message: `Invalid operator for the ${lineContext.keyword} rule. Only the equality` +
      " operator is supported by this rule.",
    range: parse.range,
    severity: DiagnosticSeverity.Error,
    source: filterContext.source
  };
}

function getNumber(filterContext: FilterContext, lineContext: LineContext):
  ParseResult<number> | Diagnostic | undefined {

  const rangeLimits = filterData.ruleRanges[lineContext.keyword];
  assert(rangeLimits !== undefined);
  const min = rangeLimits.min;
  const max = rangeLimits.max;
  const additionals = rangeLimits.additionals ? rangeLimits.additionals : [];

  const numberResult = lineContext.parser.nextNumber();

  let secondPart: string;
  if (additionals.length > 0) {
    const additionalText = stylizedArrayJoin(additionals, ", or ");
    secondPart = ` Valid values are either ${min}-${max} or ${additionalText}.`
  } else {
    secondPart = ` Valid values are between ${min} and ${max}.`;
  }

  if (numberResult) {
    let invalid = numberResult.value < min || numberResult.value > max;

    if (invalid) {
      for (let v of additionals) {
        if (numberResult.value === v) invalid = false;
      }
    }

    if (invalid) {
      return {
        message: `Invalid value for a ${lineContext.keyword} rule. ${secondPart}`,
        range: numberResult.range,
        severity: DiagnosticSeverity.Error,
        source: filterContext.source
      };
    } else {
      return numberResult;
    }
  } else {
    return {
      message: `Missing value for a ${lineContext.keyword} rule. ${secondPart}`,
      range: {
        start: { line: lineContext.line, character: lineContext.parser.textStartIndex },
        end: { line: lineContext.line, character: lineContext.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: filterContext.source
    };
  }
}

function getInvalidColorDiagnostic(filterContext: FilterContext, lineContext: LineContext,
  result: ParseResult<number>, min: number, max: number): Diagnostic {

  return {
    message: `Invalid value for a ${lineContext.keyword} rule.` +
      `Expected 3-4 numbers within the ${min}-${max} range.`,
    range: result.range,
    severity: DiagnosticSeverity.Error,
    source: filterContext.source
  }
}

function getMissingColorDiagnostic(filterContext: FilterContext, lineContext: LineContext,
  min: number, max: number):
  Diagnostic {

  return {
    message: `Missing value for a ${lineContext.keyword} rule.` +
      `Expected 3-4 numbers within the ${min}-${max} range.`,
    range: {
      start: { line: lineContext.line, character: lineContext.parser.textStartIndex },
      end: { line: lineContext.line, character: lineContext.parser.originalLength }
    },
    severity: DiagnosticSeverity.Error,
    source: filterContext.source
  }
}

function checkRuleLimit(filterContext: FilterContext, lineContext: LineContext):
  Diagnostic | undefined {

  const ruleLimit = filterData.ruleLimits[lineContext.keyword];
  assert(ruleLimit !== undefined);

  const occurrences = filterContext.previousRules.get(lineContext.keyword);
  if (occurrences === undefined) return undefined;

  if (occurrences === ruleLimit) {
    return {
      message: `${getOrdinal(occurrences + 1)} occurrence of the` +
        ` ${lineContext.keyword} rule within a block with a limit of ${ruleLimit}.`,
      range: lineContext.keywordRange,
      severity: DiagnosticSeverity.Warning,
      source: filterContext.source
    }
  } else {
    return undefined;
  }
}

// TODO(glen): change into a report function.
function processUnparseableKeyword(filterContext: FilterContext, range: Range): ParseLineResult {
  return {
    diagnostics: [{
      message: "Unreadable keyword, likely due to a stray character.",
      range,
      severity: DiagnosticSeverity.Error,
      source: filterContext.source
    }]
  };
}

// function processUnknownKeyword(filterContext: FilterContext, lineContext: LineContext):
//   ParseLineResult {

//   return {
//     diagnostics: [{
//       message: "Unknown filter keyword.",
//       range: lineContext.keywordRange,
//       severity: DiagnosticSeverity.Error,
//       source: filterContext.source
//     }]
//   };
// }

function resetBlockInformation(filterContext: FilterContext) {
  filterContext.classes = [];
  filterContext.previousRules.clear();
  filterContext.root = undefined;
}

/** Processes the given line, returning the result of the parsing. */
export function parseLine(filterContext: FilterContext, text: string, line: number):
  ParseLineResult {

  const parser = new TokenParser(text, line);

  if (parser.empty) return {};
  if (parser.isCommented()) return {};

  const lineRange: Range = {
    start: { line, character: parser.textStartIndex },
    end: { line, character: parser.textEndIndex }
  };

  const keywordResult = parser.nextWord();
  if (!keywordResult) {
    return processUnparseableKeyword(filterContext, lineRange);
  }

  const keyword = keywordResult.value;
  const keywordRange = keywordResult.range;

  const lineContext: LineContext = {
    line,
    parser,
    keyword,
    keywordRange,
    lineRange
  };

  let result: ParseLineResult;
  switch (keyword) {
    case "Show":
    case "Hide":
      result = parseBlock(filterContext, lineContext);
      break;
    case "ItemLevel":
    case "DropLevel":
    case "Quality":
    case "Sockets":
    case "LinkedSockets":
    case "Height":
    case "Width":
      result = parseSingleNumberRule(filterContext, lineContext);
      break;
    case "SetFontSize":
      result = parseSingleNumberRule(filterContext, lineContext, true);
      break;
    case "Rarity":
      result = parseRarityRule(filterContext, lineContext);
      break;
    case "SocketGroup":
      result = parseSocketGroupRule(filterContext, lineContext);
      break;
    case "Identified":
    case "Corrupted":
    case "ElderItem":
    case "ShaperItem":
    case "ShapedMap":
      result = parseBooleanRule(filterContext, lineContext);
      break;
    case "SetBorderColor":
    case "SetTextColor":
    case "SetBackgroundColor":
      result = parseColorRule(filterContext, lineContext);
      break;
    default:
      // TODO(glen): allow whitelist rules to bypass here.
      // return processUnknownKeyword(filterContext, lineContext);
      return {}

  }

  if (lineContext.keyword !== "Show" && lineContext.keyword !== "Hide") {
    const limitDiagnostic = checkRuleLimit(filterContext, lineContext);
    if (limitDiagnostic) {
      if (result.diagnostics) result.diagnostics.push(limitDiagnostic);
      else result.diagnostics = [limitDiagnostic];
    }

    let occurrences = filterContext.previousRules.get(lineContext.keyword);
    occurrences = occurrences === undefined ? 1 : occurrences + 1;
    filterContext.previousRules.set(lineContext.keyword, occurrences);
  }

  return result;
}

function parseBlock(filterContext: FilterContext, lineContext: LineContext): ParseLineResult {
  resetBlockInformation(filterContext);
  filterContext.root = lineContext.keywordRange;

  if (lineContext.parser.empty || lineContext.parser.isCommented()) {
    return {};
  }

  const diagnostic = reportTrailingText(filterContext, lineContext, DiagnosticSeverity.Warning);
  return {
    diagnostics: [diagnostic]
  };
}

function parseBooleanRule(filterContext: FilterContext, lineContext: LineContext):
  ParseLineResult {

  const diagnostics: Diagnostic[] = [];

  const operatorResult = lineContext.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      diagnostics.push(reportNonEqualityOperator(filterContext, lineContext,
        operatorResult));
    }
  }

  const booleanResult = lineContext.parser.nextBoolean();
  if (!booleanResult) {
    diagnostics.push({
      message: "A boolean value, either True or False, was expected, yet not found.",
      range: {
        start: { line: lineContext.line, character: lineContext.parser.textStartIndex },
        end: { line: lineContext.line, character: lineContext.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: filterContext.source
    });
  }

  return { diagnostics };
}

/**
 * Parses a single number rule from the line.
 * @param filterContext The context for the filter being parsed.
 * @param lineContext The context for the current line being parsed.
 * @param equalityOnly True if only the equality operator is valid for this rule. Defaults
 * to false.
 */
function parseSingleNumberRule(filterContext: FilterContext, lineContext: LineContext,
  equalityOnly = false): ParseLineResult {

  const diagnostics: Diagnostic[] = [];

  const operatorResult = lineContext.parser.nextOperator();
  if (operatorResult && equalityOnly) {
    if (operatorResult.value !== "=") {
      diagnostics.push(reportNonEqualityOperator(filterContext, lineContext,
        operatorResult));
    }
  }

  const parseResult = getNumber(filterContext, lineContext);
  if (parseResult && !isParseResult(parseResult)) {
    diagnostics.push(parseResult);
  }

  if (!lineContext.parser.empty && diagnostics.length === 0) {
    diagnostics.push(reportTrailingText(filterContext, lineContext));
  }

  return { diagnostics };
}

function parseRarityRule(filterContext: FilterContext, lineContext: LineContext): ParseLineResult {
  const diagnostics: Diagnostic[] = [];
  const raritiesText = stylizedArrayJoin(filterData.rarities);

  // Just bypass the operator -- we don't care about the value.
  lineContext.parser.nextOperator();

  const valueResult = lineContext.parser.nextString();
  if (valueResult) {
    if (!filterData.rarities.includes(valueResult.value)) {
      diagnostics.push({
        message: `Invalid value for a ${lineContext.keyword} rule.` +
          ` Valid values are ${raritiesText}.`,
        range: valueResult.range,
        severity: DiagnosticSeverity.Error,
        source: filterContext.source
      });
    }
  } else {
    diagnostics.push({
      message: `Missing value for a ${lineContext.keyword} rule.` +
        ` Valid values are ${raritiesText}.`,
      range: {
        start: { line: lineContext.line, character: lineContext.parser.textStartIndex },
        end: { line: lineContext.line, character: lineContext.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: filterContext.source
    });
  }

  if (!lineContext.parser.empty && diagnostics.length === 0) {
    diagnostics.push(reportTrailingText(filterContext, lineContext));
  }

  return { diagnostics };
}

function parseSocketGroupRule(filterContext: FilterContext, lineContext: LineContext):
  ParseLineResult {

  const diagnostics: Diagnostic[] = [];

  const operatorResult = lineContext.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      diagnostics.push(reportNonEqualityOperator(filterContext, lineContext,
        operatorResult));
    }
  }

  const valueResult = lineContext.parser.nextString();
  if (valueResult) {
    const groupRegex = new RegExp("^[rgbw]{1,6}$", "i");
    if (!groupRegex.test(valueResult.value)) {
      diagnostics.push({
        message: `Invalid value for a ${lineContext.keyword} rule.` +
          " Expected a word consisting of the R, B, G, and W characters.",
        range: valueResult.range,
        severity: DiagnosticSeverity.Error,
        source: filterContext.source
      });
    }
  } else {
    diagnostics.push({
      message: `Missing value for a ${lineContext.keyword} rule.` +
        " Expected a word consisting of the R, B, G, and W characters.",
      range: {
        start: { line: lineContext.line, character: lineContext.parser.textStartIndex },
        end: { line: lineContext.line, character: lineContext.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: filterContext.source
    });
  }

  if (!lineContext.parser.empty && diagnostics.length === 0) {
    diagnostics.push(reportTrailingText(filterContext, lineContext));
  }

  return { diagnostics };
}

function parseColorRule(filterContext: FilterContext, lineContext: LineContext):
  ParseLineResult {

  const diagnostics: Diagnostic[] = [];

  const rangeLimits = filterData.ruleRanges[lineContext.keyword];
  assert(rangeLimits !== undefined);
  const min = rangeLimits.min;
  const max = rangeLimits.max;

  // TODO(glen): merge these into a checkEqOperator function.
  const operatorResult = lineContext.parser.nextOperator();
  if (operatorResult) {
    if (operatorResult.value !== "=") {
      diagnostics.push(reportNonEqualityOperator(filterContext, lineContext,
        operatorResult));
    }
  }

  let red: ParseResult<number> | undefined;
  const redResult = lineContext.parser.nextNumber();
  if (redResult) {
    if (redResult.value >= min && redResult.value <= max) {
      red = redResult;
    } else {
      diagnostics.push(getInvalidColorDiagnostic(filterContext, lineContext,
        redResult, min, max));
    }
  } else {
    diagnostics.push(getMissingColorDiagnostic(filterContext, lineContext, min, max));
    return { diagnostics };
  }

  let green: ParseResult<number> | undefined;
  const greenResult = lineContext.parser.nextNumber();
  if (greenResult) {
    if (redResult.value >= min && redResult.value <= max) {
      green = greenResult;
    } else {
      diagnostics.push(getInvalidColorDiagnostic(filterContext, lineContext,
        greenResult, min, max));
    }
  } else {
    diagnostics.push(getMissingColorDiagnostic(filterContext, lineContext, min, max));
    return { diagnostics };
  }

  let blue: ParseResult<number> | undefined;
  const blueResult = lineContext.parser.nextNumber();
  if (blueResult) {
    if (redResult.value >= min && redResult.value <= max) {
      blue = blueResult;
    } else {
      diagnostics.push(getInvalidColorDiagnostic(filterContext, lineContext, blueResult,
        min, max));
    }
  } else {
    diagnostics.push(getMissingColorDiagnostic(filterContext, lineContext, min, max));
    return { diagnostics };
  }

  let alpha: ParseResult<number> | undefined;
  const alphaResult = lineContext.parser.nextNumber();
  if (alphaResult) {
    if (redResult.value >= min && redResult.value <= max) {
      alpha = alphaResult;
    } else {
      diagnostics.push(getInvalidColorDiagnostic(filterContext, lineContext,
        alphaResult, min, max));
    }
  }

  let color: ColorInformation | undefined;
  if (red && green && blue) {
    const redValue = red.value / 255;
    const greenValue = green.value / 255;
    const blueValue = blue.value / 255;
    const alphaValue = alpha === undefined ? 1 : alpha.value / 255;

    const endIndex = alpha ? alpha.range.end.character : blue.range.end.character;
    const range: Range = {
      start: { line: lineContext.line, character: red.range.start.character },
      end: { line: lineContext.line, character: endIndex }
    };

    color = {
      color: {
        red: redValue,
        blue: blueValue,
        green: greenValue,
        alpha: alphaValue
      },
      range
    }
  }

  if (!lineContext.parser.isIgnored() && diagnostics.length === 0) {
    diagnostics.push(reportTrailingText(filterContext, lineContext));
  }

  return { diagnostics, color };
}
