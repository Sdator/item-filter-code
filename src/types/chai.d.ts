// Augmentations to the Chai type definitions.

// tslint:disable:no-any

import * as Sinon from "sinon";

declare global {
  export namespace Chai {
    export interface Assert {
      // Appended to the global assertion object through sinon.assert.expose().
      notCalled(spy: Sinon.SinonSpy): void;
      called(spy: Sinon.SinonSpy): void;
      calledOnce(spy: Sinon.SinonSpy): void;
      calledTwice(spy: Sinon.SinonSpy): void;
      calledThrice(spy: Sinon.SinonSpy): void;
      callCount(spy: Sinon.SinonSpy, count: number): void;
      callOrder(...spies: Sinon.SinonSpy[]): void;
      calledOn(spyOrSpyCall: Sinon.SinonSpy | Sinon.SinonSpyCall, obj: any): void;
      alwaysCalledOn(spy: Sinon.SinonSpy, obj: any): void;
      calledWith(spyOrSpyCall: Sinon.SinonSpy | Sinon.SinonSpyCall, ...args: any[]): void;
      alwaysCalledWith(spy: Sinon.SinonSpy, ...args: any[]): void;
      neverCalledWith(spy: Sinon.SinonSpy, ...args: any[]): void;
      calledWithExactly(spyOrSpyCall: Sinon.SinonSpy | Sinon.SinonSpyCall, ...args: any[]): void;
      alwaysCalledWithExactly(spy: Sinon.SinonSpy, ...args: any[]): void;
      calledWithMatch(spyOrSpyCall: Sinon.SinonSpy | Sinon.SinonSpyCall, ...args: any[]): void;
      alwaysCalledWithMatch(spy: Sinon.SinonSpy, ...args: any[]): void;
      neverCalledWithMatch(spy: Sinon.SinonSpy, ...args: any[]): void;
      calledWithNew(spyOrSpyCall: Sinon.SinonSpy | Sinon.SinonSpyCall): void;
      threw(spyOrSpyCall: Sinon.SinonSpy | Sinon.SinonSpyCall, exception?: any): void;
      alwaysThrew(spy: Sinon.SinonSpy, exception?: any): void;
      match(actual: any, expected: any): void;
      expose(obj: any, options?: Sinon.SinonExposeOptions): void;
    }
  }
}
