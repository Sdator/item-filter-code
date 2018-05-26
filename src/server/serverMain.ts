/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  createConnection, ColorPresentation, ColorPresentationRequest, DocumentColorRequest,
  IConnection, IPCMessageReader, IPCMessageWriter, TextDocument, TextDocuments,
  InitializeResult, ServerCapabilities
} from "vscode-languageserver";

import { isConfiguration } from "../common";
import { ConfigurationValues, SoundNotification } from "../types";
import { equalArrays, splitLines, runSafe } from "./helpers";
import { getCompletionSuggestions } from "./completion-provider";
import { getHoverResult } from "./hover-provider";
import { ItemFilter } from "./item-filter";

const itemFilters: Map<string, ItemFilter> = new Map();

let config: ConfigurationValues = {
  baseWhitelist: [],
  classWhitelist: [],
  ruleWhitelist: [],
  soundWhitelist: [],
  performanceHints: true,
  alwaysShowAlpha: false
};

const connection: IConnection = createConnection(new IPCMessageReader(process),
  new IPCMessageWriter(process));

const documents: TextDocuments = new TextDocuments();

async function processItemFilter(document: TextDocument): Promise<void> {
  const uri = document.uri;
  const text = document.getText();
  const filter = new ItemFilter(config, text);

  itemFilters.set(uri, filter);
  const payload = await filter.payload;
  connection.sendDiagnostics({ uri, diagnostics: payload.diagnostics });
  connection.sendNotification(SoundNotification.type, { uri, sounds: payload.soundInformation });
}

connection.onInitialize((_param): InitializeResult => {
  const capabilities: ServerCapabilities = {
    textDocumentSync: documents.syncKind,
    completionProvider: {
      triggerCharacters: ['"']
    },
    colorProvider: true,
    hoverProvider: true
  };

  return { capabilities };
});

documents.onDidChangeContent(change => {
  return runSafe(async () => {
    return processItemFilter(change.document);
  }, undefined, `Error while processing text changes within ${change.document.uri}`);
});

documents.onDidClose(event => {
  const uri = event.document.uri;
  itemFilters.delete(uri);
  connection.sendDiagnostics({ uri, diagnostics: [] });
  connection.sendNotification(SoundNotification.type, { uri, sounds: [] });
});

connection.onDidChangeConfiguration(change => {
  return runSafe(async () => {
    if (!isConfiguration(change.settings)) return;
    const newConfig = change.settings["item-filter"];

    let update = false;
    if (!equalArrays(config.baseWhitelist, newConfig.baseWhitelist)) update = true;
    if (!equalArrays(config.classWhitelist, newConfig.classWhitelist)) update = true;
    if (!equalArrays(config.ruleWhitelist, newConfig.ruleWhitelist)) update = true;
    if (!config.performanceHints === newConfig.performanceHints) update = true;

    config = newConfig;

    if (update) {
      const openFilters = documents.all();
      itemFilters.clear();

      const promises: Array<Promise<void>> = [];
      for (const filter of openFilters) {
        promises.push(processItemFilter(filter));
      }

      return await Promise.all(promises);
    } else {
      return;
    }
  }, undefined, `Error while processing configuration variable changes`);
});

connection.onCompletion(params => {
  return runSafe(async () => {
    const document = documents.get(params.textDocument.uri);
    if (document) {
      const lines = splitLines(document.getText());
      const row = params.position.line;
      return getCompletionSuggestions(config, lines[row], params.position);
    } else {
      return [];
    }
  }, [], `Error while computing autocompletion results for ${params.textDocument.uri}`);
});

connection.onHover(params => {
  return runSafe(async () => {
    const document = documents.get(params.textDocument.uri);
    if (document) {
      const lines = splitLines(document.getText());
      const row = params.position.line;
      return getHoverResult(lines[row], params.position);
    } else {
      return null;
    }
  }, null, `Error while computing hover for ${params.textDocument.uri}`);
});

connection.onRequest(DocumentColorRequest.type, async params => {
  return runSafe(async () => {
    const filter = itemFilters.get(params.textDocument.uri);

    if (filter) {
      const payload = await filter.payload;
      return payload.colorInformation;
    } else {
      return [];
    }
  }, [], `Error while computing color presentations for ${params.textDocument.uri}`);
});

connection.onRequest(ColorPresentationRequest.type, params => {
  return runSafe(async () => {
    const result: ColorPresentation[] = [];

    const color = params.color;
    const red = Math.trunc(color.red * 255);
    const green = Math.trunc(color.green * 255);
    const blue = Math.trunc(color.blue * 255);
    const alpha = Math.trunc(color.alpha * 255);
    const appendAlpha = alpha === 255 ? false : true;

    let colorString = `${red} ${green} ${blue}`;
    if (config.alwaysShowAlpha || appendAlpha) colorString += ` ${alpha}`;

    result.push({
      label: "Color Picker",
      textEdit: {
        newText: colorString,
        range: params.range
      }
    });

    return result;
  }, [], `Error while computing color presentations for ${params.textDocument.uri}`);
});

documents.listen(connection);
connection.listen();
