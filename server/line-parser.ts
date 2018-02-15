/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import { Diagnostic, DiagnosticSeverity, Range } from "vscode-languageserver";
import { ColorInformation } from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { FilterData, ItemData, ConfigurationValues } from "./common";
import { getOrdinal, stylizedArrayJoin } from "./helpers";
import { FilterContext } from "./item-filter";
import { TokenParser, ParseResult } from "./token-parser";

const itemData: ItemData = require("../items.json");
const filterData: FilterData = require("../filter.json");

export class LineParser {
  readonly diagnostics: Diagnostic[];
  color?: ColorInformation;
  keyword: string;
  keywordRange: Range;

  private readonly config: ConfigurationValues;
  private readonly filter: FilterContext;
  private readonly parser: TokenParser;
  private readonly line: number;
  private readonly lineRange: Range;
  private parsed = false;

  constructor(config: ConfigurationValues, filterContext: FilterContext, text: string,
    line: number) {

    this.config = config;
    this.filter = filterContext;
    this.line = line;
    this.parser = new TokenParser(text, line);
    this.lineRange = {
      start: { line, character: this.parser.textStartIndex },
      end: { line, character: this.parser.textEndIndex }
    };
    this.diagnostics = [];

    this.keyword = "";
    this.keywordRange = {
      start: { line: -1, character: -1 },
      end: { line: -1, character: -1 }
    };
  }

  parse() {
    if (this.parsed) return;

    if (this.parser.empty || this.parser.isCommented()) {
      this.parsed = true;
      return;
    }

    const keywordResult = this.parser.nextWord();
    if (!keywordResult) {
      this.parsed = true;
      return this.reportUnparseableKeyword();
    }

    this.keyword = keywordResult.value;
    this.keywordRange = keywordResult.range;
    assert(this.keyword != "");

    switch (this.keyword) {
      case "Show":
      case "Hide":
        this.parseBlock();
        break;
      case "ItemLevel":
      case "DropLevel":
      case "Quality":
      case "Sockets":
      case "LinkedSockets":
      case "Height":
      case "Width":
        this.parseSingleNumberRule();
        break;
      case "SetFontSize":
        this.parseSingleNumberRule(true);
        break;
      case "Rarity":
        this.parseRarityRule();
        break;
      case "SocketGroup":
        this.parseSocketGroupRule();
        break;
      case "Identified":
      case "Corrupted":
      case "ElderItem":
      case "ShaperItem":
      case "ShapedMap":
        this.parseBooleanRule();
        break;
      case "SetBorderColor":
      case "SetTextColor":
      case "SetBackgroundColor":
        this.parseColorRule();
        break;
      case "Class":
        this.parseClassRule();
        break;
      case "BaseType":
        this.parseBaseTypeRule();
        break;
      default:
        // TODO(glen): allow whitelist rules to bypass here.
        // return processUnknownKeyword(filterContext, lineContext);
        return {}
    }

    if (this.keyword !== "Show" && this.keyword !== "Hide") {
      const ruleLimit = filterData.ruleLimits[this.keyword];
      assert(ruleLimit !== undefined);

      const occurrences = this.filter.previousRules.get(this.keyword);
      if (occurrences !== undefined && occurrences >= ruleLimit) {
        this.diagnostics.push({
          message: `${getOrdinal(occurrences + 1)} occurrence of the` +
            ` ${this.keyword} rule within a block with a limit of ${ruleLimit}.`,
          range: this.keywordRange,
          severity: DiagnosticSeverity.Warning,
          source: this.filter.source
        });
      }
    }
  }

  private reportUnparseableKeyword(): void {
    this.diagnostics.push({
      message: "Unreadable keyword, likely due to a stray character.",
      range: this.lineRange,
      severity: DiagnosticSeverity.Error,
      source: this.filter.source
    });
  }

  private resetBlockInformation(): void {
    this.filter.classes = [];
    this.filter.previousRules.clear();
    this.filter.root = undefined;
  }

