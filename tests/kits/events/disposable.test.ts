/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { Disposable } from "../../../src/kits/events";
import { isDisposable } from "../../../src/type-guards";

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
        // @ts-ignore
        new Disposable(42);
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
      expect(disposable.isDisposed()).toStrictEqual(false);
      disposable.dispose();
      expect(disposable.isDisposed()).toStrictEqual(true);
    });

    test("does not throw when called multiple times", () => {
      expect(() => {
        disposable.dispose();
        expect(disposable.isDisposed()).toStrictEqual(true);
        disposable.dispose();
      }).not.toThrow();
    });
  });

  describe("isDisposed method", () => {
    let disposable: Disposable;

    beforeEach(() => {
      disposable = new Disposable;
    });

    test("exists on the Disposable class", () => {
      expect(disposable.isDisposed).toBeDefined();
      expect(typeof disposable.isDisposed === "function").toStrictEqual(true);
      disposable.dispose();
    });

    test("returns true when the given a newly created Disposable", () => {
      expect(disposable.isDisposed()).toStrictEqual(false);
      disposable.dispose();
    });

    test("returns false when given a disposed Disposable", () => {
      disposable.dispose();
      expect(disposable.isDisposed()).toStrictEqual(true);
      disposable.dispose();
      expect(disposable.isDisposed()).toStrictEqual(true);
    });
  });
});
