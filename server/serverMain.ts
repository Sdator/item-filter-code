/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { IConnection, IPCMessageReader, IPCMessageWriter, InitializeResult, TextDocumentSyncKind, createConnection } from "vscode-languageserver";

interface ConfigurationValues {
  baseWhitelist: string[];
  classWhitelist: string[];
}

const config: ConfigurationValues = { baseWhitelist: [], classWhitelist: [] };

const connection: IConnection = createConnection(new IPCMessageReader(process),
  new IPCMessageWriter(process));

connection.onInitialize((_param): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental
    }
  }
});

connection.onDidOpenTextDocument((_) => {
  // VSCode will never call into us with anything that doesn't match our
  // document selector, so no checks are necessary here.
});

connection.onDidChangeTextDocument(params => {
  if (params.contentChanges.length == 0) return;
});

connection.onDidCloseTextDocument((_) => {});

connection.onDidChangeConfiguration(change => {
  const newConfig = <ConfigurationValues>change.settings["item-filter"];
  config.baseWhitelist = newConfig.baseWhitelist;
  config.classWhitelist = newConfig.classWhitelist;

  // TODO(glen): we should detect which of these values has actually changed,
  //  then refresh the appropriate rules accordingly. VSCode seems to always
  //  pass all configuration values every single time.
});

connection.listen();