  private reportTrailingText(severity: DiagnosticSeverity): void {
    const range: Range = {
      start: { line: this.line, character: this.parser.currentIndex },
      end: { line: this.line, character: this.parser.textEndIndex }
    };

    const message = severity === DiagnosticSeverity.Warning ?
      "This trailing text will be ignored by Path of Exile." :
      "This trailing text will be considered an error by Path of Exile.";

    this.diagnostics.push({
      message,
      range,
      severity,
      source: this.filter.source
    });
  }

  private reportNonEqualityOperator(parse: ParseResult<string>): void {
    this.diagnostics.push({
      message: `Invalid operator for the ${this.keyword} rule. Only the equality` +
        " operator is supported by this rule.",
      range: parse.range,
      severity: DiagnosticSeverity.Error,
      source: this.filter.source
    });
  }

  private reportInvalidColor(result: ParseResult<number>, min: number, max: number): void {
    this.diagnostics.push({
      message: `Invalid value for a ${this.keyword} rule.` +
        `Expected 3-4 numbers within the ${min}-${max} range.`,
      range: result.range,
      severity: DiagnosticSeverity.Error,
      source: this.filter.source
    });
  }

  private reportMissingColor(min: number, max: number): void {
    this.diagnostics.push({
      message: `Missing value for a ${this.keyword} rule.` +
        `Expected 3-4 numbers within the ${min}-${max} range.`,
      range: {
        start: { line: this.line, character: this.parser.textStartIndex },
        end: { line: this.line, character: this.parser.originalLength }
      },
      severity: DiagnosticSeverity.Error,
      source: this.filter.source
    });
  }

  private reportDuplicateString(parse: ParseResult<string>): void {
    this.diagnostics.push({
      message: `Duplicate value detected within a ${this.keyword} rule.`,
      range: parse.range,
      severity: DiagnosticSeverity.Warning,
      source: this.filter.source
    });
  }

