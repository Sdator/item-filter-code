import * as chai from "chai";
global.assert = chai.assert;

import * as glob from "glob";
import * as Mocha from "mocha";
import * as path from "path";
import { MochaSetupOptions } from "vscode/lib/testrunner";

import { isError } from "../common";

type TestCallback = (error?: Error, failures?: number) => void;

// tslint:disable-next-line:no-any
let mocha = new Mocha(<any>{
  ui: "tdd",
  useColors: true
});

export function configure(mochaOpts: MochaSetupOptions): void {
  mocha = new Mocha(mochaOpts);
}

export function run(testsRoot: string, callback: TestCallback): void {
  glob("**/**.test.js", { cwd: testsRoot }, (error, files) => {
    if (error) {
      callback(error);
      return;
    }

    try {
      files.forEach(file => mocha.addFile(path.join(testsRoot, file)));
      mocha.run(failures => callback(undefined, failures));
    } catch (error) {
      if (isError(error)) callback(error);
      return;
    }
  });
}
