/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  createConnection, DocumentColorRequest, IConnection, IPCMessageReader,
  IPCMessageWriter, TextDocument, TextDocuments, InitializeResult, ServerCapabilities
} from "vscode-languageserver";

import { ConfigurationValues, SoundNotification } from "../types";
import { equalArrays, splitLines, runSafe } from "../helpers";
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
    completionProvider: {},
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
    const newConfig = <ConfigurationValues>change.settings["item-filter"];
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
    const lines = splitLines(document.getText());
    const row = params.position.line;
    return getCompletionSuggestions(config, lines[row], params.position);
  }, [], `Error while computing autocompletion results for ${params.textDocument.uri}`);
});

// The return type with no results (null) was clarified in November, 2017.
// The current definitions don't seem to have that updated type information yet.
// @ts-ignore
connection.onHover(params => {
  return runSafe(async () => {
    const document = documents.get(params.textDocument.uri);
    const lines = splitLines(document.getText());
    const row = params.position.line;
    return getHoverResult(lines[row], params.position);
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

documents.listen(connection);
connection.listen();
