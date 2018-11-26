/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import "jest-extended";
import { isDisposable, Disposable } from "../../../src/kits/events";

describe("Disposable", () => {
  describe("constructor", () => {
    test("it returns a disposable", () => {
      const d = new Disposable(() => { });
      expect(isDisposable(d)).toBeTrue();
      d.dispose();
    });

    test("it optionally takes an action", () => {
      expect(() => {
        const d = new Disposable(() => { });
        d.dispose();
      }).not.toThrow();
    });

    test("invokes the action when ::dispose() is called", () => {
      const action = jest.fn();
      const d = new Disposable(action);
      d.dispose();
      expect(action).toBeCalledTimes(1);
    });

    test("only invokes that action on the first call to ::dispose()", () => {
      const action = jest.fn();
      const d = new Disposable(action);
      d.dispose();
      expect(action).toBeCalledTimes(1);
      d.dispose();
      expect(action).toBeCalledTimes(1);
    });
  });

  describe("disposed property", () => {
    let disposable: Disposable;

    beforeEach(() => {
      disposable = new Disposable;
    });

    afterEach(() => {
      disposable.dispose();
    });

    test("is initially set to false", () => {
      expect(disposable.disposed).toBeFalse();
    });

    test("is set to true whenever dispose() is called", () => {
      disposable.dispose();
      expect(disposable.disposed).toBeTrue();
    });

    test("throws when set", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        (<any>disposable).disposed = true;
      }).toThrow();
    });
  });

  describe("dispose method", () => {
    let disposable: Disposable;

    beforeEach(() => {
      disposable = new Disposable;
    });

    test("disposes of the Disposable when called", () => {
      expect(disposable.disposed).toBeFalse();
      disposable.dispose();
      expect(disposable.disposed).toBeTrue();
    });

    test("does not throw when called multiple times", () => {
      expect(() => {
        disposable.dispose();
        expect(disposable.disposed).toBeTrue();
        disposable.dispose();
      }).not.toThrow();
    });
  });
});
