/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";
import * as nls from "vscode-nls";

const localize = nls.loadMessageBundle();

import {
  languages, Color, ColorInformation, ColorPresentation, ExtensionContext,
  TextDocument, ProviderResult, Range, workspace
} from "vscode";

import {
  LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from "vscode-languageclient";

import {
  DocumentColorParams, DocumentColorRequest
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

let client: LanguageClient;

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

function provideColorPresentations(color: Color, context:
  { document: TextDocument, range: Range }): ProviderResult<ColorPresentation[]> {

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

export async function activate(context: ExtensionContext) {
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
}
