/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  CompletionItem, CompletionItemKind, Diagnostic, Position
} from "vscode-languageserver";

export interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
  performanceHints: boolean;
  performanceOptimization: boolean;
}

export class ItemFilter {
  config: ConfigurationValues;
  uri: string;

  constructor(config: ConfigurationValues, uri: string, _: string[]) {

    this.config = config;
    this.uri = uri;
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
    return Promise.resolve([]);
  }
}
