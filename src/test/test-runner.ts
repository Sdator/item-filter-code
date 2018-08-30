// This file is originally from the following repository:
//  https://github.com/DonJayamanne/pythonVSCode

// tslint:disable:no-any no-unsafe-any no-console

import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";
chai.use(chaiAsPromised);
chai.use(sinonChai);
sinon.assert.expose(chai.assert, { prefix: "" });
global.assert = chai.assert;

import * as fs from "fs-extra";
import * as glob from "glob";
import * as istanbul from "istanbul";
import * as Mocha from "mocha";
import * as path from "path";
import { MochaSetupOptions } from "vscode/lib/testrunner";
const remapIstanbul = require("remap-istanbul");

import { TestRunnerOptions } from "./types";

interface CoverState {
  path: string;
  s: { [key: string]: any };
  b: {};
  f: {};
  fnMap: {};
  statementMap: {};
  branchMap: {};
}

type Instrumenter = istanbul.Instrumenter & { coverState: CoverState };
type TestCallback = (error?: Error, failures?: number) => void;

// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY.
// Since we are not running in a tty environment, we just implement the method statically.
const tty = require("tty");
if (!tty.getWindowSize) {
  tty.getWindowSize = (): number[] => [80, 75];
}

let mocha = new Mocha(<any>{
  ui: "tdd",
  useColors: true
});

let coverageOptions: { coverageConfig: string } | undefined;

class CoverageRunner {
  private readonly _coverageVar = `$$cov_${new Date().getTime()}$$`;
  private _sourceFiles: string[] = [];
  // @ts-ignore
  private _instrumenter: Instrumenter;

  private get _coverage(): { [key: string]: CoverState } {
    const coverageVar: any = global[this._coverageVar];
    if (coverageVar === undefined || Object.keys(coverageVar).length === 0) {
      console.error("No coverage information was collected, exit without writing" +
        " coverage information");
      return {};
    } else {
      return coverageVar;
    }
  }
  private set _coverage(value: { [key: string]: CoverState }) {
    global[this._coverageVar] = value;
  }

  constructor(private readonly options: TestRunnerOptions, private readonly testsRoot:
    string, endRunCallback: TestCallback) {

    if (!options.relativeSourcePath) {
      endRunCallback(new Error("Error - relativeSourcePath must be defined for" +
        " code coverage to work"));
    }
  }

  /**
   * Information on hooking up code coverage can be found here:
   * http://tannguyen.org/2017/04/gulp-mocha-and-istanbul/
   * http://gotwarlost.github.io/istanbul/public/apidocs/classes/HookOptions.html
   */
  setupCoverage(): void {
    const reportingDir = path.join(this.testsRoot, this.options.relativeCoverageDir);
    fs.emptyDirSync(reportingDir);

    // Set up Code Coverage, hooking require so that instrumented code is returned.
    this._instrumenter = new istanbul.Instrumenter({
      coverageVariable: this._coverageVar
    }) as Instrumenter;
    const sourceRoot = path.join(this.testsRoot, this.options.relativeSourcePath);

    // Glob source files
    const srcFiles = glob.sync("**/**.js", {
      ignore: this.options.ignorePatterns,
      cwd: sourceRoot
    });

    // Create a match function - taken from the run-with-cover.js in istanbul.
    const decache = require("decache");
    const fileMap = new Set<string>();

    srcFiles.map(file => path.join(sourceRoot, file))
      .forEach(fullPath => {
        fileMap.add(fullPath);

        // On Windows, extension is loaded pre-test hooks and this mean we lose
        // our chance to hook the Require call. In order to instrument the code
        // we have to decache the JS file so on next load it gets instrumented.
        // This doesn't impact tests, but is a concern if we had some integration
        // tests that relied on VSCode accessing our module since there could be
        // some shared global state that we lose.
        decache(fullPath);
      });

    const matchFn = (file: string) => fileMap.has(file);
    this._sourceFiles = Array.from(fileMap.keys());

    // http://gotwarlost.github.io/istanbul/public/apidocs/classes/Hook.html#method_hookRequire.
    // Hook up to the Require function so that when this is called, if any of our source files
    // are required, the instrumented version is pulled in instead. These instrumented versions
    // write to a global coverage variable with hit counts whenever they are accessed.
    const transformer = this._instrumenter.instrumentSync.bind(this._instrumenter);
    const hookOpts = { verbose: false, extensions: [".js"] };
    (<any>istanbul.hook).hookRequire(matchFn, transformer, hookOpts);

    // Initialize the global variable to store instrumentation details.
    // http://gotwarlost.github.io/istanbul/public/apidocs/classes/Instrumenter.html.
    this._coverage = {};

    // Hook the process exit event to handle reporting,
    // Only report coverage if the process is exiting successfully.
    process.on("exit", () => this.reportCoverage());
  }

