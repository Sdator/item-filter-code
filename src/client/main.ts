/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";
import * as nls from "vscode-nls";

const localize = nls.loadMessageBundle();

import { ExtensionContext } from "vscode";
import {
  LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from "vscode-languageclient";

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join("dist", "server",
    "serverMain.js"));
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: ["item-filter"],
    synchronize: {
      configurationSection: "item-filter"
    }
  };

  const client = new LanguageClient("filter", localize("filter.server-name",
    "Item Filter Language Server"), serverOptions, clientOptions);

  const disposable = client.start();
  context.subscriptions.push(disposable);
}
