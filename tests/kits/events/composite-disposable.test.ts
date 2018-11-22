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

    test("optionally takes multiple disposables as parameters", () => {
      const c = new CompositeDisposable(d1, d2);
      expect(c.isDisposed()).toStrictEqual(false);
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(d2.isDisposed()).toStrictEqual(false);
      c.dispose();
      expect(c.isDisposed()).toStrictEqual(true);
      expect(d1.isDisposed()).toStrictEqual(true);
      expect(d2.isDisposed()).toStrictEqual(true);
    });
  });

  describe("disposed computed property", () => {
    test("exists on the Disposable class", () => {
      expect(composite.disposed).toBeDefined();
    });

    test("is a boolean", () => {
      expect(typeof composite.disposed === "boolean").toStrictEqual(true);
    });

    test("throws when set", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        (<any>composite).disposed = true;
      }).toThrow();
    });
  });

  describe("size computed property", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.size).toBeDefined();
      composite.dispose();
    });

    test("returns 0 on an empty CompositeDisposable", () => {
      expect(composite.size).toStrictEqual(0);
    });

    test("correctly returns the length as the CompositeDisposable changes", () => {
      expect(composite.size).toStrictEqual(0);
      composite.add(d1, d2);
      expect(composite.size).toStrictEqual(2);
      composite.remove(d2);
      expect(composite.size).toStrictEqual(1);
      composite.clear();
      expect(composite.size).toStrictEqual(0);
    });
  });

  describe("dispose method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.dispose).toBeDefined();
      expect(typeof composite.dispose === "function").toStrictEqual(true);
      composite.dispose();
    });

    test("disposes of the CompositeDisposable when called", () => {
      expect(composite.isDisposed()).toStrictEqual(false);
      composite.dispose();
      expect(composite.isDisposed()).toStrictEqual(true);
    });

    test("does not throw when called multiple times", () => {
      expect(() => {
        composite.dispose();
        expect(composite.isDisposed()).toStrictEqual(true);
        composite.dispose();
      }).not.toThrow();
    });
  });

  describe("isDisposed method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.isDisposed).toBeDefined();
      expect(typeof composite.isDisposed === "function").toStrictEqual(true);
      composite.dispose();
    });

    test("returns true when the given a newly created CompositeDisposable", () => {
      expect(composite.isDisposed()).toStrictEqual(false);
      composite.dispose();
    });

    test("returns false when given a disposed CompositeDisposable", () => {
      composite.dispose();
      expect(composite.isDisposed()).toStrictEqual(true);
      composite.dispose();
      expect(composite.isDisposed()).toStrictEqual(true);
    });
  });

  describe("add method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.add).toBeDefined();
      expect(typeof composite.add === "function").toStrictEqual(true);
      composite.dispose();
    });

    test("supports adding a single Disposable", () => {
      composite.add(d1);
      expect(d1.isDisposed()).toStrictEqual(false);
      composite.dispose();
      expect(d1.isDisposed()).toStrictEqual(true);
    });

    test("supports adding multiple Disposables", () => {
      composite.add(d1, d2);
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(d2.isDisposed()).toStrictEqual(false);
      composite.dispose();
      expect(d1.isDisposed()).toStrictEqual(true);
      expect(d2.isDisposed()).toStrictEqual(true);
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

    test("does not throw if given no Disposables", () => {
      expect(() => {
        composite.add();
        composite.dispose();
      }).not.toThrow();
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

  describe("remove method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.remove).toBeDefined();
      expect(typeof composite.remove === "function").toStrictEqual(true);
      composite.dispose();
    });

    test("removes a previously added disposable from a composite", () => {
      composite.add(d1, d2);
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(d2.isDisposed()).toStrictEqual(false);
      composite.remove(d1);
      expect(composite.size).toStrictEqual(1);
      composite.dispose();
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(d2.isDisposed()).toStrictEqual(true);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        composite.dispose();
        composite.remove(d1);
      }).toThrow();
    });
  });

  describe("clear method", () => {
    test("exists on the CompositeDisposable class", () => {
      expect(composite.clear).toBeDefined();
      expect(typeof composite.clear === "function").toStrictEqual(true);
      composite.dispose();
    });

    test("clears any previously added disposables", () => {
      composite.add(d1, d2);
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(composite.size).toStrictEqual(2);
      composite.clear();
      expect(composite.size).toStrictEqual(0);
      composite.dispose();
      expect(d1.isDisposed()).toStrictEqual(false);
    });

    test("does not dispose of any cleared disposables", () => {
      composite.add(d1, d2);
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(d2.isDisposed()).toStrictEqual(false);
      composite.clear();
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(d2.isDisposed()).toStrictEqual(false);
      composite.dispose();
      expect(d1.isDisposed()).toStrictEqual(false);
      expect(d2.isDisposed()).toStrictEqual(false);
    });

    test("does not dispose of the CompositeDisposable instance", () => {
      composite.add(d1);
      composite.clear();
      expect(composite.isDisposed()).toStrictEqual(false);
      composite.dispose();
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        composite.dispose();
        composite.clear();
      }).toThrow();
    });
  });
});
