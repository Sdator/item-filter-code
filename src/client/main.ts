/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";

import {
  commands, window, workspace, ExtensionContext, DecorationOptions, MarkdownString
} from "vscode";

import {
  LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from "vscode-languageclient";

import { buildRoot } from "../common";
import { SoundInformation, SoundNotification } from "../types";
import { playSound } from "./sound-player";

interface PlaySoundOptions {
  identifier: string;
  volume: string;
}

let client: LanguageClient;
let activateEditorURI: string | undefined;
const soundDecorationType = window.createTextEditorDecorationType({
  borderWidth: "0px 0px 0.6mm",
  borderStyle: "solid",
  borderColor: "MediumSeaGreen"
});
const soundDecorationCache: Map<string, DecorationOptions[]> = new Map();

function createSoundDecorations(sounds: SoundInformation[]): DecorationOptions[] {
  const result: DecorationOptions[] = [];

  for (const sound of sounds) {
    if (!sound.knownIdentifier) continue;
    const soundFields: PlaySoundOptions = {
      identifier: sound.identifier,
      volume: `${sound.volume}`
    };

    const commandText = "command:item-filter.playSound?" + JSON.stringify(soundFields);
    const markdown = `[Play Sound](${encodeURI(commandText)})`;
    const markdownString = new MarkdownString(markdown);
    markdownString.isTrusted = true;

    const decoration: DecorationOptions = {
      range: client.protocol2CodeConverter.asRange(sound.range),
      hoverMessage: markdownString
    };

    result.push(decoration);
  }

  return result;
}

function playSoundCommand({identifier, volume}: PlaySoundOptions): void {
  playSound(identifier, parseInt(volume, 10));
}

export async function activate(context: ExtensionContext) {
  context.subscriptions.push(commands.registerCommand("item-filter.playSound",
    playSoundCommand));

  const activeEditor = window.activeTextEditor;
  if (activeEditor) {
    activateEditorURI = activeEditor.document.uri.toString();
  }

  context.subscriptions.push(window.onDidChangeActiveTextEditor(editor => {
    if (editor === undefined) {
      activateEditorURI = undefined;
      return;
    }

    const uri = editor.document.uri.toString();
    activateEditorURI = uri;

    const decorations = soundDecorationCache.get(uri);
    if (decorations) {
      editor.setDecorations(soundDecorationType, decorations);
    }
  }));

  context.subscriptions.push(workspace.onDidCloseTextDocument(document => {
    const uri = document.uri.toString();
    soundDecorationCache.delete(uri);
  }));

  const serverModule = path.join(buildRoot, "server", "serverMain.js");
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };

  const documentSelector = ["item-filter"];

  const clientOptions: LanguageClientOptions = {
    documentSelector,
    synchronize: {
      configurationSection: "item-filter"
    }
  };

  client = new LanguageClient("filter", "Item Filter Language Server",
    serverOptions, clientOptions);

  const disposable = client.start();
  context.subscriptions.push(disposable);

  await client.onReady();

  client.onNotification(SoundNotification.type, params => {
    const decorations = createSoundDecorations(params.sounds);

    if (window.activeTextEditor && params.uri === activateEditorURI) {
      window.activeTextEditor.setDecorations(soundDecorationType, decorations);
    }

    soundDecorationCache.set(params.uri, decorations);
  });
}
