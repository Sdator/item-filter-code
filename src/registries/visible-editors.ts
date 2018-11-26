/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import debounce = require("lodash.debounce");
import * as vscode from "vscode";

import { CompositeDisposable, Emitter, Event, IDisposable } from "../kits/events";
import { DocumentRegistry } from "./documents";

/** Type information for the EditorRegistry's Emitter. */
interface Emissions {
  /** Emitted whenever new a text editor is now visible within the window. */
  "editor-opened": vscode.TextEditor;

  /** Emitted whenever a text editor is no longer visible within the window. */
  "editor-closed": vscode.TextEditor;

  /** Emitted whenever new a filter text editor is now visible within the window. */
  "filter-opened": vscode.TextEditor;

  /** Emitted whenever a filter text editor is no longer visible within the window. */
  "filter-closed": vscode.TextEditor;
}

/**
 * A registry of visible text editors within the workspace, providing both a
 * list of those text editors and the ability to subscribe to several events
 * involving them.
 */
export class VisibleEditorRegistry implements IDisposable {
  private readonly _documentRegistry: DocumentRegistry;
  private readonly _editors: Set<vscode.TextEditor>;
  private readonly _emitter: Emitter<Emissions>;
  private readonly _filterEditors: Set<vscode.TextEditor>;
  private readonly _subscriptions: CompositeDisposable;

  /** A list of visible text editors within the window. */
  get editors(): vscode.TextEditor[] {
    const result: vscode.TextEditor[] = [];

    for (const editor of this._editors) {
      result.push(editor);
    }

    return result;
  }

  /** A list of visible text editors containing item filters within the window. */
  get filterEditors(): vscode.TextEditor[] {
    const result: vscode.TextEditor[] = [];

    for (const editor of this._filterEditors) {
      result.push(editor);
    }

    return result;
  }

  constructor(documentRegistry: DocumentRegistry) {
    this._emitter = new Emitter();
    this._documentRegistry = documentRegistry;
    this._editors = new Set();
    this._filterEditors = new Set();

    // tslint:disable:no-unsafe-any
    const editorUpdater: IUpdater = {
      open: this._openEditor.bind(this),
      close: this._closeEditor.bind(this)
    };

    const filterUpdater: IUpdater = {
      open: this._openFilter.bind(this),
      close: this._closeFilter.bind(this)
    };
    // tslint:enable:no-unsafe-any

    const updateFilters = debounce(updateEditors, 10);

    this._subscriptions = new CompositeDisposable([
      vscode.window.onDidChangeVisibleTextEditors(editors => {
        updateEditors(editorUpdater, this._editors, editors);
      }),

      this.onDidOpenEditor(_ => {
        updateFilters(filterUpdater, this._filterEditors, this.editors);
      }),

      this.onDidCloseEditor(_ => {
        updateFilters(filterUpdater, this._filterEditors, this.editors);
      }),

      this._documentRegistry.onDidOpenFilter(_ => {
        updateFilters(filterUpdater, this._filterEditors, this.editors);
      }),

      this._documentRegistry.onDidCloseFilter(_ => {
        updateFilters(filterUpdater, this._filterEditors, this.editors);
      })
    ]);

    for (const editor of vscode.window.visibleTextEditors) {
      this._openEditor(editor);

      if (editor.document.languageId === "item-filter") {
        this._openFilter(editor);
      }
    }
  }

  /** Disposes of this registry and all of its subscriptions. */
  dispose(): void {
    this._subscriptions.dispose();
    this._emitter.dispose();
    this._editors.clear();
    this._filterEditors.clear();
  }

  /**
   * Invoke the given callback whenever a text editor is opened within the window.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidOpenEditor: Event<Emissions["editor-opened"]> = (e, thisArg) => {
    return this._emitter.on("editor-opened", e, thisArg);
  }

  /**
   * Invoke the given callback whenever a text editor containing an item filter
   * is opened within the window.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidOpenFilterEditor: Event<Emissions["filter-opened"]> = (e, thisArg) => {
    return this._emitter.on("filter-opened", e, thisArg);
  }

  /**
   * Invoke the given callback whenever a text editor is closed within the window.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidCloseEditor: Event<Emissions["editor-closed"]> = (e, thisArg) => {
    return this._emitter.on("editor-closed", e, thisArg);
  }

  /**
   * Invoke the given callback whenever a text editor containing an item filter
   * is closed within the window.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  onDidCloseFilterEditor: Event<Emissions["filter-closed"]> = (e, thisArg) => {
    return this._emitter.on("filter-closed", e, thisArg);
  }

  /**
   * Invoke the given callback with all current and future text editors opened
   * within the window.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observeEditors: Event<Emissions["editor-opened"]> = (e, thisArg) => {
    return this._emitter.observe("editor-opened", this._editors, e, thisArg);
  }

  /**
   * Invoke the given callback with all current and future filter text editors
   * opened within the window.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observeFilterEditors: Event<Emissions["filter-opened"]> = (e, thisArg) => {
    return this._emitter.observe("filter-opened", this._filterEditors, e, thisArg);
  }

  /** Registers a text editor as having been opened. */
  private _openEditor(editor: vscode.TextEditor): void {
    this._editors.add(editor);
    this._emitter.emit("editor-opened", editor);
  }

  /** Registers a filter text editor as having been opened. */
  private _openFilter(editor: vscode.TextEditor): void {
    this._filterEditors.add(editor);
    this._emitter.emit("filter-opened", editor);
  }

  /** Unregister a previously opened text editor. */
  private _closeEditor(editor: vscode.TextEditor): void {
    this._editors.delete(editor);
    this._emitter.emit("editor-closed", editor);
  }

  /** Unregister a previously opened filter text editor. */
  private _closeFilter(editor: vscode.TextEditor): void {
    this._filterEditors.delete(editor);
    this._emitter.emit("filter-closed", editor);
  }
}

interface IUpdater {
  open(editor: vscode.TextEditor): void;
  close(editor: vscode.TextEditor): void;
}

/**
 * Redetermines the visible text editors that contain item filters within
 * the window, performing any work necessary in order to track those editors
 * as they are opened and closed.
 */
function updateEditors(updater: IUpdater, currentEditors: Set<vscode.TextEditor>,
  updatedEditors: vscode.TextEditor[]): void {

  const matchedFilters: vscode.TextEditor[] = [];
  const unmatchedFilters: vscode.TextEditor[] = [];

  // We need to categorize these in order to determine the ones that are missing.
  for (const editor of updatedEditors) {
    if (editor.document.languageId === "item-filter") {
      if (currentEditors.has(editor)) {
        matchedFilters.push(editor);
      } else {
        unmatchedFilters.push(editor);
      }
    }
  }

  // Work out the closed editors so that we can dispatch events as necessary.
  const closedFilters: vscode.TextEditor[] = [];
  for (const previousFilter of currentEditors) {
    let matched = false;
    for (const matchedFilter of matchedFilters) {
      if (previousFilter === matchedFilter) {
        matched = true;
        break;
      }
    }

    if (!matched) {
      closedFilters.push(previousFilter);
      updater.close(previousFilter);
    }
  }

  // Repopulate the visible editors set with the new editor list.
  currentEditors.clear();
  for (const editor of matchedFilters) {
    currentEditors.add(editor);
  }

  for (const editor of unmatchedFilters) {
    currentEditors.add(editor);
    updater.open(editor);
  }
}
