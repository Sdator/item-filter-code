/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";
import * as nls from "vscode-nls";

const localize = nls.loadMessageBundle();

import {
  commands, languages, window, workspace, ExtensionContext, TextDocument, ProviderResult,
  Range, Color, ColorInformation, ColorPresentation, DecorationOptions, MarkdownString
} from "vscode";
import {
  LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from "vscode-languageclient";
import {
  DocumentColorParams, DocumentColorRequest
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { SoundInformation } from "../server/item-filter";
import { playSound } from "./sound-player";

interface ColorContext {
  document: TextDocument;
  range: Range;
}

interface PlaySoundOptions {
  identifier: string;
  volume: string;
}

let client: LanguageClient;
let activateEditorURI: string | undefined;
const soundDecorationType = window.createTextEditorDecorationType({
  borderWidth: "0px 0px 1px",
  borderStyle: "solid",
  borderColor: "MediumSeaGreen"
});
const soundDecorationCache: Map<string, DecorationOptions[]> = new Map();

function provideDocumentColors(document: TextDocument): ProviderResult<ColorInformation[]> {
  const params: DocumentColorParams = {
    textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document)
  };

  return client.sendRequest(DocumentColorRequest.type, params).then(symbols => {
    return symbols.map(symbol => {
      const range = client.protocol2CodeConverter.asRange(symbol.range);
      const color = new Color(symbol.color.red, symbol.color.green,
        symbol.color.blue, symbol.color.alpha);
      return new ColorInformation(range, color);
    });
  });
}

function provideColorPresentations(color: Color, context: ColorContext):
  ProviderResult<ColorPresentation[]> {

  const result: ColorPresentation[] = [];

  const red = Math.trunc(color.red * 255);
  const green = Math.trunc(color.green * 255);
  const blue = Math.trunc(color.blue * 255);
  const alpha = Math.trunc(color.alpha * 255);
  const appendAlpha = alpha === 255 ? false : true;
  const alwaysShowAlpha = workspace.getConfiguration("item-filter").get("alwaysShowAlpha");

  let colorString = `${red} ${green} ${blue}`;
  if (alwaysShowAlpha || appendAlpha) colorString += ` ${alpha}`;

  result.push({
    label: "Color Picker",
    textEdit: {
      newText: colorString,
      range: context.range,
      newEol: context.document.eol
    }
  });

  return result;
}

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

  const serverModule = context.asAbsolutePath(path.join("dist", "server",
    "serverMain.js"));
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

  client = new LanguageClient("filter", localize("filter.server-name",
    "Item Filter Language Server"), serverOptions, clientOptions);

  const disposable = client.start();
  context.subscriptions.push(disposable);

  await client.onReady();
  context.subscriptions.push(languages.registerColorProvider(documentSelector,
    { provideDocumentColors, provideColorPresentations }));

  client.onNotification("update-sounds", (uri: string, sounds: SoundInformation[]) => {
    const decorations = createSoundDecorations(sounds);

    if (window.activeTextEditor && uri === activateEditorURI) {
      window.activeTextEditor.setDecorations(soundDecorationType, decorations);
    }

    soundDecorationCache.set(uri, decorations);
  });
}
