/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";

process.env.CODE_TESTS_WORKSPACE = path.join(__dirname, "..", "..", "src", "test");

function start() {
  console.log("*".repeat(100));
  console.log("Start Standard tests");
  require("../../node_modules/vscode/bin/test");
}

start();