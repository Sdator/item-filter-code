/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import * as path from "path";
import { ColorInformation, Diagnostic, Range, DiagnosticSeverity } from "vscode-languageserver";

import { dataRoot } from "../common";
import { ConfigurationValues, FilterData, SoundInformation } from "../types";
import { getOrdinal, splitLines } from "./helpers";
import { parseLine, isKeywordedParseLineResult, KeywordedParseLineResult } from "./parsers";

const filterData = <FilterData> require(path.join(dataRoot, "filter.json"));

export interface FilterParseResult {
  colorInformation: ColorInformation[];
  soundInformation: SoundInformation[];
  diagnostics: Diagnostic[];
}

export interface FilterContext {
  config: ConfigurationValues;
  source: "item-filter";
  blockFound: boolean;
}

export interface BlockContext {
  root?: Range;
  classes: string[];
  previousRules: Map<string, number>;
}

export class ItemFilter {
  readonly payload: Promise<FilterParseResult>;

  constructor(config: ConfigurationValues, text: string) {
    this.payload = this.fullUpdate(config, text);
  }

  private async fullUpdate(config: ConfigurationValues, text: string):
    Promise<FilterParseResult> {

    const lines = splitLines(text);
    const result: FilterParseResult = {
      colorInformation: [],
      soundInformation: [],
      diagnostics: []
    };

    const filterContext: FilterContext = {
      config,
      source: "item-filter",
      blockFound: false,
    };

    const blockContext: BlockContext = {
      classes: [],
      previousRules: new Map()
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parseResult = parseLine(config, filterContext, blockContext, line, i);

      if (isKeywordedParseLineResult(parseResult)) {
        if (parseResult.knownKeyword) {
          this.performBlockDiagnostics(filterContext, blockContext, parseResult);
        }

        if (parseResult.diagnostics.length > 0) {
          result.diagnostics.push.apply(result.diagnostics, parseResult.diagnostics);
        }

        if (parseResult.color) {
          result.colorInformation.push(parseResult.color);
        }

        if (parseResult.sound) {
          result.soundInformation.push(parseResult.sound);
        }
      } else {
        continue;
      }
    }

    return result;
  }

  private performBlockDiagnostics(filterContext: FilterContext,
    blockContext: BlockContext, parse: KeywordedParseLineResult) {

    if (parse.keyword !== "Show" && parse.keyword !== "Hide") {
      if (filterContext.blockFound) {
        const ruleLimit = filterData.ruleLimits[parse.keyword];
        assert(ruleLimit !== undefined);

        const occurrences = blockContext.previousRules.get(parse.keyword);
        if (occurrences !== undefined && occurrences >= ruleLimit) {
          parse.diagnostics.push({
            message: `${getOrdinal(occurrences + 1)} occurrence of the` +
              ` ${parse.keyword} rule within a block with a limit of ${ruleLimit}.`,
            range: parse.keywordRange,
            severity: DiagnosticSeverity.Warning,
            source: filterContext.source
          });
        }

        blockContext.previousRules.set(parse.keyword, occurrences === undefined ? 1 : occurrences);
      } else {
        // We have a rule without an enclosing block.
        parse.diagnostics.push({
          message: `Block rule ${parse.keyword} found outside of a Hide or Show block.`,
          range: parse.lineRange,
          severity: DiagnosticSeverity.Error,
          source: filterContext.source
        });
      }
    } else {
      filterContext.blockFound = true;
    }
  }
}
