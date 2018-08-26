/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as fs from "fs";
import * as path from "path";
import rimraf = require("rimraf");

import * as common from "../common";

const temporaryDirs = [
  common.outputRoot,
  common.dataOutputRoot,
  common.webviewOutputRoot,
  path.join(common.projectRoot, "coverage"),
];

const temporaryFiles = [
  path.join(common.projectRoot, "yarn-error.log"),
];

for (const dir of temporaryDirs) {
  if (fs.existsSync(dir)) rimraf(dir, () => { });
}

for (const file of temporaryFiles) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
