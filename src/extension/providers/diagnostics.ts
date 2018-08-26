/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Document this file.

import * as vscode from "vscode";

import { IDisposable } from "../../common/event-kit";
import { intoCodeDiagnostic } from "../converters";
import * as ifm from "../managers/item-filters";

export class FilterDiagnosticsProvider implements IDisposable {
  private readonly diagnostics: vscode.DiagnosticCollection;
  private readonly filterManager: ifm.ItemFilterManager;
  private readonly subscriptions: IDisposable[];

  constructor(filterManager: ifm.ItemFilterManager) {
    this.diagnostics = vscode.languages.createDiagnosticCollection("item-filter");
    this.filterManager = filterManager;

    this.subscriptions = [
      this.filterManager.observeFilters(this.add, this),
      this.filterManager.onDidCloseFilter(this.remove, this),
      this.filterManager.onDidChangeFilter(this.update, this)
    ];
  }

  dispose(): void {
    while (this.subscriptions.length) {
      const s = this.subscriptions.pop();
      if (s) s.dispose();
    }

    this.diagnostics.dispose();
  }

  private async add(event: ifm.FilterOpenedEvent): Promise<void> {
    const result = await event.filter.payload;

    const diagnostics: vscode.Diagnostic[] = [];
    for (const filterDiagnostic of result.diagnostics) {
      diagnostics.push(intoCodeDiagnostic(filterDiagnostic));
    }

    this.diagnostics.set(vscode.Uri.parse(event.uri), diagnostics);
  }

  private remove(event: ifm.FilterClosedEvent): void {
    this.diagnostics.set(vscode.Uri.parse(event.uri), undefined);
  }

  private async update(event: ifm.FilterChangedEvent): Promise<void> {
    return this.add(event);
  }
}