  private getNumber(): ParseResult<number> | undefined {
    const rangeLimits = filterData.ruleRanges[this.keyword];
    assert(rangeLimits !== undefined);
    const min = rangeLimits.min;
    const max = rangeLimits.max;
    const additionals = rangeLimits.additionals ? rangeLimits.additionals : [];

    const numberResult = this.parser.nextNumber();

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
        this.diagnostics.push({
          message: `Invalid value for a ${this.keyword} rule. ${secondPart}`,
          range: numberResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filter.source
        });
      } else {
        return numberResult;
      }
    } else {
      this.diagnostics.push({
        message: `Missing value for a ${this.keyword} rule. ${secondPart}`,
        range: {
          start: { line: this.line, character: this.parser.textStartIndex },
          end: { line: this.line, character: this.parser.originalLength }
        },
        severity: DiagnosticSeverity.Error,
        source: this.filter.source
      });
    }

    return undefined;
  }

  private parseBlock(): void {
    this.resetBlockInformation();
    this.filter.root = this.keywordRange;

    if (this.parser.empty || this.parser.isCommented()) {
      return;
    }

    this.reportTrailingText(DiagnosticSeverity.Warning);
  }

  private parseBooleanRule(): void {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(operatorResult);
      }
    }

    const booleanResult = this.parser.nextBoolean();
    if (!booleanResult) {
      this.diagnostics.push({
        message: "A boolean value, either True or False, was expected, yet not found.",
        range: {
          start: { line: this.line, character: this.parser.textStartIndex },
          end: { line: this.line, character: this.parser.originalLength }
        },
        severity: DiagnosticSeverity.Error,
        source: this.filter.source
      });
    }
  }

  /**
   * Parses a single number rule from the line.
   * @param equalityOnly True if only the equality operator is valid for this rule.
   * Defaults to false.
   */
  private parseSingleNumberRule(equalityOnly = false): void {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult && equalityOnly) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(operatorResult);
      }
    }

    this.getNumber();

    if (!this.parser.empty && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseRarityRule(): void {
    const raritiesText = stylizedArrayJoin(filterData.rarities);

    this.parser.nextOperator();

    const valueResult = this.parser.nextString();
    if (valueResult) {
      if (!filterData.rarities.includes(valueResult.value)) {
        this.diagnostics.push({
          message: `Invalid value for a ${this.keyword} rule.` +
            ` Valid values are ${raritiesText}.`,
          range: valueResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filter.source
        });
      }
    } else {
      this.diagnostics.push({
        message: `Missing value for a ${this.keyword} rule.` +
          ` Valid values are ${raritiesText}.`,
        range: {
          start: { line: this.line, character: this.parser.textStartIndex },
          end: { line: this.line, character: this.parser.originalLength }
        },
        severity: DiagnosticSeverity.Error,
        source: this.filter.source
      });
    }

    if (!this.parser.empty && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseSocketGroupRule(): void {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(operatorResult);
      }
    }

    const valueResult = this.parser.nextString();
    if (valueResult) {
      const groupRegex = new RegExp("^[rgbw]{1,6}$", "i");
      if (!groupRegex.test(valueResult.value)) {
        this.diagnostics.push({
          message: `Invalid value for a ${this.keyword} rule.` +
            " Expected a word consisting of the R, B, G, and W characters.",
          range: valueResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filter.source
        });
      }
    } else {
      this.diagnostics.push({
        message: `Missing value for a ${this.keyword} rule.` +
          " Expected a word consisting of the R, B, G, and W characters.",
        range: {
          start: { line: this.line, character: this.parser.textStartIndex },
          end: { line: this.line, character: this.parser.originalLength }
        },
        severity: DiagnosticSeverity.Error,
        source: this.filter.source
      });
    }

    if (!this.parser.empty && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseColorRule(): void {
    const rangeLimits = filterData.ruleRanges[this.keyword];
    assert(rangeLimits !== undefined);
    const min = rangeLimits.min;
    const max = rangeLimits.max;

    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(operatorResult);
      }
    }

    let red: ParseResult<number> | undefined;
    const redResult = this.parser.nextNumber();
    if (redResult) {
      if (redResult.value >= min && redResult.value <= max) {
        red = redResult;
      } else {
        this.reportInvalidColor(redResult, min, max);
      }
    } else {
      this.reportMissingColor(min, max);
    }

    let green: ParseResult<number> | undefined;
    const greenResult = this.parser.nextNumber();
    if (greenResult) {
      if (greenResult.value >= min && greenResult.value <= max) {
        green = greenResult;
      } else {
        this.reportInvalidColor(greenResult, min, max);
      }
    } else {
      this.reportMissingColor(min, max);
    }

    let blue: ParseResult<number> | undefined;
    const blueResult = this.parser.nextNumber();
    if (blueResult) {
      if (blueResult.value >= min && blueResult.value <= max) {
        blue = blueResult;
      } else {
        this.reportInvalidColor(blueResult, min, max);
      }
    } else {
      this.reportMissingColor(min, max);
    }

    let alpha: ParseResult<number> | undefined;
    const alphaResult = this.parser.nextNumber();
    if (alphaResult) {
      if (alphaResult.value >= min && alphaResult.value <= max) {
        alpha = alphaResult;
      } else {
        this.reportInvalidColor(alphaResult, min, max);
      }
    }

    if (red && green && blue) {
      const redValue = red.value / 255;
      const greenValue = green.value / 255;
      const blueValue = blue.value / 255;
      const alphaValue = alpha === undefined ? 1 : alpha.value / 255;

      const endIndex = alpha ? alpha.range.end.character : blue.range.end.character;
      const range: Range = {
        start: { line: this.line, character: red.range.start.character },
        end: { line: this.line, character: endIndex }
      };

      this.color = {
        color: {
          red: redValue,
          blue: blueValue,
          green: greenValue,
          alpha: alphaValue
        },
        range
      }
    }

    if (!this.parser.isIgnored() && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseClassRule() {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(operatorResult);
      }
    }

    const parsedClasses: string[] = [];

    while (true) {
      const valueResult = this.parser.nextString();

      if (valueResult) {
        if (parsedClasses.includes(valueResult.value)) {
          this.reportDuplicateString(valueResult);
        }

        let invalid = true;
        for (const c of itemData.classes) {
          if (c.includes(valueResult.value)) invalid = false;
        }

        if (invalid) {
          for (const wlc of this.config.classWhitelist) {
            if (wlc.includes(valueResult.value)) invalid = false;
          }
        }

        if (invalid) {
          this.diagnostics.push({
            message: `Invalid value for a ${this.keyword} rule. Only item classes` +
              " are valid values for this rule.",
            range: valueResult.range,
            severity: DiagnosticSeverity.Error,
            source: this.filter.source
          });
        } else {
          this.filter.classes.push(valueResult.value);
          parsedClasses.push(valueResult.value);
        }
      } else {
        if (parsedClasses.length === 0) {
          this.diagnostics.push({
            message: `Missing value for ${this.keyword} rule. A string value was expected.`,
            range: {
              start: { line: this.line, character: this.parser.textStartIndex },
              end: { line: this.line, character: this.parser.originalLength }
            },
            severity: DiagnosticSeverity.Error,
            source: this.filter.source
          });
        }

        break;
      }
    }
  }

  private parseBaseTypeRule() {
    // This function is the hotpath of the entire language server. Validating
    // values naively requires you to look through potentially 2,000 values
    // in order to find the match. We currently use two techniques to get that
    // number down as low as possible in the majority of cases, though sometimes
    // we really do need to go through the entire list.
    //
    // Strategy #1: If we were preceded by a Class rule, use it to filter.
    // Strategy #2: Presort a list of item bases by length, then jump straight
    //  to the length of the current item base in that list. It's impossible to
    //  match strings that are smaller and most item base values are exact
    //  matches, so this will take you to the set of the most likely values.
    //  The largest one of these sets is ~180 item bases.
    //
    // TODO(glen): investigate whether there is actual value maintaining a cache
    //  reusable between full parses.

    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(operatorResult);
      }
    }

    const parsedBases: string[] = [];
    const usingClasses = this.filter.classes.length > 1 && this.filter.classes.length < 10;
    let basePool: string[] = [];

    if (usingClasses) {
      for (const itemClass of this.filter.classes) {
        // The above item class could still be partial, so pull the item bases
        // for each matching class.
        for (const fullItemClass of itemData.classes) {
          if (fullItemClass.includes(itemClass)) {
            basePool.push.apply(basePool, itemData.classesToBases[fullItemClass]);
          }
        }
      }
    } else {
      basePool = itemData.sortedBases;
    }

    while (true) {
      const valueResult = this.parser.nextString();

      if (valueResult) {
        const value = valueResult.value;
        if (parsedBases.includes(value)) {
          this.reportDuplicateString(valueResult);
        }

        let invalid = true;
        if (usingClasses) {
          for (const itemBase of basePool) {
            if (itemBase.length >= value.length && itemBase.includes(value)) {
              invalid = false;
            }
          }
        } else {
          const startIndex = itemData.sortedBasesIndices[value.length - 1];
          for (let i = startIndex; i < itemData.sortedBases.length; i++) {
            const itemBase = itemData.sortedBases[i];
            if (itemBase.includes(value)) invalid = false;
          }
        }

        if (invalid) {
          for (const wlb of this.config.baseWhitelist) {
            if (wlb.includes(value)) invalid = false;
          }
        }

        if (invalid) {
          this.diagnostics.push({
            message: `Invalid value for a ${this.keyword} rule. Only item classes` +
              " are valid values for this rule.",
            range: valueResult.range,
            severity: DiagnosticSeverity.Error,
            source: this.filter.source
          });
        } else {
          parsedBases.push(value);
        }
      } else {
        if (parsedBases.length === 0) {
          this.diagnostics.push({
            message: `Missing value for ${this.keyword} rule. A string value was expected.`,
            range: {
              start: { line: this.line, character: this.parser.textStartIndex },
              end: { line: this.line, character: this.parser.originalLength }
            },
            severity: DiagnosticSeverity.Error,
            source: this.filter.source
          });
        }

        break;
      }
    }
  }
}
