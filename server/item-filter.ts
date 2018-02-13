/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  Diagnostic
} from "vscode-languageserver";
import {
  ColorInformation
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { ConfigurationValues } from "./common";

export class ItemFilter {
  private readonly parsed: Promise<void>;
  // private readonly colorInformation: Map<number, ColorInformation[]>;

  constructor(_: ConfigurationValues, uri: string, lines: string[]) {
    // TODO(glen): feed colors into this in the 0.0-1.0 format.
    // this.colorInformation = new Map();
    this.parsed = this.fullParse(uri, lines);
  }

  async getDiagnostics(): Promise<Diagnostic[]> {
    await this.parsed;
    const result: Diagnostic[] = [];

    // for (const [_, value] of this.diagnostics) {
    //   result.push.apply(result, value);
    // }

    return result;
  }

  async getColorInformation(): Promise<ColorInformation[]> {
    await this.parsed;
    const result: ColorInformation[] = [];

    // for (const [_, value] of this.colorInformation) {
    //   result.push.apply(result, value);
    // }

    return result;
  }

  private async fullParse(_: string, __: string[]) {
    return;
  }
}
