/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as _ from "lodash";
import * as chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";

import * as lib from "./index";
import { projectRoot } from "../common";

/** Preprocesses all data files each time there is a change. */
function watchData() {
  const dataGlobs = [
    "data/**/*.yaml",
  ];

  const capture = () => {
    console.log("Data Pulse Start\n");
    try {
      lib.preprocessData();
    } catch (e) {
      if (e && e.message) {
        console.log(e.message);
      } else {
        console.log(e);
      }
    }
    console.log("Data Pulse End\n");
  };

  const dataWatcher = chokidar.watch(dataGlobs);
  const dataUpdater = _.debounce(capture, 100);

  dataWatcher.on("change", () => {
    dataUpdater();
  });

  dataWatcher.on("add", () => {
    dataUpdater();
  });

  dataWatcher.on("unlink", () => {
    console.log("Error: data removed while the watcher was active.");
    process.exit(1);
  });
}

/** Lints all TypeScript files on a change. */
function watchTypeScript() {
  const tsconfig = path.join(projectRoot, "tsconfig.json");
  const content = fs.readFileSync(tsconfig, "utf8");
  const globs = JSON.parse(content).include;

  const capture = () => {
    console.log("TSLint Pulse Start\n");
    lib.lintTypeScript(false);
    console.log("TSLint Pulse End\n");
  };

  const tsWatcher = chokidar.watch(globs);
  const tsUpdater = _.debounce(capture, 100);

  tsWatcher.on("change", () => {
    tsUpdater();
  });

  tsWatcher.on("add", () => {
    tsUpdater();
  });

  tsWatcher.on("unlink", () => {
    tsUpdater();
  });
}

watchData();
watchTypeScript();
