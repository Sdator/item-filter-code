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
import { TokenParser, TokenParseResult } from "./token-parser";

const itemData = <ItemData>require(path.join(dataRoot, "items.json"));
const filterData = <FilterData>require(path.join(dataRoot, "filter.json"));

interface KeywordParse {
  /** The keyword of the parsed line. */
  text: string;

  /** The range of the keyword parsed from the line. */
  range: Range;

  /** Whether the keyword was a known one. */
  known: boolean;
}

export class LineParser {
  /** The diagnostic messages reported by the parser. */
  readonly diagnostics: Diagnostic[];

  /** Color information parsed from the line. */
  color?: ColorInformation;

  /** Information detailing the keyword, if one was successfully parsed. */
  keyword?: KeywordParse;

  /** The line number of the parsed line. */
  line: number;

  /** The line range of the parsed line. */
  lineRange: Range;

  /** Sound information parsed from the line. */
  sound?: SoundInformation;

  /** The configuration variables for the extension. */
  private readonly config: ConfigurationValues;

  /** Data associated with only the current block within the item filter. */
  private readonly blockContext: BlockContext;

  /** Data associated with the entirety of the item filter. */
  private readonly filterContext: FilterContext;

  /** The token parser being used to parse the current line. */
  private readonly parser: TokenParser;

  /** Whether this text has already been parsed. */
  private parsed: boolean;

  constructor(config: ConfigurationValues, filterContext: FilterContext,
    blockContext: BlockContext, text: string, line: number) {

    this.diagnostics = [];
    this.line = line;
    this.config = config;
    this.filterContext = filterContext;
    this.blockContext = blockContext;
    this.parser = new TokenParser(text, line);
    this.parsed = false;
    this.lineRange = this.parser.getTextRange();
  }

  parse(): void {
    if (this.parsed) return;
    this.parsed = true;

    if (this.parser.isEmpty() || this.parser.isCommented()) return;

    const keywordResult = this.parser.nextWord();
    if (keywordResult == null) {
      this.diagnostics.push({
        message: "Unreadable keyword, likely due to a stray character.",
        range: this.parser.getTextRange(),
        severity: DiagnosticSeverity.Error,
        source: this.filterContext.source
      });

      return;
    }

    this.keyword = {
      text: keywordResult.value,
      range: keywordResult.range,
      known: true
    };

    switch (this.keyword.text) {
      case "Show":
      case "Hide":
        this.parseBlock(this.keyword);
        break;
      case "ItemLevel":
      case "DropLevel":
      case "Quality":
      case "Sockets":
      case "LinkedSockets":
      case "Height":
      case "Width":
        this.parseSingleNumberRule(this.keyword);
        break;
      case "SetFontSize":
        this.parseSingleNumberRule(this.keyword, true);
        break;
      case "Rarity":
        this.parseRarityRule(this.keyword);
        break;
      case "SocketGroup":
        this.parseSocketGroupRule(this.keyword);
        break;
      case "Identified":
      case "Corrupted":
      case "ElderItem":
      case "ShaperItem":
      case "ShapedMap":
      case "ElderMap":
      case "DisableDropSound":
        this.parseBooleanRule(this.keyword);
        break;
      case "SetBorderColor":
      case "SetTextColor":
      case "SetBackgroundColor":
        this.parseColorRule(this.keyword);
        break;
      case "Class":
        this.parseClassRule(this.keyword);
        break;
      case "BaseType":
        this.parseBaseTypeRule(this.keyword);
        break;
      case "PlayAlertSound":
      case "PlayAlertSoundPositional":
        this.parseSoundRule(this.keyword);
        break;
      default:
        let whitelistedKeyword = false;
        for (const wlr of this.config.ruleWhitelist) {
          if (this.keyword.text === wlr) whitelistedKeyword = true;
        }

        this.keyword.known = false;
        if (!whitelistedKeyword) this.reportUnknownKeyword(this.keyword);
    }
  }

  private parseBlock(keyword: KeywordParse): void {
    this.resetBlockInformation();
    this.blockContext.root = keyword.range;

    if (this.parser.isEmpty() || this.parser.isCommented()) {
      return;
    }

    this.reportTrailingText(DiagnosticSeverity.Warning);
  }

