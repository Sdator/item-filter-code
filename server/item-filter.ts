/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  CompletionItem, CompletionItemKind, Diagnostic, DiagnosticSeverity, Position,
  Range
} from "vscode-languageserver";
import { ColorInformation, Color } from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

const itemData: ItemData = require("../items.json");

import { ConfigurationValues } from "./common";

interface ItemData {
  classesToBases: { [key:string]: string[] };
  basesToClasses: { [key:string]: string };
  sortedBases: string[];
  sortedBasesIndices: number[];
}

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

  getCompletionSuggestions(_: string, __: Position): CompletionItem[] {
    // The most accurate way to actually provide autocompletions for an item filter
    // is to simply parse the entire line in order to figure out the context. We
    // don't have to worry about other lines at all with item filters, which makes
    // this fast and easy. This also means that we don't have to wait for the
    // initial parse, as we parse independently.
    //
    // Filtering suggestions based on block constraints would be intrusive and
    // is better handled through diagnostics.

    return [{
      label: "Test",
      kind: CompletionItemKind.Class
    }];
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
