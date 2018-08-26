/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { CompositeDisposable, IDisposable } from "../../common/event-kit";
import { SoundInformation } from "../../common/types";
import { EditorRegistry } from "../registries/editors";
import { intoCodeRange } from "../converters";
import { ItemFilterManager, FilterChangedEvent } from "./item-filters";
import { PlaySoundOptions } from "../types";

/**
 * Creates and manages sound decorations for each visible editor of the Visual
 * Studio Code window.
 */
export class SoundDecorationManager implements IDisposable {
  private readonly _cache: Map<string, vscode.DecorationOptions[]>;
  private readonly _decorationType: vscode.TextEditorDecorationType;
  private readonly _editorRegistry: EditorRegistry;
  private readonly _filterManager: ItemFilterManager;
  private readonly _subscriptions: CompositeDisposable;

  constructor(editorRegistry: EditorRegistry, filterManager: ItemFilterManager) {
    this._cache = new Map();
    this._editorRegistry = editorRegistry;
    this._filterManager = filterManager;

    this._decorationType = vscode.window.createTextEditorDecorationType({
      borderWidth: "0px 0px 0.6mm",
      borderStyle: "solid",
      borderColor: "MediumSeaGreen"
    });

    this._subscriptions = new CompositeDisposable(
      editorRegistry.observeFilterEditors(this._open, this),
      editorRegistry.onDidCloseFilterEditor(this._close, this),
      filterManager.onDidChangeFilter(this._update, this)
    );
  }

  /** Disposes of this manager and all of its subscriptions. */
  dispose(): void {
    this._subscriptions.dispose();
    this._cache.clear();
  }

  /**
   * Registers the given editor as being visible, performing any work necessary
   * to either create or restore any sound decorations specific to that editor's
   * document.
   */
  private async _open(editor: vscode.TextEditor): Promise<void> {
    const uri = editor.document.uri.toString();

    const existingDecorations = this._cache.get(uri);
    if (existingDecorations) {
      editor.setDecorations(this._decorationType, existingDecorations);
      return;
    }

    const filter = this._filterManager.get(uri);
    // With how we order our events, this should always be true. If it's not,
    // then the decorations will simply be missing until an edit.
    if (filter) {
      const payload = await filter.payload;
      const decorations = this._createDecorations(payload.soundInformation);
      editor.setDecorations(this._decorationType, decorations);
      this._cache.set(uri, decorations);
    }
  }

  /** Closes a previously visible editor. */
  private _close(closedEditor: vscode.TextEditor): void {
    const closedEditorUri = closedEditor.document.uri.toString();

    let sharedDocument = false;
    for (const editor of this._editorRegistry.editors) {
      const editorUri = editor.document.uri.toString();

      if (closedEditorUri === editorUri && editor !== closedEditor) {
        sharedDocument = true;
      }
    }

    if (!sharedDocument) {
      this._cache.delete(closedEditorUri);
    }
  }

  /** Updates the sound decorations for each editor containing the given document. */
  private async _update(event: FilterChangedEvent): Promise<void> {
    const payload = await event.filter.payload;
    const decorations = this._createDecorations(payload.soundInformation);
    this._cache.set(event.uri, decorations);

    for (const editor of this._editorRegistry.editors) {
      const editorUri = editor.document.uri.toString();
      if (editorUri === event.uri) {
        editor.setDecorations(this._decorationType, decorations);
      }
    }
  }

  /** Creates VSCode editor decorations from each of the given sounds. */
  private _createDecorations(sounds: SoundInformation[]): vscode.DecorationOptions[] {
    const result: vscode.DecorationOptions[] = [];

    for (const sound of sounds) {
      if (!sound.knownIdentifier) continue;
      const soundFields: PlaySoundOptions = {
        id: sound.identifier,
        volume: `${sound.volume}`
      };

      const commandText = "command:item-filter.playSound?" + JSON.stringify(soundFields);
      const markdown = `[Play Sound](${encodeURI(commandText)})`;
      const markdownString = new vscode.MarkdownString(markdown);
      markdownString.isTrusted = true;

      const decoration: vscode.DecorationOptions = {
        range: intoCodeRange(sound.range),
        hoverMessage: markdownString
      };

      result.push(decoration);
    }

    return result;
  }
}
