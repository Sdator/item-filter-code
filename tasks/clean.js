/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

const projectRoot = path.join(__dirname, '..');
const outputRoot = path.join(projectRoot, 'out');

const temporaryDirs = [
  outputRoot,
];

const temporaryFiles = [
  path.join(projectRoot, 'yarn-error.log'),
];

for (const dir of temporaryDirs) {
  if (fs.existsSync(dir)) rimraf(dir, () => { });
}

for (const file of temporaryFiles) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
