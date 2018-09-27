/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { IDisposable } from "../../common/event-kit";
import { ConfigurationValues } from "../../common/types";
import { intoCodeColorInformation } from "../converters";
import { ConfigurationManager } from "../managers/configuration";
import { ItemFilterManager } from "../managers/item-filters";

interface DocumentContext {
  document: vscode.TextDocument;
  range: vscode.Range;
}

export class FilterColorProvider implements vscode.DocumentColorProvider, IDisposable {
  private _config: ConfigurationValues;
  private readonly _configManager: ConfigurationManager;
  private readonly _filterManager: ItemFilterManager;
  private readonly _subscription: IDisposable;

  constructor(configManager: ConfigurationManager, filterManager: ItemFilterManager) {
    this._config = configManager.values;
    this._configManager = configManager;
    this._filterManager = filterManager;

    this._subscription = this._configManager.onDidChange(newConfig => {
      this._config = newConfig;
    });
  }

  dispose(): void {
    this._subscription.dispose();
  }

  async provideDocumentColors(document: vscode.TextDocument, _token: vscode.CancellationToken):
    Promise<vscode.ColorInformation[]> {

    const filter = this._filterManager.get(document.uri.toString());
    if (!filter) return [];

    const payload = await filter.payload;
    const result: vscode.ColorInformation[] = [];
    for (const colorInfo of payload.colorInformation) {
      result.push(intoCodeColorInformation(colorInfo));
    }

    return result;
  }

  provideColorPresentations(color: vscode.Color, context: DocumentContext,
    _token: vscode.CancellationToken): vscode.ProviderResult<vscode.ColorPresentation[]> {

    const result: vscode.ColorPresentation[] = [];

    const red = Math.trunc(color.red * 255);
    const green = Math.trunc(color.green * 255);
    const blue = Math.trunc(color.blue * 255);
    const alpha = Math.trunc(color.alpha * 255);
    const colorString = `${red} ${green} ${blue} ${alpha}`;

    result.push({
      label: "Color Picker",
      textEdit: {
        newText: colorString,
        newEol: context.document.eol,
        range: context.range
      }
    });

    return result;
  }
}
