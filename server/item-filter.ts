/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  CompletionItem, CompletionItemKind, Diagnostic, DiagnosticSeverity, Position,
  Range
} from "vscode-languageserver";
import { ColorInformation, ColorPresentation, Color } from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";


export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  blockWhitelist: string[];
  ruleWhitelist: string[];
  performanceHints: boolean;
}

interface ItemData {
  classesToBases: { [key:string]: string[] };
  basesToClasses: { [key:string]: string };
  sortedBases: string[];
  sortedBasesIndices: number[];
}

const data: ItemData = require("../items.json");

export class ItemFilter {
  config: ConfigurationValues;
  uri: string;

  constructor(config: ConfigurationValues, uri: string, _: string[]) {
    this.config = config;
    this.uri = uri;

    console.log(data.sortedBases.length);
  }

  async getCompletionSuggestions(_: string, __: Position): Promise<CompletionItem[]> {
    return Promise.resolve([
      {
        label: "Test",
        type: CompletionItemKind.Class
      }
    ]);
  }

  async getDiagnostics(): Promise<Diagnostic[]> {
    const result: Diagnostic[] = [];

    result.push({
      message: "This is a test.",
      range: {
        start: { line: 2, character: 2 },
        end: { line: 2, character: 6 }
      },
      severity: DiagnosticSeverity.Hint
    });

    return result;
  }

  async getColorInformation(): Promise<ColorInformation[]> {
    const result: ColorInformation[] = [{
      color: {
        red: 1,
        green: 1,
        blue: 1,
        alpha: 1
      },
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 4 },
      }
    }];

    return result;
  }

  async computeColorEdit(_: Color, range: Range): Promise<ColorPresentation[]> {
    const result: ColorPresentation[] = [{
      label: "Test Edit",
      textEdit: {
        newText: "Hide",
        range
      }
    }];

    return result;
  }
}
