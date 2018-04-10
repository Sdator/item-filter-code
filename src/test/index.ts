/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";
import { MochaSetupOptions } from "vscode/lib/testrunner";

import { dataRoot } from "../common";
import * as testRunner from "./test-runner";

const options: MochaSetupOptions = {
  ui: "tdd",
  useColors: true,
  timeout: 25000
};

testRunner.configure(options, { coverageConfig: path.join(dataRoot, "coverconfig.json") });
module.exports = testRunner;
