/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  createConnection, IConnection, IPCMessageReader, IPCMessageWriter, TextDocument,
  TextDocuments, InitializeResult, ServerCapabilities, CompletionItem
} from "vscode-languageserver";
import {
  ServerCapabilities as CPServerCapabilities, DocumentColorRequest
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { ConfigurationValues } from "./common";
import { equalArrays, splitLines, runSafe } from "./helpers";
import { getCompletionSuggestions } from "./completion";
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
  connection.sendNotification("update-sounds", uri, payload.soundInformation);
}

connection.onInitialize((_param): InitializeResult => {
  const capabilities: ServerCapabilities & CPServerCapabilities = {
    textDocumentSync: documents.syncKind,
    completionProvider: {},
    colorProvider: true
  };

  return { capabilities };
});

documents.onDidChangeContent(change => {
  return runSafe(async () => {
    return processItemFilter(change.document);
  }, undefined, `Error while processing text changes within ${change.document.uri}`);
});

documents.onDidClose(event => {
  itemFilters.delete(event.document.uri);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
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
  return runSafe<CompletionItem[]>(() => {
    const document = documents.get(params.textDocument.uri);
    const lines = splitLines(document.getText());
    const row = params.position.line;
    return getCompletionSuggestions(config, lines[row], params.position);
  }, [], `Error while computing autocompletion results for ${params.textDocument.uri}`);
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
