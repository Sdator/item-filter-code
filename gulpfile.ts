/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import gulp = require("gulp");
import gulpClean = require("gulp-clean");
import gulpTSLint = require("gulp-tslint");

import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import * as tslint from "tslint";

interface ItemData {
  [itemClass: string]: string[];
}

interface ItemDataOutput {
  classesToBases: { [key: string]: string[] },
  basesToClasses: { [key: string]: string },
  classes: string[],
  sortedBases: string[],
  sortedBasesIndices: number[]
}

/**
 * Formats TSLint output into a format an easier to consume format, which
 * includes both a relative path to a file within this project and the full
 * range of the error within that file.
 *
 * While it looks decent from the CLI, it's primarily intended to be used by a
 * problem matcher within a suitable text editor. The output format is:
 * `file@[startY, startX, endY, endX] - severity: message`
 */
class PositionFormatter extends tslint.Formatters.AbstractFormatter {
  format(failures: tslint.RuleFailure[]): string {
    let result = "";

    let errors = 0;
    let warnings = 0;
    for (const failure of failures) {
      const fullPath = failure.getFileName();
      const relPath = path.relative(__dirname, fullPath);

      const startPosition = failure.getStartPosition().getLineAndCharacter();
      const startLine = startPosition.line + 1;
      const startColumn = startPosition.character + 1;
      const endPosition = failure.getEndPosition().getLineAndCharacter();
      const endLine = endPosition.line + 1;
      const endColumn = endPosition.character + 1;
      const severity = failure.getRuleSeverity().toUpperCase();
      const message = failure.getFailure().toLowerCase();
      const rule = failure.getRuleName();

      if (severity === "ERROR") errors++;
      else if (severity === "WARNING") warnings++;

      const errorText = `${relPath}@[${startLine},${startColumn},${endLine},${endColumn}] - ` +
        `${severity}: ${message} (${rule})`;
      result += `${errorText}\n`;
    }

    const errorText = errors === 1 ? "error" : "errors";
    const warningText = warnings === 1 ? "warning" : "warnings";
    result += `Result: ${errors} ${errorText} and ${warnings} ${warningText}.\n`;

    return result;
  }
}

gulp.task("clean", () => {
  return gulp.src("./dist/**/*", { read: false })
    .pipe(gulpClean());
});

const typeScriptGlobs = [
  "client/**/*.ts",
  "server/**/*.ts",
  "test/**/*.ts",
  "!**/*.d.ts",
];

gulp.task("lint", () => {
  return gulp.src(typeScriptGlobs)
    .pipe(gulpTSLint.default({
      tslint,
      program: tslint.Linter.createProgram("./tsconfig.json", "."),
      configuration: "./tslint.yaml",
      formatter: PositionFormatter,
    }))

    .pipe(gulpTSLint.default.report({
      allowWarnings: true,
      summarizeFailureOutput: false,
      emitError: true,
    }))

    .on("error", () => {
      process.exit(1);
    });
});

gulp.task("data", () => {
  const dataPath = path.join(__dirname, "data");
  let filterData: object;
  let soundData: object;
  let uniqueData: object;
  let itemData: ItemData;
  try {
    let filterDataPath = path.join(dataPath, "filter.yaml");
    filterData = yaml.safeLoad(fs.readFileSync(filterDataPath, "utf8"));

    let soundDataPath = path.join(dataPath, "sounds.yaml");
    soundData = yaml.safeLoad(fs.readFileSync(soundDataPath, "utf8"));

    let uniqueDataPath = path.join(dataPath, "uniques.yaml");
    uniqueData = yaml.safeLoad(fs.readFileSync(uniqueDataPath, "utf8"));

    let itemsPath = path.join(dataPath, "items.yaml");
    itemData = yaml.safeLoad(fs.readFileSync(itemsPath, "utf8"));
  } catch (e) {
    process.exit(1);
  }

  // We don't need to modify or process the filter, sound, and unique data at all,
  // only output both to JSON.
  const filterDataContent = JSON.stringify(filterData);
  const filterOutputFile = path.join(__dirname, "dist", "filter.json");
  fs.writeFile(filterOutputFile, filterDataContent, (err) => {
    if (err) throw err;
  });

  const soundDataContent = JSON.stringify(soundData);
  const soundOutputFile = path.join(__dirname, "dist", "sounds.json");
  fs.writeFile(soundOutputFile, soundDataContent, (err) => {
    if (err) throw err;
  });

  const uniqueDataContent = JSON.stringify(uniqueData);
  const uniqueOutputFile = path.join(__dirname, "dist", "uniques.json");
  fs.writeFile(uniqueOutputFile, uniqueDataContent, (err) => {
    if (err) throw err;
  });

  // We need to create the following object in memory, then output it to the file:
  //  .classesToBases -- essentially the YAML file's object.
  //  .basesToClasses -- the list of item bases with their associated class.
  //  .classes -- an array containing every class.
  //  .sortedBases -- the item bases sorted by their length first, then alphabetical order.
  //  .sortedBasesIndices -- the indices for each character length within the sortedBases array.
  const itemDataObject: ItemDataOutput = {
    classesToBases: itemData,
    basesToClasses: {},
    classes: [],
    sortedBases: [],
    sortedBasesIndices: []
  };

  let itemBases: string[] = [];

  // Fill out basesToClasses as we get the list needed to fill out the last two.
  for (const itemClass in itemData) {
    itemDataObject.classes.push(itemClass);
    const classBases = itemData[itemClass];

    for (const itemBase of classBases) {
      itemBases.push(itemBase);
      itemDataObject.basesToClasses[itemBase] = itemClass;
    }
  }

  itemBases.sort((lha: string, rha: string) => {
    if (lha.length > rha.length) {
      return 1;
    } else if (lha.length === rha.length) {
      return lha.localeCompare(rha);
    } else {
      return -1;
    }
  });

  const minLength = itemBases[0].length;
  const maxLength = itemBases[itemBases.length - 1].length;

  let indices: number[] = [];
  let currentIndex = 0;
  let currentLength = 1;
  while (currentLength <= maxLength) {
    const base = itemBases[currentIndex];
    if (currentLength <= base.length) {
      indices.push(currentIndex);
      currentLength++;
    } else {
      currentIndex++;
    }
  }

  itemDataObject.sortedBasesIndices = indices;
  itemDataObject.sortedBases = itemBases;

  const itemDataContent = JSON.stringify(itemDataObject);
  const itemDataOutputFile = path.join(__dirname, "dist", "items.json");
  fs.writeFile(itemDataOutputFile, itemDataContent, (err) => {
    if (err) throw err;
  });
});
