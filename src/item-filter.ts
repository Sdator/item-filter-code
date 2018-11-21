/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import * as path from "path";

import * as types from "./types";
import { dataOutputRoot, getOrdinal, splitLines } from "./helpers";
import { isKeywordParseLineResult, KeywordParseLineResult, LineParser } from "./parsers/lines";

const filterData = <types.FilterData>require(path.join(dataOutputRoot, "filter.json"));

export interface FilterParseResult {
  colorInformation: types.ColorInformation[];
  soundInformation: types.NewSoundInformation[];
  diagnostics: types.Diagnostic[];
}

export interface FilterContext {
  config: types.ConfigurationValues;
  blockFound: boolean;
}

export interface BlockContext {
  root?: types.Range;
  classes: string[];
  previousRules: Map<string, number>;
}

export class ItemFilter {
  readonly payload: Promise<FilterParseResult>;

  constructor(config: types.ConfigurationValues, text: string) {
    this.payload = this._fullUpdate(config, text);
  }

  private async _fullUpdate(config: types.ConfigurationValues, text: string):
    Promise<FilterParseResult> {

    const lines = splitLines(text);
    const result: FilterParseResult = {
      colorInformation: [],
      soundInformation: [],
      diagnostics: []
    };

    const filterContext: FilterContext = {
      config,
      blockFound: false,
    };

    const blockContext: BlockContext = {
      classes: [],
      previousRules: new Map()
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parser = new LineParser(config, filterContext, blockContext);
      const parse = parser.parse(line, i);

      if (isKeywordParseLineResult(parse)) {
        if (parse.knownKeyword) {
          performBlockDiagnostics(filterContext, blockContext, parse);
        }

        if (parse.diagnostics.length > 0) {
          result.diagnostics.push.apply(result.diagnostics, parse.diagnostics);
        }

        if (parse.color) {
          result.colorInformation.push(parse.color);
        }

        if (parse.sound) {
          result.soundInformation.push(parse.sound);
        }
      } else {
        continue;
      }
    }

    return result;
  }
}

function performBlockDiagnostics(filterContext: FilterContext, blockContext: BlockContext,
  parse: KeywordParseLineResult) {

  if (parse.keyword === "Show" || parse.keyword === "Hide") {
    filterContext.blockFound = true;
    return;
  }

  if (filterContext.blockFound) {
    const ruleLimit = filterData.ruleLimits[parse.keyword];
    assert(ruleLimit !== undefined);

    let occurrences = blockContext.previousRules.get(parse.keyword);
    if (occurrences === undefined) {
      occurrences = 0;
    }

    if (ruleLimit >= 1 && occurrences >= ruleLimit) {
      parse.diagnostics.push({
        message: `${getOrdinal(occurrences + 1)} occurrence of the` +
          ` ${parse.keyword} rule within a block with a limit of ${ruleLimit}.`,
        range: parse.keywordRange,
        severity: types.DiagnosticSeverity.Warning,
      });
    }

    occurrences++;
    blockContext.previousRules.set(parse.keyword, occurrences);
  } else {
    // We have a rule without an enclosing block.
    parse.diagnostics.push({
      message: `Block rule ${parse.keyword} found outside of a Hide or Show block.`,
      range: parse.lineRange,
      severity: types.DiagnosticSeverity.Error,
    });
  }
}
