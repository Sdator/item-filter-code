/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import testRunner = require("vscode/lib/testrunner");

testRunner.configure({
  ui: "bdd",
  useColors: true
});

module.exports = testRunner;
