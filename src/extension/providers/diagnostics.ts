/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { CompositeDisposable, IDisposable } from "../../common/event-kit";
import { diagnostic2CodeDiagnostic } from "../converters";
import * as ifm from "../managers/item-filters";

export class FilterDiagnosticsProvider implements IDisposable {
  private readonly _diagnostics: vscode.DiagnosticCollection;
  private readonly _filterManager: ifm.ItemFilterManager;
  private readonly _subscriptions: CompositeDisposable;

  constructor(filterManager: ifm.ItemFilterManager) {
    this._diagnostics = vscode.languages.createDiagnosticCollection("item-filter");
    this._filterManager = filterManager;

    this._subscriptions = new CompositeDisposable(
      this._filterManager.observeFilters(this._add, this),
      this._filterManager.onDidCloseFilter(this._remove, this),
      this._filterManager.onDidChangeFilter(this._update, this)
    );
  }

  dispose(): void {
    this._subscriptions.dispose();
    this._diagnostics.dispose();
  }

  private async _add(event: ifm.FilterOpenedEvent, update = false): Promise<void> {
    const result = await event.filter.payload;

    const diagnostics: vscode.Diagnostic[] = [];
    for (const filterDiagnostic of result.diagnostics) {
      diagnostics.push(diagnostic2CodeDiagnostic(filterDiagnostic));
    }

    // This filter may have been removed as we were processing the changes.
    if (update && this._filterManager.get(event.uri) == null) {
      return;
    }

    this._diagnostics.set(vscode.Uri.parse(event.uri), diagnostics);
  }

  private _remove(event: ifm.FilterClosedEvent): void {
    this._diagnostics.set(vscode.Uri.parse(event.uri), undefined);
  }

  private async _update(event: ifm.FilterChangedEvent): Promise<void> {
    return this._add(event, true);
  }
}
