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
  let data: ItemData;
  try {
    let configPath = path.join(__dirname, "data", "items.yaml");
    data = yaml.safeLoad(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    process.exit(1);
  }

  // The first half of the file consists of two structures: one mapping item
  // classes to an array of item bases and another mapping each item base to
  // its item class.
  let itemBases: string[] = [];
  // @ts-ignore
  const entries = Object.entries(data);

  let contents: string = `{\n\t"classesToBases": {\n`;
  let basesToClasses = "";
  for (let i = 0; i < entries.length; i++) {
    let [itemClass, classBases]: [string, string[]] = entries[i];
    contents += `\t\t"${itemClass}": [\n`;

    for (let j = 0; j < classBases.length; j++) {
      const itemBase = classBases[j];
      itemBases.push(itemBase);

      if (j === classBases.length - 1) {
        contents += `\t\t\t"${itemBase}"\n`
      } else {
        contents += `\t\t\t"${itemBase}",\n`
      }

      if (i === entries.length - 1 && j == classBases.length - 1) {
        basesToClasses += `\t\t"${itemBase}": "${itemClass}"\n`;
      } else {
        basesToClasses += `\t\t"${itemBase}": "${itemClass}",\n`;
      }
    }

    if (i === entries.length - 1) {
      contents += `\t\t]\n`;
    } else {
      contents += `\t\t],\n`;
    }
  }

  contents += `\t},\n\t"basesToClasses": {\n${basesToClasses}\t},\n`;

  // The second part of the file is simply an array of the item bases sorted by
  // length. This part consists of two things: a list of item bases sorted by
  // their length and then a mapping between each length and the starting index
  // for that length within the sorted array.
  itemBases.sort((lha: string, rha: string) => {
    if (lha.length > rha.length) {
      return 1;
    } else if (lha.length === rha.length) {
      return lha.localeCompare(rha);
    } else {
      return -1;
    }
  });

  const baseCount = itemBases.length;
  const minLength = itemBases[0].length;
  const maxLength = itemBases[itemBases.length - 1].length;

  let indices: number[] = [];
  let currentIndex = 0;
  let currentLength = minLength;
  while (currentLength <= maxLength) {
    const base = itemBases[currentIndex];
    if (currentLength <= base.length) {
      indices.push(currentIndex);
      currentLength++;
    } else {
      currentIndex++;
    }
  }

  contents += `\t"sortedBases": [\n\t\t`
  for (let i = 0; i < itemBases.length; i++) {
    const base = itemBases[i];

    if (i === itemBases.length - 1) {
      contents += `"${base}"\n\t],\n`;
    } else {
      contents += `"${base}",\n\t\t`
    }
  }

  contents += `\t"sortedBasesIndices": [\n\t\t`;
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];

    if (i === indices.length - 1) {
      contents += `${index}\n\t]\n`;
    } else {
      contents += `${index},\n\t\t`;
    }
  }
  contents += "}";

  const outFile = path.join(__dirname, "dist", "items.json");
  fs.writeFile(outFile, contents, (err) => {
    if (err) throw err;
  });
});
