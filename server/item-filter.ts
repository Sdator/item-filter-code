/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  Diagnostic, Range
} from "vscode-languageserver";
import {
  ColorInformation
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { ConfigurationValues } from "./common";
import { LineParser } from "./line-parser";

export interface FilterParseResult {
  colorInformation: ColorInformation[];
  diagnostics: Diagnostic[];
}

export interface FilterContext {
  config: ConfigurationValues,
  source: "item-filter",
  root?: Range;
  classes: string[];
  previousRules: Map<string, number>;
}

export class ItemFilter {
  private readonly parsed: Promise<FilterParseResult>;

  constructor(config: ConfigurationValues, text: string) {
    this.parsed = this.fullParse(config, text);
  }

  async getDiagnostics(): Promise<Diagnostic[]> {
    const { diagnostics } = await this.parsed;
    return diagnostics;
  }

  async getColorInformation(): Promise<ColorInformation[]> {
    const { colorInformation } = await this.parsed;
    return colorInformation;
  }

  private async fullParse(config: ConfigurationValues, text: string):
    Promise<FilterParseResult> {

    const lines = text.split(/\r?\n/g);
    const result: FilterParseResult = { colorInformation: [], diagnostics: [] };

    let context: FilterContext = {
      config,
      source: "item-filter",
      classes: [],
      previousRules: new Map(),
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineParser = new LineParser(context, line, i);
      lineParser.parse();

      if (lineParser.diagnostics.length > 0) {
        result.diagnostics.push.apply(result.diagnostics, lineParser.diagnostics);
      }

      if (lineParser.color) {
        result.colorInformation.push(lineParser.color);
      }
    }

    return result;
  }
}