  /**
   * Writes a coverage report. Note that as this is called in the process exit callback,
   * all calls must be synchronous.
   */
  reportCoverage(): void {
    (<any>istanbul.hook).unhookRequire();
    const coverage = this._coverage;

    // Files that are not touched by code ran by the test runner is manually instrumented, to
    // illustrate the missing coverage.
    this._sourceFiles.filter(file => !coverage[file])
      .forEach(file => {
        this._instrumenter.instrumentSync(fs.readFileSync(file, "utf-8"), file);

        // When instrumenting the code, istanbul will give each FunctionDeclaration a
        // value of 1 in coverState.s, presumably to compensate for function hoisting.
        // We need to reset this, as the function was not hoisted, as it was never loaded.
        Object.keys(this._instrumenter.coverState.s).forEach(key =>
          this._instrumenter.coverState.s[key] = 0);

        coverage[file] = this._instrumenter.coverState;
      });

    const reportingDir = path.join(this.testsRoot, this.options.relativeCoverageDir);
    const coverageFile = path.join(reportingDir, "coverage.json");

    fs.mkdirsSync(reportingDir);
    fs.writeFileSync(coverageFile, JSON.stringify(coverage), "utf8");

    const remappedCollector: istanbul.Collector = remapIstanbul.remap(coverage, {
      warn: (warning: any) => {
        // We expect some warnings as any JS file without a typescript mapping will cause this.
        // By default, we'll skip printing these to the console as it clutters it up.
        if (this.options.verbose) {
          console.warn(warning);
        }
      }
    });

    const reporter = new istanbul.Reporter(undefined, reportingDir);
    const reportTypes = Array.isArray(this.options.reports) ? this.options.reports : ["lcov"];
    reporter.addAll(reportTypes);
    reporter.write(remappedCollector, true, () => {
      console.log(`reports written to ${reportingDir}`);
    });
  }
}

export function configure(mochaOpts: MochaSetupOptions, coverageOpts?:
  { coverageConfig: string }): void {

  mocha = new Mocha(mochaOpts as Mocha.MochaOptions);
  coverageOptions = coverageOpts;
}

export function run(testsRoot: string, callback: TestCallback): void {
  // Enable source map support.
  require("source-map-support").install();

  // Check whether code coverage is enabled.
  const options = getCoverageOptions(testsRoot);
  if (options && options.enabled) {
    // Setup coverage pre-test, including post-test hook to report.
    const coverageRunner = new CoverageRunner(options, testsRoot, callback);
    coverageRunner.setupCoverage();
  }

  // Run the tests.
  glob("**/**.test.js", { cwd: testsRoot }, (error, files) => {
    if (error) {
      callback(error);
      return;
    }

    try {
      files.forEach(file => mocha.addFile(path.join(testsRoot, file)));
      mocha.run(failures => callback(undefined, failures));
    } catch (error) {
      callback(error);
      return;
    }
  });
}

function getCoverageOptions(testsRoot: string): TestRunnerOptions | undefined {
  if (!coverageOptions) {
    return undefined;
  }

  const coverConfigPath = coverageOptions.coverageConfig;
  return fs.existsSync(coverConfigPath) ? JSON.parse(fs.readFileSync(coverConfigPath,
    "utf8")) : undefined;
}