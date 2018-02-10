/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// TODO(glen): provide the formatter hook-in here.
// TODO(glen): provide the color provider hook-in here.

import {
  createConnection, IConnection, IPCMessageReader, IPCMessageWriter, TextDocument,
  TextDocuments, InitializeResult
} from "vscode-languageserver";

import { ConfigurationValues, ItemFilter } from "./item-filter";

const itemFilters: Map<string, ItemFilter> = new Map();

const config: ConfigurationValues = {
  baseWhitelist: [],
  classWhitelist: [],
  performanceHints: true,
  performanceOptimization: false
};

const connection: IConnection = createConnection(new IPCMessageReader(process),
  new IPCMessageWriter(process));

const documents: TextDocuments = new TextDocuments();

async function processItemFilter(document: TextDocument): Promise<void> {
  const uri = document.uri;
  const lines = document.getText().split(/\r?\n/g);
  const filter = new ItemFilter(config, uri, lines);

  itemFilters.set(uri, filter);
  const diagnostics = await filter.getDiagnostics();
  connection.sendDiagnostics({ uri, diagnostics });
}

documents.listen(connection);

connection.onInitialize((_param): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      completionProvider: {}
    }
  };
});

documents.onDidChangeContent(async change => {
  await processItemFilter(change.document);
});

connection.onDidChangeConfiguration(async change => {
  const newConfig = <ConfigurationValues> change.settings["item-filter"];

  let updating = false;
  if (config.baseWhitelist !== newConfig.baseWhitelist) {
    updating = true;
    config.baseWhitelist = newConfig.baseWhitelist;
  }

  if (config.classWhitelist !== newConfig.classWhitelist) {
    updating = true;
    config.classWhitelist = newConfig.classWhitelist;
  }

  if (!updating) return [];

  const openFilters = documents.all();
  const promises: Array<Promise<void>> = [];
  for (const filter of openFilters) {
    promises.push(processItemFilter(filter));
  }

  return Promise.all(promises);
});

connection.onCompletion(async params => {
  const filter = itemFilters.get(params.textDocument.uri);

  if (filter) {
    return await filter.getCompletionSuggestions(params.textDocument.uri,
      params.position);
  } else {
    return [];
  }
});

connection.listen();
