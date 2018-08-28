/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as path from "path";

import { dataOutputRoot } from "../common";
import { TestRunnerOptions } from "../test/types";

/** Toggles coverage reporting for our tests on or off. */
export function toggleCoverage(enabled: boolean): void {
  const outputFile = path.join(dataOutputRoot, "coverconfig.json");
  const contents: TestRunnerOptions = {
    enabled,
    relativeSourcePath: "../",
    relativeCoverageDir: "../../coverage",
    ignorePatterns: ["**/node_modules/**", "lint/**", "tasks/**", "test/**"],
    reports: [
      "text-summary",
      "json-summary",
      "json",
      "html",
      "lcov",
      "lcovonly"
    ],
    verbose: false
  };

  if (!fs.existsSync(dataOutputRoot)) mkdirp.sync(dataOutputRoot);
  fs.writeFileSync(outputFile, JSON.stringify(contents));
}

if (process.argv.length !== 3) {
  // tslint:disable-next-line:no-console
  console.log("Error: invalid usage of the coverage script.");
  process.exit(1);
}

const argument = process.argv[2];
if (argument !== "on" && argument !== "off") {
  // tslint:disable-next-line:no-console
  console.log("Error: invalid value passed to coverage script.");
  process.exit(1);
}

toggleCoverage(argument === "on" ? true : false);
