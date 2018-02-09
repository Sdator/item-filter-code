/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  CompletionResult, CompletionResultType, ConfigurationValues, TextChange
} from "./index";
import { Point } from "./point";

export class Overseer {
  // private readonly config: ConfigurationValues;

  constructor(config: ConfigurationValues) {
    // this.config = config;
  }

  add(uri: string, lines: string[]): void {

  }

  incrementalUpdate(uri: string, changes: TextChange[]): void {

  }

  fullUpdate(): void {}
  updateBaseRules(): void {}
  updateClassRules(): void {}

  async getCompletionSuggestions(uri: string, position: Point): Promise<CompletionResult[]> {
    return Promise.resolve([
      {
        text: "Test",
        type: CompletionResultType.Class
      }
    ]);
  }

  remove(uri: string): void {

  }
}