  private parseBooleanRule(keyword: KeywordParse): void {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(keyword, operatorResult);
      }
    }

    const booleanResult = this.parser.nextBoolean();
    if (!booleanResult) {
      this.diagnostics.push({
        message: "A boolean value, either True or False, was expected, yet not found.",
        range: this.parser.getTextStartToEndRange(),
        severity: DiagnosticSeverity.Error,
        source: this.filterContext.source
      });
    }

    if (!this.parser.isEmpty() && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  /**
   * Parses a single number rule from the line.
   * @param equalityOnly True if only the equality operator is valid for this rule.
   * Defaults to false.
   */
  private parseSingleNumberRule(keyword: KeywordParse, equalityOnly = false): void {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult && equalityOnly) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(keyword, operatorResult);
      }
    }

    this.expectNumber(keyword);

    if (!this.parser.isEmpty() && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseRarityRule(keyword: KeywordParse): void {
    const raritiesText = stylizedArrayJoin(filterData.rarities);

    this.parser.nextOperator();

    const valueResult = this.parser.nextString();
    if (valueResult) {
      if (!filterData.rarities.includes(valueResult.value)) {
        this.diagnostics.push({
          message: `Invalid value for a ${keyword.text} rule.` +
            ` Valid values are ${raritiesText}.`,
          range: valueResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filterContext.source
        });
      }
    } else {
      this.diagnostics.push({
        message: `Missing value for a ${keyword.text} rule.` +
          ` Valid values are ${raritiesText}.`,
        range: this.parser.getTextStartToEndRange(),
        severity: DiagnosticSeverity.Error,
        source: this.filterContext.source
      });
    }

    if (!this.parser.isEmpty() && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseSocketGroupRule(keyword: KeywordParse): void {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(keyword, operatorResult);
      }
    }

    const valueResult = this.parser.nextString();
    if (valueResult) {
      const groupRegex = new RegExp("^[rgbw]{1,6}$", "i");
      if (!groupRegex.test(valueResult.value)) {
        this.diagnostics.push({
          message: `Invalid value for a ${keyword.text} rule.` +
            " Expected a word consisting of the R, B, G, and W characters.",
          range: valueResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filterContext.source
        });
      }
    } else {
      this.diagnostics.push({
        message: `Missing value for a ${keyword.text} rule.` +
          " Expected a word consisting of the R, B, G, and W characters.",
        range: this.parser.getTextStartToEndRange(),
        severity: DiagnosticSeverity.Error,
        source: this.filterContext.source
      });
    }

    if (!this.parser.isEmpty() && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseColorRule(keyword: KeywordParse): void {
    const rangeLimits = filterData.ruleRanges[keyword.text];
    assert(rangeLimits !== undefined);
    const min = rangeLimits.min;
    const max = rangeLimits.max;

    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(keyword, operatorResult);
      }
    }

    let red: TokenParseResult<number> | undefined;
    const redResult = this.parser.nextNumber();
    if (redResult) {
      if (redResult.value >= min && redResult.value <= max) {
        red = redResult;
      } else {
        this.reportInvalidColor(keyword, redResult, min, max);
      }
    } else {
      this.reportMissingColor(keyword, min, max);
    }

    let green: TokenParseResult<number> | undefined;
    const greenResult = this.parser.nextNumber();
    if (greenResult) {
      if (greenResult.value >= min && greenResult.value <= max) {
        green = greenResult;
      } else {
        this.reportInvalidColor(keyword, greenResult, min, max);
      }
    } else {
      this.reportMissingColor(keyword, min, max);
    }

    let blue: TokenParseResult<number> | undefined;
    const blueResult = this.parser.nextNumber();
    if (blueResult) {
      if (blueResult.value >= min && blueResult.value <= max) {
        blue = blueResult;
      } else {
        this.reportInvalidColor(keyword, blueResult, min, max);
      }
    } else {
      this.reportMissingColor(keyword, min, max);
    }

    let alpha: TokenParseResult<number> | undefined;
    const alphaResult = this.parser.nextNumber();
    if (alphaResult) {
      if (alphaResult.value >= min && alphaResult.value <= max) {
        alpha = alphaResult;
      } else {
        this.reportInvalidColor(keyword, alphaResult, min, max);
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
      };
    }

    if (!this.parser.isIgnored() && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }
  }

  private parseClassRule(keyword: KeywordParse) {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(keyword, operatorResult);
      }
    }

    const parsedClasses: string[] = [];

    while (true) {
      const valueResult = this.parser.nextString();

      if (valueResult) {
        if (parsedClasses.includes(valueResult.value)) {
          this.reportDuplicateString(keyword, valueResult);
        }

        let invalid = true;
        for (const c of itemData.classes) {
          if (c.includes(valueResult.value)) {
            invalid = false;
            break;
          }
        }

        if (invalid) {
          for (const wlc of this.config.classWhitelist) {
            if (wlc.includes(valueResult.value)) {
              invalid = false;
              break;
            }
          }
        }

        if (invalid) {
          this.diagnostics.push({
            message: `Invalid value for a ${keyword.text} rule. Only item classes` +
              " are valid values for this rule.",
            range: valueResult.range,
            severity: DiagnosticSeverity.Error,
            source: this.filterContext.source
          });
        } else {
          this.blockContext.classes.push(valueResult.value);
          parsedClasses.push(valueResult.value);
        }
      } else {
        if (parsedClasses.length === 0) {
          this.diagnostics.push({
            message: `Missing value for ${keyword.text} rule. A string value was expected.`,
            range: this.parser.getTextStartToEndRange(),
            severity: DiagnosticSeverity.Error,
            source: this.filterContext.source
          });
        }

        break;
      }
    }
  }

  private parseBaseTypeRule(keyword: KeywordParse) {
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

    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(keyword, operatorResult);
      }
    }

    const parsedBases: string[] = [];
    let basePool: string[] = [];
    let classText: string | undefined;

    // If we assume ~30 items per class, then around 5 is when the class strategy
    // starts to actually perform worse. We could cutoff there, but we want to
    // have consistency with the diagnostics.
    const usingClasses = this.blockContext.classes.length > 0;

    if (usingClasses) {
      const classList: string[] = [];
      for (const itemClass of this.blockContext.classes) {
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
      const valueResult = this.parser.nextString();

      if (valueResult) {
        const value = valueResult.value;
        if (parsedBases.includes(value)) {
          this.reportDuplicateString(keyword, valueResult);
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
          for (const wlb of this.config.baseWhitelist) {
            if (wlb.includes(value)) {
              invalid = false;
              break;
            }
          }
        }

        if (invalid) {
          if (classText) {
            this.diagnostics.push({
              message: `Invalid value for a ${keyword.text} rule. No value found` +
                ` for the following classes: ${classText}.`,
              range: valueResult.range,
              severity: DiagnosticSeverity.Error,
              source: this.filterContext.source
            });
          } else {
            this.diagnostics.push({
              message: `Invalid value for a ${keyword.text} rule. Only item bases` +
                " are valid values for this rule.",
              range: valueResult.range,
              severity: DiagnosticSeverity.Error,
              source: this.filterContext.source
            });
          }
        } else {
          parsedBases.push(value);
        }
      } else {
        if (parsedBases.length === 0 && this.diagnostics.length === 0) {
          this.diagnostics.push({
            message: `Missing value for ${keyword.text} rule. A string value was expected.`,
            range: this.parser.getTextStartToEndRange(),
            severity: DiagnosticSeverity.Error,
            source: this.filterContext.source
          });
        }

        break;
      }
    }
  }

  private parseSoundRule(keyword: KeywordParse) {
    const operatorResult = this.parser.nextOperator();
    if (operatorResult) {
      if (operatorResult.value !== "=") {
        this.reportNonEqualityOperator(keyword, operatorResult);
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
    const wordResult = this.parser.nextWord();
    if (wordResult) {
      for (const id in filterData.sounds.stringIdentifiers) {
        if (id === wordResult.value) {
          identifier = wordResult.value;
          range = wordResult.range;
          knownIdentifier = true;
          invalidIdentifier = false;
        }
      }

      for (const id of this.config.soundWhitelist) {
        if (id === wordResult.value) {
          identifier = wordResult.value;
          range = wordResult.range;
          invalidIdentifier = false;
        }
      }

      if (invalidIdentifier) {
        this.diagnostics.push({
          message: `Invalid value for a ${keyword.text} rule. ${secondPart}`,
          range: wordResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filterContext.source
        });
      }
    } else {
      const numberResult = this.parser.nextNumber();
      if (numberResult) {
        if (numberResult.value >= min && numberResult.value <= max) {
          identifier = `${numberResult.value}`;
          range = numberResult.range;
          knownIdentifier = true;
          invalidIdentifier = false;
        } else {
          this.diagnostics.push({
            message: `Invalid value for a ${keyword.text} rule. ${secondPart}`,
            range: numberResult.range,
            severity: DiagnosticSeverity.Error,
            source: this.filterContext.source
          });
        }
      } else {
        this.diagnostics.push({
          message: `Missing value for a ${keyword.text} rule. ${secondPart}`,
          range: this.parser.getTextStartToEndRange(),
          severity: DiagnosticSeverity.Error,
          source: this.filterContext.source
        });

        return;
      }
    }

    const volumeResult = this.parser.nextNumber();
    if (volumeResult) {
      if (volumeResult.value < 0 || volumeResult.value > 300) {
        this.diagnostics.push({
          message: `Invalid value for a ${keyword.text} rule.` +
            "A volume is expected to be a value between 0 and 300.",
          range: volumeResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filterContext.source
        });
      } else {
        volume = volumeResult.value;
      }
    }

    if (!this.parser.isIgnored() && this.diagnostics.length === 0) {
      this.reportTrailingText(DiagnosticSeverity.Error);
    }

    if (identifier && range) {
      const v: number = volume === undefined ? 100 : volume;
      this.sound = { knownIdentifier, identifier, volume: v, range };
    }
  }

  private resetBlockInformation(): void {
    this.blockContext.classes = [];
    this.blockContext.previousRules.clear();
    this.blockContext.root = undefined;
  }

  private reportTrailingText(severity: DiagnosticSeverity): void {
    const range = this.parser.getRemainingTextRange();

    const message = severity === DiagnosticSeverity.Warning ?
      "This trailing text will be ignored by Path of Exile." :
      "This trailing text will be considered an error by Path of Exile.";

    this.diagnostics.push({
      message,
      range,
      severity,
      source: this.filterContext.source
    });
  }

  private reportNonEqualityOperator(keyword: KeywordParse, parse: TokenParseResult<string>): void {
    this.diagnostics.push({
      message: `Invalid operator for the ${keyword.text} rule. Only the equality` +
        " operator is supported by this rule.",
      range: parse.range,
      severity: DiagnosticSeverity.Error,
      source: this.filterContext.source
    });
  }

  private reportUnknownKeyword(keyword: KeywordParse): void {
    this.diagnostics.push({
      message: "Unknown filter keyword.",
      range: keyword.range,
      severity: DiagnosticSeverity.Error,
      source: this.filterContext.source
    });
  }

  private reportInvalidColor(keyword: KeywordParse, result: TokenParseResult<number>,
    min: number, max: number): void {

    this.diagnostics.push({
      message: `Invalid value for a ${keyword.text} rule.` +
        `Expected 3-4 numbers within the ${min}-${max} range.`,
      range: result.range,
      severity: DiagnosticSeverity.Error,
      source: this.filterContext.source
    });
  }

  private reportMissingColor(keyword: KeywordParse, min: number, max: number): void {
    this.diagnostics.push({
      message: `Missing value for a ${keyword.text} rule.` +
        `Expected 3-4 numbers within the ${min}-${max} range.`,
      range: this.parser.getTextStartToEndRange(),
      severity: DiagnosticSeverity.Error,
      source: this.filterContext.source
    });
  }

  private reportDuplicateString(keyword: KeywordParse, parse: TokenParseResult<string>): void {
    this.diagnostics.push({
      message: `Duplicate value detected within a ${keyword.text} rule.`,
      range: parse.range,
      severity: DiagnosticSeverity.Warning,
      source: this.filterContext.source
    });
  }

  private expectNumber(keyword: KeywordParse): TokenParseResult<number> | undefined {
    const rangeLimits = filterData.ruleRanges[keyword.text];
    assert(rangeLimits !== undefined);
    const min = rangeLimits.min;
    const max = rangeLimits.max;
    const additionals = rangeLimits.additionals ? rangeLimits.additionals : [];

    const numberResult = this.parser.nextNumber();

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
        this.diagnostics.push({
          message: `Invalid value for a ${keyword.text} rule. ${secondPart}`,
          range: numberResult.range,
          severity: DiagnosticSeverity.Error,
          source: this.filterContext.source
        });
      } else {
        return numberResult;
      }
    } else {
      this.diagnostics.push({
        message: `Missing value for a ${keyword.text} rule. ${secondPart}`,
        range: this.parser.getTextStartToEndRange(),
        severity: DiagnosticSeverity.Error,
        source: this.filterContext.source
      });
    }

    return undefined;
  }
}
