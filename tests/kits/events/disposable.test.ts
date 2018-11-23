/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { isDisposable, Disposable } from "../../../src/kits/events";

describe("Disposable", () => {
  describe("constructor", () => {
    test("it returns a disposable", () => {
      const d = new Disposable(() => {});
      expect(isDisposable(d)).toStrictEqual(true);
      d.dispose();
    });

    test("it optionally takes an action", () => {
      expect(() => {
        const d = new Disposable(() => {});
        d.dispose();
      }).not.toThrow();
    });

    test("throws if that action isn't a function", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        (<any>new Disposable)(42);
      }).toThrow();
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

    test("exists on the Disposable class", () => {
      expect(disposable.disposed).toBeDefined();
    });

    test("is a boolean", () => {
      expect(typeof disposable.disposed === "boolean").toStrictEqual(true);
    });

    test("is initially set to false", () => {
      expect(disposable.disposed).toStrictEqual(false);
    });

    test("is set to true whenever dispose() is called", () => {
      disposable.dispose();
      expect(disposable.disposed).toStrictEqual(true);
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

    test("exists on the Disposable class", () => {
      expect(disposable.dispose).toBeDefined();
      expect(typeof disposable.dispose === "function").toStrictEqual(true);
      disposable.dispose();
    });

    test("disposes of the Disposable when called", () => {
      expect(disposable.disposed).toStrictEqual(false);
      disposable.dispose();
      expect(disposable.disposed).toStrictEqual(true);
    });

    test("does not throw when called multiple times", () => {
      expect(() => {
        disposable.dispose();
        expect(disposable.disposed).toStrictEqual(true);
        disposable.dispose();
      }).not.toThrow();
    });
  });
});
