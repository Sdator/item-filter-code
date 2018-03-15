/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { toggleCoverage } from "./index";

if (process.argv.length !== 3) {
  console.log("Error: invalid usage of the coverage script.");
  process.exit(1);
}

const argument = process.argv[2];
if (argument !== "on" && argument !== "off") {
  console.log("Error: invalid value passed to coverage script.");
  process.exit(1);
}

toggleCoverage(argument === "on" ? true : false);
