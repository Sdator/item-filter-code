/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { Emitter, Event, IDisposable } from "../../common/event-kit";
import { ItemFilter } from "../../common/item-filter";
import { ConfigurationValues } from "../../common/types";
import { ConfigurationManager } from "../managers/configuration";
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
  private readonly activeFilters: Map<string, ItemFilter>;
  private readonly configManager: ConfigurationManager;
  private readonly documentRegistry: DocumentRegistry;
  private readonly emitter: Emitter<Emissions>;
  private readonly subscriptions: IDisposable[];

  constructor(configManager: ConfigurationManager, documentRegistry: DocumentRegistry) {
    this.configManager = configManager;
    this.documentRegistry = documentRegistry;
    this.activeFilters = new Map();
    this.emitter = new Emitter();

    this.subscriptions = [
      this.documentRegistry.observeFilters(this.openDocument, this),
      this.documentRegistry.onDidCloseFilter(this.closeDocument, this),
      this.documentRegistry.onDidChangeFilter(this.updateDocument, this),
      this.configManager.onDidChange(this.updateConfig, this)
    ];
  }

  /** Disposes of this registry and all of its subscriptions. */
  dispose(): void {
    while (this.subscriptions.length) {
      const s = this.subscriptions.pop();
      if (s) s.dispose();
    }

    this.emitter.dispose();
    this.activeFilters.clear();
  }

  /** Returns the item filter for the given URI, if one exists. */
  get(uri: string): ItemFilter | undefined {
    return this.activeFilters.get(uri);
  }

  /**
   * Invoke the given callback whenever an item filter is opened within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidOpenFilter: Event<Emissions["opened"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("opened", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback whenever an item filter is closed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidCloseFilter: Event<Emissions["closed"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("closed", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback with all current and future item filters opened
   * within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observeFilters: Event<Emissions["opened"]> = (e, thisArg, disposables) => {
    const collection: Set<FilterOpenedEvent> = new Set();

    for (const [uri, filter] of this.activeFilters) {
      collection.add({ uri, filter });
    }

    return this.emitter.observeEvent("opened", collection, e, thisArg, disposables);
  }

  /**
   * Invoke the given callback whenever an item filter has changed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidChangeFilter: Event<Emissions["changed"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("changed", e, thisArg, disposables);
  }

  /** Opens an item filter with the contents of the given document. */
  private openDocument(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    const filter = new ItemFilter(this.configManager.values, document.getText());
    this.activeFilters.set(uri, filter);
    this.emitter.emit("opened", { uri, filter });
  }

  /** Closes the item filter associated with the given text document. */
  private closeDocument(document: vscode.TextDocument): void {
    this.closeUri(document.uri.toString());
  }

  /** Closes the item filter associated with the given identifier.  */
  private closeUri(uri: string): void {
    this.activeFilters.delete(uri);
    this.emitter.emit("closed", { uri });
  }

  /** Updates the item filter associated with the given event. */
  private updateDocument(event: vscode.TextDocumentChangeEvent): void {
    const uri = event.document.uri.toString();
    const filter = new ItemFilter(this.configManager.values, event.document.getText());
    this.activeFilters.set(uri, filter);
    this.emitter.emit("changed", { uri, filter });
  }

  /** Performs any work necessary whenever a configuration value has changed. */
  private updateConfig(config: ConfigurationValues): void {
    for (const [uri] of this.activeFilters) {
      const document = this.documentRegistry.getFilter(uri);
      if (document) {
        const filter = new ItemFilter(config, document.getText());
        this.activeFilters.set(uri, filter);
        this.emitter.emit("changed", { uri, filter });
      }
    }
  }
}
