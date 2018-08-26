/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { Emitter, Event, IDisposable } from "../../common/event-kit";

/** Type information for the DocumentRegistry's Emitter. */
interface Emissions {
  /** Emitted whenever a document has been opened. */
  "document-opened": vscode.TextDocument;

  /** Emitted whenever a document has been closed. */
  "document-closed": vscode.TextDocument;

  /** Emitted whenever a document has changed. */
  "document-changed": vscode.TextDocumentChangeEvent;

  /** Emitted whenever a filter document has been opened. */
  "filter-opened": vscode.TextDocument;

  /** Emitted whenever a filter document has been closed. */
  "filter-closed": vscode.TextDocument;

  /** Emitted whenever a filter document has changed. */
  "filter-changed": vscode.TextDocumentChangeEvent;
}

/**
 * A registry of text documents open within the workspace, providing both a
 * list of those documents and the ability to subscribe to several events
 * involving them.
 *
 * This class wraps the VSCode document API in order to provide an API more
 * consistent within our own code, while also providing a few extensions of our
 * own.
 */
export class DocumentRegistry implements IDisposable {
  private readonly subscriptions: IDisposable[];
  private readonly emitter: Emitter<Emissions>;

  /** A list of active documents within the editor. */
  get documents(): vscode.TextDocument[] {
    return vscode.workspace.textDocuments;
  }

  /** A list of active filter documents within the editor. */
  get filters(): vscode.TextDocument[] {
    const result: vscode.TextDocument[] = [];

    for (const document of this.documents) {
      if (document.languageId === "item-filter") {
        result.push(document);
      }
    }

    return result;
  }

  constructor() {
    this.emitter = new Emitter();

    this.subscriptions = [
      vscode.workspace.onDidOpenTextDocument(this.open, this),
      vscode.workspace.onDidCloseTextDocument(this.close, this),
      vscode.workspace.onDidChangeTextDocument(this.change, this)
    ];

    for (const document of this.documents) {
      this.open(document);
    }
  }

  /** Disposes of this registry and all of its subscriptions. */
  dispose(): void {
    while (this.subscriptions.length) {
      const s = this.subscriptions.pop();
      if (s) s.dispose();
    }

    this.emitter.dispose();
  }

  /** Returns the TextDocument for the given URI, if one exists. */
  getDocument(uri: string): vscode.TextDocument | undefined {
    for (const d of this.documents) {
      if (d.uri.toString() === uri) {
        return d;
      }
    }

    return undefined;
  }

  /** Returns the TextDocument for the given URI, if one exists and is an item filter. */
  getFilter(uri: string): vscode.TextDocument | undefined {
    for (const f of this.filters) {
      if (f.uri.toString() === uri) {
        return f;
      }
    }

    return undefined;
  }

  /**
   * Invoke the given callback whenever a document is opened within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidOpenDocument: Event<Emissions["document-opened"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("document-opened", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback whenever a filter document is opened within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidOpenFilter: Event<Emissions["filter-opened"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("filter-opened", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback whenever a document is closed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidCloseDocument: Event<Emissions["document-closed"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("document-closed", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback whenever a filter document is closed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidCloseFilter: Event<Emissions["filter-closed"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("filter-closed", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback whenever a document has changed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidChangeDocument: Event<Emissions["document-changed"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("document-changed", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback whenever a filter document has changed within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidChangeFilter: Event<Emissions["filter-changed"]> = (e, thisArg, disposables) => {
    return this.emitter.registerEvent("filter-changed", e, thisArg, disposables);
  }

  /**
   * Invoke the given callback with all current and future documents opened
   * within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observeDocuments: Event<Emissions["document-opened"]> = (e, thisArg, disposables) => {
    return this.emitter.observeEvent("document-opened", this.documents, e, thisArg, disposables);
  }

  /**
   * Invoke the given callback with all current and future filter documents opened
   * within the workspace.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observeFilters: Event<Emissions["filter-opened"]> = (e, thisArg, disposables) => {
    return this.emitter.observeEvent("filter-opened", this.filters, e, thisArg, disposables);
  }

  /** Registers a document as having been opened. */
  private open(document: vscode.TextDocument): void {
    this.emitter.emit("document-opened", document);

    if (document.languageId === "item-filter") {
      this.emitter.emit("filter-opened", document);
    }
  }

  /** Unregisters a previously opened text editor. */
  private close(document: vscode.TextDocument): void {
    this.emitter.emit("document-closed", document);

    if (document.languageId === "item-filter") {
      this.emitter.emit("filter-closed", document);
    }
  }

  /** Updates a previously opened document. */
  private change(event: vscode.TextDocumentChangeEvent): void {
    this.emitter.emit("document-changed", event);

    if (event.document.languageId === "item-filter") {
      this.emitter.emit("filter-changed", event);
    }
  }
}
