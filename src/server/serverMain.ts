/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import {
  createConnection, CompletionItem, CompletionItemKind, InitializeResult,
  IConnection, IPCMessageReader, IPCMessageWriter, TextDocumentSyncKind
} from "vscode-languageserver";

// import { ConfigurationValues, FilterManager, Point, TextChange } from "../filterManager";
import {
  AssertUnreachable, CompletionResultType, ConfigurationValues, Overseer, Point,
  TextChange
} from "../core";

const config: ConfigurationValues = { baseWhitelist: [], classWhitelist: [] };
const overseer = new Overseer(config);

const connection: IConnection = createConnection(new IPCMessageReader(process),
  new IPCMessageWriter(process));

connection.onInitialize((_param): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true
      }
    }
  };
});

connection.onDidOpenTextDocument(params => {
  if (params.textDocument.languageId !== "item-filter") {
    connection.console.error("unimplemented language identifier passed to the server");
    return;
  }

  const lines = params.textDocument.text.split(/\r?\n/g);
  overseer.add(params.textDocument.uri, lines);
});

connection.onDidChangeTextDocument(params => {
  if (params.contentChanges.length === 0) return;

  const changes: TextChange[] = [];
  for (const c of params.contentChanges) {
    if (!c.range) continue;

    const change: TextChange = {
      lines: c.text.split("/\r?\n/g"),
      range: {
        start: {
          row: c.range.start.line,
          column: c.range.start.character
        },
        end: {
          row: c.range.start.line,
          column: c.range.start.character
        }
      }
    };
    changes.push(change);
  }

  overseer.incrementalUpdate(params.textDocument.uri, changes);
});

connection.onDidCloseTextDocument(params => {
  overseer.remove(params.textDocument.uri);
});

connection.onDidChangeConfiguration(change => {
  const newConfig = <ConfigurationValues> change.settings["item-filter"];

  let updateBases = false;
  if (config.baseWhitelist !== newConfig.baseWhitelist) {
    updateBases = true;
    config.baseWhitelist = newConfig.baseWhitelist;
  }

  let updateClasses = false;
  if (config.classWhitelist !== newConfig.classWhitelist) {
    updateClasses = true;
    config.classWhitelist = newConfig.classWhitelist;
  }

  if (updateBases && updateClasses) {
    overseer.fullUpdate();
  } else if (updateBases) {
    overseer.updateBaseRules();
  } else if (updateClasses) {
    overseer.updateClassRules();
  }
});

connection.onCompletion(async params => {
  const point = new Point(params.position.line, params.position.character);

  const results = await overseer.getCompletionSuggestions(params.textDocument.uri,
    point);

  const completionItems: CompletionItem[] = [];
  for (const result of results) {
    let kind: CompletionItemKind;
    switch (result.type) {
      case CompletionResultType.Block:
        kind = CompletionItemKind.Class;
        break;
      case CompletionResultType.Rule:
        kind = CompletionItemKind.Function;
        break;
      case CompletionResultType.BaseType:
      case CompletionResultType.Color:
      case CompletionResultType.Class:
      case CompletionResultType.Boolean:
      case CompletionResultType.Rarity:
      case CompletionResultType.Sound:
        kind = CompletionItemKind.Value;
        break;
      default:
        return AssertUnreachable(result.type);
    }

    const item: CompletionItem = {
      label: result.displayText ? result.displayText : result.text,
      insertText: result.text,
      kind
    };

    completionItems.push(item);
  }

  // params.textDocument.uri
  return [
    {
      label: "Test",
      kind: CompletionItemKind.Text,
      data: 1
    }
  ];
});

connection.onCompletionResolve(item => {
  if (item.data === 1) {
    item.detail = "Test Details";
    item.documentation = "Documentation for Test.";
  }

  return item;
});

connection.listen();
