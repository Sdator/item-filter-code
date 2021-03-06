/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { CompositeDisposable, Emitter, Event, IDisposable } from "../kits/events";
import { ItemFilter } from "../item-filter";
import { ConfigurationValues } from "../types";
import { ConfigurationManager } from "./configuration";
import { DocumentRegistry } from "../registries/documents";

export interface FilterOpenedEvent {
  uri: string;
  filter: ItemFilter;
}

export interface FilterClosedEvent {
  uri: string;
}

export interface FilterChangedEvent {
  uri: string;
  filter: ItemFilter;
}

/** Type information for the ItemFilterManager's Emitter. */
interface Emissions {
  /** Emitted whenever an item filter has been opened. */
  "opened": FilterOpenedEvent;

  /** Emitted whenever an item filter has been closed. */
  "closed": FilterClosedEvent;

  /** Emitted whenever an item filter has changed. */
  "changed": FilterChangedEvent;
}

/**
 * Creates and manages item filters opened within the Visual Studio Code
 * workspace.
 */
export class ItemFilterManager implements IDisposable {
  private readonly _activeFilters: Map<string, ItemFilter>;
  private readonly _configManager: ConfigurationManager;
  private readonly _documentRegistry: DocumentRegistry;
  private readonly _emitter: Emitter<Emissions>;
  private readonly _subscriptions: CompositeDisposable;

  constructor(configManager: ConfigurationManager, documentRegistry: DocumentRegistry) {
    this._configManager = configManager;
    this._documentRegistry = documentRegistry;
    this._activeFilters = new Map();
    this._emitter = new Emitter();

    this._subscriptions = new CompositeDisposable([
      this._documentRegistry.observeFilters(this._openDocument, false, this),
      this._documentRegistry.onDidCloseFilter(this._closeDocument, false, this),
      this._documentRegistry.onDidChangeFilter(this._updateDocument, false, this),
      this._configManager.onDidChange(this._updateConfig, false, this)
    ]);
  }

  /** Disposes of this registry and all of its subscriptions. */
  dispose(): void {
    this._subscriptions.dispose();
    this._emitter.dispose();
    this._activeFilters.clear();
  }

  /** Returns the item filter for the given URI, if one exists. */
  get(uri: string): ItemFilter | undefined {
    return this._activeFilters.get(uri);
  }

  /**
   * Invoke the given callback whenever an item filter is opened within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidOpenFilter: Event<Emissions["opened"]> = (e, preempt, thisArg) => {
    return this._emitter.on("opened", e, preempt, thisArg);
  }

  /**
   * Invoke the given callback whenever an item filter is closed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidCloseFilter: Event<Emissions["closed"]> = (e, preempt, thisArg) => {
    return this._emitter.on("closed", e, preempt, thisArg);
  }

  /**
   * Invoke the given callback with all current and future item filters opened
   * within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observeFilters: Event<Emissions["opened"]> = (e, preempt, thisArg) => {
    const collection: Set<FilterOpenedEvent> = new Set();

    for (const [uri, filter] of this._activeFilters) {
      collection.add({ uri, filter });
    }

    return this._emitter.observe("opened", collection, e, preempt, thisArg);
  }

  /**
   * Invoke the given callback whenever an item filter has changed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidChangeFilter: Event<Emissions["changed"]> = (e, preempt, thisArg) => {
    return this._emitter.on("changed", e, preempt, thisArg);
  }

  /** Opens an item filter with the contents of the given document. */
  private _openDocument(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    const filter = new ItemFilter(this._configManager.values, document.getText());
    this._activeFilters.set(uri, filter);
    this._emitter.emit("opened", { uri, filter });
  }

  /** Closes the item filter associated with the given text document. */
  private _closeDocument(document: vscode.TextDocument): void {
    this._closeUri(document.uri.toString());
  }

  /** Closes the item filter associated with the given identifier.  */
  private _closeUri(uri: string): void {
    this._activeFilters.delete(uri);
    this._emitter.emit("closed", { uri });
  }

  /** Updates the item filter associated with the given event. */
  private _updateDocument(event: vscode.TextDocumentChangeEvent): void {
    if (event.contentChanges.length === 0) {
      return;
    }

    const uri = event.document.uri.toString();
    const filter = new ItemFilter(this._configManager.values, event.document.getText());
    this._activeFilters.set(uri, filter);
    this._emitter.emit("changed", { uri, filter });
  }

  /** Performs any work necessary whenever a configuration value has changed. */
  private _updateConfig(config: ConfigurationValues): void {
    for (const [uri] of this._activeFilters) {
      const document = this._documentRegistry.getFilter(uri);
      if (document) {
        const filter = new ItemFilter(config, document.getText());
        this._activeFilters.set(uri, filter);
        this._emitter.emit("changed", { uri, filter });
      }
    }
  }
}
