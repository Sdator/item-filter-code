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
import { LineParser } from "./parsers";

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
      const parser = new LineParser(config, filterContext, blockContext, line, i);
      parser.parse();

      performBlockDiagnostics(filterContext, blockContext, parser);
      if (parser.diagnostics.length > 0) {
        result.diagnostics.push.apply(result.diagnostics, parser.diagnostics);
      }

      if (parser.color) {
        result.colorInformation.push(parser.color);
      }

      if (parser.sound) {
        result.soundInformation.push(parser.sound);
      }
    }

    return result;
  }
}

function performBlockDiagnostics(filterContext: FilterContext, blockContext: BlockContext,
  parser: LineParser) {

  if (parser.keyword == null || !parser.keyword.known) return;

  if (parser.keyword.text === "Show" || parser.keyword.text === "Hide") {
    filterContext.blockFound = true;
    return;
  }

  if (filterContext.blockFound) {
    const ruleLimit = filterData.ruleLimits[parser.keyword.text];
    assert(ruleLimit !== undefined);

    const occurrences = blockContext.previousRules.get(parser.keyword.text);
    if (occurrences !== undefined && occurrences >= ruleLimit) {
      parser.diagnostics.push({
        message: `${getOrdinal(occurrences + 1)} occurrence of the` +
          ` ${parser.keyword.text} rule within a block with a limit of ${ruleLimit}.`,
        range: parser.keyword.range,
        severity: DiagnosticSeverity.Warning,
        source: filterContext.source
      });
    }

    blockContext.previousRules.set(parser.keyword.text,
      occurrences === undefined ? 1 : occurrences);
  } else {
    // We have a rule without an enclosing block.
    parser.diagnostics.push({
      message: `Block rule ${parser.keyword.text} found outside of a Hide or Show block.`,
      range: parser.lineRange,
      severity: DiagnosticSeverity.Error,
      source: filterContext.source
    });
  }
}
