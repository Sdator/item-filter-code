/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Each of the other files in this directly act as command-line scripts, with
// this file providing the actual functionality for those scripts. This allows
// us to easily share functionality between each of the scripts.

import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as mkdirp from "mkdirp";
import * as tslint from "tslint";
import * as yaml from "js-yaml";

import rimraf = require("rimraf");

export const rootDir = path.join(__dirname, "..", "..");
const buildDir = path.join(rootDir, "out");

/** Deletes every known temporary file from the project. */
export function clean(): void {
  const temporaryDirs: string[] = [
    buildDir,
    path.join(rootDir, "coverage"),
  ];

  const temporaryFiles: string[] = [
    path.join(rootDir, "yarn-error.log"),
  ];

  for (const dir of temporaryDirs) {
    if (fs.existsSync(dir)) rimraf(dir, () => { });
  }

  for (const file of temporaryFiles) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

interface CoverageConfigFile {
  enabled: boolean;
  relativeSourcePath: string;
  relativeCoverageDir: string;
  ignorePatterns: string[];
  reports: string[];
  verbose: boolean;
}

/** Toggles coverage reporting for our tests on or off. */
export function toggleCoverage(on: boolean): void {
  const outputFile = path.join(buildDir, "coverconfig.json");
  const contents: CoverageConfigFile = {
    enabled: on,
    relativeSourcePath: "../client",
    relativeCoverageDir: "../../coverage",
    ignorePatterns: ["**/node_modules/**"],
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

  if (!fs.existsSync(buildDir)) mkdirp.sync(buildDir);
  fs.writeFileSync(outputFile, JSON.stringify(contents));
}

interface ProcessedDataFormat {
  classesToBases: { [key: string]: string[] };
  basesToClasses: { [key: string]: string };
  classes: string[];
  sortedBases: string[];
  sortedBasesIndices: number[];
}

function loadYAML(relPath: string): object {
  try {
    const fullPath = path.join(rootDir, relPath);
    return yaml.safeLoad(fs.readFileSync(fullPath, "utf8"));
  } catch (e) {
    const newMessage = e && e.message ? `${relPath}: ${e.message}` : `${relPath}: ${e}`;
    throw new Error(newMessage);
  }
}

export function preprocessData(): void {
  let filterData: object;
  let soundData: object;
  let uniqueData: object;
  let suggestionData: object;
  let itemData: { [key: string]: string[] };

  filterData = loadYAML(path.join("data", "filter.yaml"));
  soundData = loadYAML(path.join("data", "sounds.yaml"));
  uniqueData = loadYAML(path.join("data", "uniques.yaml"));
  suggestionData = loadYAML(path.join("data", "suggestions.yaml"));
  itemData = loadYAML(path.join("data", "items.yaml")) as typeof itemData;

  const outputDir = path.join(rootDir, "out");
  mkdirp.sync(outputDir);

  // We don't need to process each of these, only output them to JSON.
  const filterDataContent = JSON.stringify(filterData);
  const filterOutputFile = path.join(outputDir, "filter.json");
  fs.writeFile(filterOutputFile, filterDataContent, err => {
    if (err) throw err;
  });

  const soundDataContent = JSON.stringify(soundData);
  const soundOutputFile = path.join(outputDir, "sounds.json");
  fs.writeFile(soundOutputFile, soundDataContent, err => {
    if (err) throw err;
  });

  const uniqueDataContent = JSON.stringify(uniqueData);
  const uniqueOutputFile = path.join(outputDir, "uniques.json");
  fs.writeFile(uniqueOutputFile, uniqueDataContent, err => {
    if (err) throw err;
  });

  const suggestionDataContent = JSON.stringify(suggestionData);
  const suggestionOutputFile = path.join(outputDir, "suggestions.json");
  fs.writeFile(suggestionOutputFile, suggestionDataContent, err => {
    if (err) throw err;
  });

  // We need to create the following object in memory, then output it to the file:
  //  .classesToBases -- essentially the YAML file's object.
  //  .basesToClasses -- the list of item bases with their associated class.
  //  .classes -- an array containing every class.
  //  .sortedBases -- the item bases sorted by their length first, then alphabetical order.
  //  .sortedBasesIndices -- the indices for each character length within the sortedBases array.
  const itemDataObject: ProcessedDataFormat = {
    classesToBases: itemData,
    basesToClasses: {},
    classes: [],
    sortedBases: [],
    sortedBasesIndices: []
  };

  const itemBases: string[] = [];

  // Fill out basesToClasses as we get the list needed to fill out the last two.
  for (const itemClass in itemData) {
    itemDataObject.classes.push(itemClass);
    const classBases = itemData[itemClass];

    for (const itemBase of classBases) {
      itemBases.push(itemBase);
      itemDataObject.basesToClasses[itemBase] = itemClass;
    }
  }

  itemBases.sort((lha, rha) => {
    if (lha.length > rha.length) {
      return 1;
    } else if (lha.length === rha.length) {
      return lha.localeCompare(rha);
    } else {
      return -1;
    }
  });

  const maxLength = itemBases[itemBases.length - 1].length;

  const indices = [];
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
  const itemDataOutputFile = path.join(outputDir, "items.json");
  fs.writeFile(itemDataOutputFile, itemDataContent, err => {
    if (err) throw err;
  });
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

    for (const failure of failures) {
      const fullPath = failure.getFileName();
      const relPath = path.relative(path.join(__dirname, ".."), fullPath);

      const startPosition = failure.getStartPosition().getLineAndCharacter();
      const startLine = startPosition.line + 1;
      const startColumn = startPosition.character + 1;
      const endPosition = failure.getEndPosition().getLineAndCharacter();
      const endLine = endPosition.line + 1;
      const endColumn = endPosition.character + 1;
      const severity = failure.getRuleSeverity().toUpperCase();
      const message = failure.getFailure().toLowerCase();
      const rule = failure.getRuleName();

      const errorText = `${relPath}@[${startLine},${startColumn},${endLine},${endColumn}] - ` +
        `${severity}: ${message} (${rule})`;
      result += `${errorText}\n`;
    }

    return result;
  }
}

export function lintTypeScript(isCommandLine: boolean): number {
  const tsconfig = path.join(rootDir, "tsconfig.json");
  const content = fs.readFileSync(tsconfig, "utf8");
  const globs = JSON.parse(content).include;

  const program = tslint.Linter.createProgram(tsconfig, rootDir);
  const config = tslint.Configuration.findConfiguration("./tslint.yaml", rootDir).results;
  const options: tslint.ILinterOptions = {
    fix: false,
    formatter: isCommandLine ? "stylish" : PositionFormatter
  };
  const linter = new tslint.Linter(options, program);

  let errorsFound = false;
  for (const g of globs) {
    const files = glob.sync(g);
    for (const file of files) {
      const contents = fs.readFileSync(file, "utf8");
      linter.lint(file, contents, config);
    }
  }

  const lintResult = linter.getResult();
  if (lintResult.errorCount > 0) errorsFound = true;
  if (lintResult.failures.length > 0) {
    console.log(lintResult.output);
  }

  if (errorsFound) {
    return 1;
  } else {
    return 0;
  }
}