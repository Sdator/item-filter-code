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
  ServerCapabilities as CPServerCapabilities, DocumentColorRequest,
  ColorPresentationRequest
} from "vscode-languageserver-protocol/lib/protocol.colorProvider.proposed";

import { runSafe } from "./helpers";
import { ConfigurationValues, ItemFilter } from "./item-filter";

const itemFilters: Map<string, ItemFilter> = new Map();

let config: ConfigurationValues = {
  baseWhitelist: [],
  classWhitelist: [],
  blockWhitelist: [],
  ruleWhitelist: [],
  performanceHints: true
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
  const capabilities: ServerCapabilities & CPServerCapabilities = {
    textDocumentSync: documents.syncKind,
    completionProvider: {},
    colorProvider: true
  };

  return { capabilities };
});

documents.onDidChangeContent(async change => {
  await processItemFilter(change.document);
});

documents.onDidClose(event => {
  itemFilters.delete(event.document.uri);
});

connection.onDidChangeConfiguration(async change => {
  config = <ConfigurationValues> change.settings["item-filter"];

  const openFilters = documents.all();
  const promises: Array<Promise<void>> = [];
  for (const filter of openFilters) {
    promises.push(processItemFilter(filter));
  }

  return Promise.all(promises);
});

connection.onCompletion(async params => {
  return runSafe(async () => {
    const filter = itemFilters.get(params.textDocument.uri);

    if (filter) {
      return await filter.getCompletionSuggestions(params.textDocument.uri,
        params.position);
    } else {
      return [];
    }
  }, [], `Error while computing completions for ${params.textDocument.uri}`);
});

connection.onRequest(DocumentColorRequest.type, params => {
  return runSafe(() => {
    const filter = itemFilters.get(params.textDocument.uri);
    if (filter) {
      return filter.getColorInformation();
    } else {
      return [];
    }
  }, [], `Error while computing document colors for ${params.textDocument.uri}`);
});

connection.onRequest(ColorPresentationRequest.type, params => {
  return runSafe(() => {
    const filter = itemFilters.get(params.textDocument.uri);
    if (filter) {
      return filter.computeColorEdit(params.color, params.range);
    } else {
      return [];
    }
  }, [], `Error while computing color presentations for ${params.textDocument.uri}`);
});

connection.listen();
