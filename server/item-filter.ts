/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  Diagnostic, DiagnosticSeverity, Position, Range, TextDocument
} from "vscode-languageserver";
import { ColorInformation, Color } from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { ConfigurationValues, ItemData } from "./common";

const itemData: ItemData = require("../items.json");

export class ItemFilter {
  private readonly config: ConfigurationValues;
  private readonly parsed: Promise<void>;
  private readonly diagnostics: Map<number, Diagnostic[]>;
  private readonly colorInformation: Map<number, ColorInformation[]>;

  constructor(config: ConfigurationValues, uri: string, lines: string[]) {
    this.config = config;
    this.diagnostics = new Map();
    // TODO(glen): feed colors into this in the 0.0-1.0 format.
    this.colorInformation = new Map();
    this.parsed = this.fullParse(uri, lines);
  }

  async getDiagnostics(): Promise<Diagnostic[]> {
    await this.parsed;

    const result: Diagnostic[] = [];
    for (const [_, value] of this.diagnostics) {
      result.push.apply(result, value);
    }

    return result;
  }

  async getColorInformation(): Promise<ColorInformation[]> {
    await this.parsed;

    // const result: ColorInformation[] = [];
    // for (const [_, value] of this.colorInformation) {
    //   result.push.apply(result, value);
    // }

    // return result;

    return [{
      color: { red: 0.75, green: 0, blue: 0, alpha: 1 },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 4 }
      }
    }];
  }

  private async fullParse(uri: string, lines: string[]) {
    return;
  }

  private async partialParse(uri: string, changes: any) {
    return;
  }
}
