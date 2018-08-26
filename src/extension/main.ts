/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as vscode from "vscode";

import { registerPlaySound } from "./commands";
import { DocumentRegistry } from "./registries/documents";
import { EditorRegistry } from "./registries/editors";
import { ConfigurationManager } from "./managers/configuration";
import { ItemFilterManager } from "./managers/item-filters";
import { SoundDecorationManager } from "./managers/sound-decorations";
import { FilterCompletionProvider } from "./providers/completions";
import { FilterDiagnosticsProvider } from "./providers/diagnostics";
import { FilterHoverProvider } from "./providers/hovers";
import { FilterColorProvider } from "./providers/colors";

export function activate(context: vscode.ExtensionContext): void {
  registerPlaySound(context);

  const documentRegistry = new DocumentRegistry();
  const editorRegistry = new EditorRegistry(documentRegistry);
  const configManager = new ConfigurationManager();
  const filterManager = new ItemFilterManager(configManager, documentRegistry);
  const soundManager = new SoundDecorationManager(editorRegistry, filterManager);

  const completionProvider = new FilterCompletionProvider(configManager);
  const diagnosticProvider = new FilterDiagnosticsProvider(filterManager);
  const hoverProvider = new FilterHoverProvider();
  const colorProvider = new FilterColorProvider(configManager, filterManager);

  const selector: vscode.DocumentFilter = {
    language: "item-filter",
    scheme: "file"
  };

  context.subscriptions.push(
    documentRegistry,
    editorRegistry,
    configManager,
    filterManager,
    soundManager,
    completionProvider,
    diagnosticProvider,
    colorProvider,
    vscode.languages.registerCompletionItemProvider(selector, completionProvider, '"'),
    vscode.languages.registerHoverProvider(selector, hoverProvider),
    vscode.languages.registerColorProvider(selector, colorProvider)
  );
}
