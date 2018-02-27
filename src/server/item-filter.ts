/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";
import { Diagnostic, Range, DiagnosticSeverity } from "vscode-languageserver";
import {
  ColorInformation
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { ConfigurationValues, FilterData } from "../types";
import { getOrdinal, splitLines } from "../helpers";
import { LineValidator } from "./line-validator";

const filterData: FilterData = require("../../filter.json");

export interface FilterParseResult {
  colorInformation: ColorInformation[];
  soundInformation: SoundInformation[];
  diagnostics: Diagnostic[];
}

export interface BlockContext {
  config: ConfigurationValues;
  source: "item-filter";
  root?: Range;
  blockFound: boolean;
  classes: string[];
  previousRules: Map<string, number>;
}

export interface SoundInformation {
  knownIdentifier: boolean;
  identifier: string;
  volume: number;
  range: Range;
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

    const context: BlockContext = {
      config,
      source: "item-filter",
      blockFound: false,
      classes: [],
      previousRules: new Map()
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineParser = new LineValidator(config, context, line, i);
      lineParser.parse();

      if (!lineParser.keyword) continue;
      if (lineParser.knownKeyword) {
        this.performBlockDiagnostics(context, lineParser);
      }

      if (lineParser.diagnostics.length > 0) {
        result.diagnostics.push.apply(result.diagnostics, lineParser.diagnostics);
      }

      if (lineParser.color) {
        result.colorInformation.push(lineParser.color);
      }

      if (lineParser.sound) {
        result.soundInformation.push(lineParser.sound);
      }
    }

    return result;
  }

  private performBlockDiagnostics(context: BlockContext, parser: LineValidator) {
    if (parser.keyword !== "Show" && parser.keyword !== "Hide") {
      if (context.blockFound) {
        const ruleLimit = filterData.ruleLimits[parser.keyword];
        assert(ruleLimit !== undefined);

        const occurrences = context.previousRules.get(parser.keyword);
        if (occurrences !== undefined && occurrences >= ruleLimit) {
          parser.diagnostics.push({
            message: `${getOrdinal(occurrences + 1)} occurrence of the` +
              ` ${parser.keyword} rule within a block with a limit of ${ruleLimit}.`,
            range: parser.keywordRange,
            severity: DiagnosticSeverity.Warning,
            source: context.source
          });
        }

        context.previousRules.set(parser.keyword, occurrences === undefined ? 1 : occurrences);
      } else {
        // We have a rule without an enclosing block.
        parser.diagnostics.push({
          message: `Block rule ${parser.keyword} found outside of a Hide or Show block.`,
          range: parser.lineRange,
          severity: DiagnosticSeverity.Error,
          source: context.source
        });
      }
    } else {
      context.blockFound = true;
    }
  }
}
