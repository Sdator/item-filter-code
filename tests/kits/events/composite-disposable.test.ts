/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { isDisposable, CompositeDisposable, Disposable } from "../../../src/kits/events";

describe("CompositeDisposable", () => {
  let d1: Disposable;
  let d2: Disposable;
  let composite: CompositeDisposable;

  beforeEach(() => {
    d1 = new Disposable;
    d2 = new Disposable;
    composite = new CompositeDisposable;
  });

  afterEach(() => {
    d1.dispose();
    d2.dispose();
    composite.dispose();
  });

  describe("constructor", () => {
    test("does not require any parameters", () => {
      expect(isDisposable(composite)).toStrictEqual(true);
      composite.dispose();
    });

    test("optionally takes a single disposable as a parameter", () => {
      const c = new CompositeDisposable(d1);
      expect(c.disposed).toStrictEqual(false);
      expect(d1.disposed).toStrictEqual(false);
      c.dispose();
      expect(c.disposed).toStrictEqual(true);
      expect(d1.disposed).toStrictEqual(true);
    });

    test("optionally takes multiple disposables as parameters", () => {
      const c = new CompositeDisposable([d1, d2]);
      expect(c.disposed).toStrictEqual(false);
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
      c.dispose();
      expect(c.disposed).toStrictEqual(true);
      expect(d1.disposed).toStrictEqual(true);
      expect(d2.disposed).toStrictEqual(true);
    });
  });

  describe("disposed property", () => {
    test("exists on the Disposable class", () => {
      expect(composite.disposed).toBeDefined();
    });

    test("is a boolean", () => {
      expect(typeof composite.disposed === "boolean").toStrictEqual(true);
    });

    test("is initially set to false", () => {
      expect(composite.disposed).toStrictEqual(false);
    });

    test("is set to true whenever dispose() is called", () => {
      composite.dispose();
      expect(composite.disposed).toStrictEqual(true);
    });

    test("throws when set", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        (<any>composite).disposed = true;
      }).toThrow();
    });
  });

  describe("size property", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.size).toBeDefined();
    });

    test("returns 0 on an empty CompositeDisposable", () => {
      expect(composite.size).toStrictEqual(0);
    });

    test("correctly returns the length as the CompositeDisposable changes", () => {
      expect(composite.size).toStrictEqual(0);
      composite.add([d1, d2]);
      expect(composite.size).toStrictEqual(2);
      composite.delete(d2);
      expect(composite.size).toStrictEqual(1);
      composite.clear();
      expect(composite.size).toStrictEqual(0);
    });
  });

  describe("dispose method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.dispose).toBeDefined();
      expect(typeof composite.dispose === "function").toStrictEqual(true);
    });

    test("disposes of the CompositeDisposable when called", () => {
      expect(composite.disposed).toStrictEqual(false);
      composite.dispose();
      expect(composite.disposed).toStrictEqual(true);
    });

    test("does not throw when called multiple times", () => {
      expect(() => {
        composite.dispose();
        expect(composite.disposed).toStrictEqual(true);
        composite.dispose();
      }).not.toThrow();
    });
  });

  describe("add method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.add).toBeDefined();
      expect(typeof composite.add === "function").toStrictEqual(true);
    });

    test("supports adding a single Disposable", () => {
      composite.add(d1);
      expect(d1.disposed).toStrictEqual(false);
      composite.dispose();
      expect(d1.disposed).toStrictEqual(true);
    });

    test("supports adding multiple Disposables", () => {
      composite.add([d1, d2]);
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
      composite.dispose();
      expect(d1.disposed).toStrictEqual(true);
      expect(d2.disposed).toStrictEqual(true);
    });

    test("supports objects implementing IDisposable", () => {
      const disposable = {
        dispose: jest.fn()
      };

      composite.add(disposable);
      expect(disposable.dispose).not.toBeCalled();
      composite.dispose();
      expect(disposable.dispose).toBeCalledTimes(1);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        composite.dispose();
        composite.add(d1);
      }).toThrow();
    });

    test("does not throw if given a disposed Disposable", () => {
      expect(() => {
        d1.dispose();
        composite.add(d1);
        composite.dispose();
      }).not.toThrow();
    });

    test("throws if given a non-disposable object", () => {
      expect(() => {
        // tslint:disable-next-line:no-any no-unsafe-any
        (<any>composite).add({});
      }).toThrow();
    });
  });

  describe("clear method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.clear).toBeDefined();
      expect(typeof composite.clear === "function").toStrictEqual(true);
    });

    test("clears any previously added disposables", () => {
      composite.add([d1, d2]);
      expect(d1.disposed).toStrictEqual(false);
      expect(composite.size).toStrictEqual(2);
      composite.clear();
      expect(composite.size).toStrictEqual(0);
      composite.dispose();
      expect(d1.disposed).toStrictEqual(false);
    });

    test("does not dispose of any cleared disposables", () => {
      composite.add([d1, d2]);
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
      composite.clear();
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
      composite.dispose();
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
    });

    test("does not dispose of the CompositeDisposable instance", () => {
      composite.add(d1);
      composite.clear();
      expect(composite.disposed).toStrictEqual(false);
      composite.dispose();
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        composite.dispose();
        composite.clear();
      }).toThrow();
    });
  });

  describe("delete method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.delete).toBeDefined();
      expect(typeof composite.delete === "function").toStrictEqual(true);
    });

    test("removes a previously added disposable from a composite", () => {
      composite.add([d1, d2]);
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
      composite.delete(d1);
      expect(composite.size).toStrictEqual(1);
      composite.dispose();
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(true);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        composite.dispose();
        composite.delete(d1);
      }).toThrow();
    });
  });

  describe("has method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.has).toBeDefined();
      expect(typeof composite.has === "function").toStrictEqual(true);
    });

    test("returns true if the disposable has been added", () => {
      composite.add(d1);
      expect(composite.has(d1)).toStrictEqual(true);
    });

    test("returns false if the disposable hasn't been added", () => {
      expect(composite.has(d1)).toStrictEqual(false);
    });

    test("works correctly on composites containing multiple disposables", () => {
      const d3 = new Disposable;
      composite.add([d1, d2]);
      expect(composite.has(d1)).toStrictEqual(true);
      expect(composite.has(d2)).toStrictEqual(true);
      expect(composite.has(d3)).toStrictEqual(false);
      d3.dispose();
    });

    test("returns true even if the disposable has been disposed", () => {
      composite.add(d1);
      d1.dispose();
      expect(composite.has(d1)).toStrictEqual(true);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        composite.dispose();
        composite.has(d1);
      }).toThrow();
    });
  });
});
