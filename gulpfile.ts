/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import gulp = require("gulp");
import gulpClean = require("gulp-clean");
import gulpTSLint = require("gulp-tslint");
import * as path from "path";
import * as tslint from "tslint";

gulp.task("clean", () => {
  return gulp.src("./dist/**/*", { read: false })
    .pipe(gulpClean());
});

const typeScriptGlobs = [
  "src/core/**/*.ts",
  "src/client/**/*.ts",
  "src/server/**/*.ts",
  "test/**/*.ts",
  "!**/*.d.ts",
];

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

gulp.task("lint", () => {
  return gulp.src(typeScriptGlobs)
    .pipe(gulpTSLint.default({
      tslint,
      program: tslint.Linter.createProgram("./src/tsconfig.json", "./src"),
      configuration: "./tslint.json",
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
