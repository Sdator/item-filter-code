/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  createConnection, IConnection, IPCMessageReader, IPCMessageWriter, TextDocument,
  TextDocuments, InitializeResult, ServerCapabilities
} from "vscode-languageserver";
import {
  ServerCapabilities as CPServerCapabilities, DocumentColorRequest
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { ConfigurationValues } from "./common";
import { equalArrays } from "./helpers";
import { ItemFilter } from "./item-filter";

const itemFilters: Map<string, ItemFilter> = new Map();

let config: ConfigurationValues = {
  baseWhitelist: [],
  classWhitelist: [],
  ruleWhitelist: [],
  performanceHints: true,
  alwaysShowAlpha: false
};

const connection: IConnection = createConnection(new IPCMessageReader(process),
  new IPCMessageWriter(process));

const documents: TextDocuments = new TextDocuments();

function processItemFilter(document: TextDocument): void {
  const uri = document.uri;
  const lines = document.getText().split(/\r?\n/g);
  const filter = new ItemFilter(config, uri, lines);

  itemFilters.set(uri, filter);
  filter.getDiagnostics().then(diagnostics => {
    connection.sendDiagnostics({ uri, diagnostics });
  }).catch(e => {
    // TODO(glen): how should we be logging these?
    console.error(e);
  });
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
  processItemFilter(change.document);
});

documents.onDidClose(event => {
  itemFilters.delete(event.document.uri);
});

connection.onDidChangeConfiguration(change => {
  const newConfig = <ConfigurationValues> change.settings["item-filter"];

  let update = false;
  if (!equalArrays(config.baseWhitelist, newConfig.baseWhitelist)) update = true;
  if (!equalArrays(config.classWhitelist, newConfig.classWhitelist)) update = true;
  if (!equalArrays(config.ruleWhitelist, newConfig.ruleWhitelist)) update = true;
  if (!config.performanceHints === newConfig.performanceHints) update = true;

  config = newConfig;

  if (update) {
    const openFilters = documents.all();
    itemFilters.clear();
    for (const filter of openFilters) {
      processItemFilter(filter);
    }
  }
});

connection.onCompletion(params => {
  const filter = itemFilters.get(params.textDocument.uri);
  if (filter) {
    return filter.getCompletionSuggestions(params.textDocument.uri,
      params.position);
  } else {
    return [];
  }
});

connection.onRequest(DocumentColorRequest.type, params => {
  const filter = itemFilters.get(params.textDocument.uri);
  if (filter) {
    return filter.getColorInformation();
  } else {
    return [];
  }
});

documents.listen(connection);
connection.listen();
