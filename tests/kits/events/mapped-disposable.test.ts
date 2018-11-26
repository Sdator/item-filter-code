/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as events from "../../../src/kits/events";

describe("MappedDisposable", () => {
  let d1: events.Disposable;
  let d2: events.Disposable;
  let composite: events.CompositeDisposable;
  let collection: events.MappedDisposable;

  beforeEach(() => {
    d1 = new events.Disposable;
    d2 = new events.Disposable;
    composite = new events.CompositeDisposable;
    collection = new events.MappedDisposable;
  });

  afterEach(() => {
    d1.dispose();
    d2.dispose();
    composite.dispose();
    collection.dispose();
  });

  describe("constructor", () => {
    test("returns a disposable", () => {
      expect(events.isDisposable(collection)).toBeTrue();
    });

    test("does not require any parameters", () => {
      expect(collection.size).toStrictEqual(0);
    });

    test("optionally takes a disposable mapping as a parameter", () => {
      const c = new events.MappedDisposable({
        d1
      });
      expect(c.size).toStrictEqual(1);
      c.dispose();
    });

    test("that disposable mapping potentially containing many values", () => {
      const c = new events.MappedDisposable({
        d1,
        d2
      });
      expect(c.size).toStrictEqual(2);
      c.dispose();
    });

    test("supports a key whose value is an array of disposables", () => {
      const c = new events.MappedDisposable({
        "test": [d1, d2]
      });
      expect(c.size).toStrictEqual(1);
      const arr = c.get("test") as events.Disposable[];
      expect(arr).toBeDefined();
      expect(arr.length).toStrictEqual(2);
      c.dispose();
    });
  });

  describe("size property", () => {
    test("returns 0 on an empty MappedDisposable", () => {
      expect(collection.size).toStrictEqual(0);
    });

    test("correctly returns the number of composite mappings", () => {
      const c = new events.MappedDisposable({
        composite,
        d2
      });
      expect(c.size).toStrictEqual(2);
      c.dispose();
    });

    test("doesn't recursively total its composite mappings", () => {
      composite.add(d1);
      const c = new events.MappedDisposable({
        composite,
        d2
      });
      expect(c.size).toStrictEqual(2);
      c.dispose();
    });

    test("correctly handles multiple collection changes", () => {
      expect(collection.size).toStrictEqual(0);
      collection.set({
        "test1": composite,
        "test2": d1
      });
      expect(collection.size).toStrictEqual(2);
      collection.set({ "test3": d2 });
      expect(collection.size).toStrictEqual(3);
      collection.delete("test1");
      expect(collection.size).toStrictEqual(2);
      collection.clear();
      expect(collection.size).toStrictEqual(0);
    });
  });

  describe("disposed property", () => {
    test("is initially set to false", () => {
      expect(collection.disposed).toBeFalse();
    });

    test("is set to true whenever dispose() is called", () => {
      collection.dispose();
      expect(collection.disposed).toBeTrue();
    });

    test("throws when set", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        (<any>collection).disposed = true;
      }).toThrow();
    });
  });

  describe("dispose method", () => {
    test("disposes of the MappedDisposable when called with no arguments", () => {
      expect(collection.disposed).toBeFalse();
      collection.dispose();
      expect(collection.disposed).toBeTrue();
    });

    test("disposes of a specific key:disposable pairing when called with a string", () => {
      collection.add({ "test": composite });
      expect(composite.disposed).toBeFalse();
      expect(collection.disposed).toBeFalse();
      collection.dispose("test");
      expect(composite.disposed).toBeTrue();
      expect(collection.disposed).toBeFalse();
    });

    test("disposes of each key's value when called with multiple strings", () => {
      collection.add({
        d1,
        d2,
        composite
      });

      expect(collection.disposed).toBeFalse();
      expect(d1.disposed).toBeFalse();
      expect(d2.disposed).toBeFalse();
      expect(composite.disposed).toBeFalse();

      collection.dispose(["d1", "d2"]);

      expect(collection.disposed).toBeFalse();
      expect(d1.disposed).toBeTrue();
      expect(d2.disposed).toBeTrue();
      expect(composite.disposed).toBeFalse();
    });

    test("does not throw when called multiple times", () => {
      expect(() => {
        collection.dispose();
        collection.dispose();
      }).not.toThrow();
    });

    test("throws when called with an unknown key", () => {
      expect(() => {
        collection.dispose("test2");
      }).toThrow();
    });
  });

  describe("add method", () => {
    test("takes a key:disposable pairing as a parameter", () => {
      expect(collection.size).toStrictEqual(0);
      collection.add({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed).toBeTrue();
    });

    test("takes a key:disposables pairing as a parameter", () => {
      collection.add({ "test": [d1, d2] });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed && d2.disposed).toBeTrue();
    });

    test("takes multiple key:disposable pairings as a parameter", () => {
      collection.add({
        "test": d1,
        "test2": [d2, composite]
      });
      expect(collection.size).toStrictEqual(2);
      collection.dispose();
      expect(d1.disposed && d2.disposed && composite.disposed).toBeTrue();
    });

    test("does not overwrite existing key:disposable pairings", () => {
      collection.add({ "test": d1 });
      collection.add({ "test": d2 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed && d2.disposed).toBeTrue();
    });

    test("orders combined pairings old to new", () => {
      collection.add({ "test": [d1, d2] });
      collection.add({ "test": [composite] });
      const disposables = collection.get("test") as events.IDisposable[];
      expect(disposables[0]).toStrictEqual(d1);
      expect(disposables[1]).toStrictEqual(d2);
      expect(disposables[2]).toStrictEqual(composite);
    });

    test("removes the pairing if given key:undefined", () => {
      collection.add({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.add({ "test": undefined });
      expect(collection.size).toStrictEqual(0);
    });

    test("doesn't add the same disposable multiple times", () => {
      collection.add({ "test": [d1, d2] });
      const r1 = collection.get("test") as events.IDisposable[];
      expect(r1.length).toStrictEqual(2);
      collection.add({ "test": [d2, collection] });
      const r2 = collection.get("test") as events.IDisposable[];
      expect(r2.length).toStrictEqual(3);
    });

    test("does not throw if given a disposed Disposable", () => {
      expect(() => {
        d1.dispose();
        collection.add({ d1 });
      }).not.toThrow();
    });

    test("correctly handles IDisposable objects", () => {
      const d: events.IDisposable = {
        dispose: jest.fn()
      };

      expect(d.dispose).not.toBeCalled();
      collection.add({ d });
      collection.dispose();
      expect(d.dispose).toBeCalledTimes(1);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        collection.dispose();
        collection.add({ "test": composite });
      }).toThrow();
    });
  });

  describe("set method", () => {
    test("takes a key:disposable pairing as a parameter", () => {
      expect(collection.size).toStrictEqual(0);
      collection.set({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed).toBeTrue();
    });

    test("takes a key:disposables pairing as a parameter", () => {
      collection.set({ "test": [d1, d2] });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed && d2.disposed).toBeTrue();
    });

    test("takes multiple key:disposable pairings as a parameter", () => {
      collection.set({
        "test": d1,
        "test2": [d2, composite]
      });
      expect(collection.size).toStrictEqual(2);
      collection.dispose();
      expect(d1.disposed && d2.disposed && composite.disposed).toBeTrue();
    });

    test("overwrites existing key:disposable pairings", () => {
      collection.set({ "test": d1 });
      collection.set({ "test": d2 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed).toBeFalse();
      expect(d2.disposed).toBeTrue();
    });

    test("removes the pairing if given key:undefined", () => {
      collection.set({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.set({ "test": undefined });
      expect(collection.size).toStrictEqual(0);
    });

    test("does not throw if given a disposed Disposable", () => {
      expect(() => {
        d1.dispose();
        collection.set({ d1 });
      }).not.toThrow();
    });

    test("correctly handles IDisposable objects", () => {
      const d: events.IDisposable = {
        dispose: jest.fn()
      };

      expect(d.dispose).not.toBeCalled();
      collection.set({ d });
      collection.dispose();
      expect(d.dispose).toBeCalledTimes(1);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        collection.dispose();
        collection.set({ "test": composite });
      }).toThrow();
    });
  });

  describe("delete method", () => {
    test("removes a key when given only a string parameter", () => {
      collection.add({ d1 });
      expect(collection.size).toStrictEqual(1);
      collection.delete("d1");
      expect(collection.size).toStrictEqual(0);
    });

    test("removes only the supplied disposables", () => {
      collection.add({ "test": [d1, d2, composite] });
      expect(collection.size).toStrictEqual(1);
      collection.delete("test", [d1, d2]);
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed).toBeFalse();
      expect(d2.disposed).toBeFalse();
      expect(composite.disposed).toBeTrue();
    });

    test("does not dispose to deleted disposables", () => {
      collection.add({ "test": d1 });
      collection.delete("test");
      expect(d1.disposed).toBeFalse();
    });

    test("does not dispose to specifically deleted disposables", () => {
      collection.add({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.delete("test", d1);
      expect(d1.disposed).toBeFalse();
    });

    test("throws when given an invalid key", () => {
      expect(() => {
        collection.delete("test");
      }).toThrow();
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        collection.add({ "test": d1 });
        collection.dispose();
        collection.delete("test");
      }).toThrow();
    });
  });

  describe("clear method", () => {
    test("removes all entries from the collection when called", () => {
      collection.add({ d1, d2 });
      expect(collection.size).toStrictEqual(2);
      collection.clear();
      expect(collection.size).toStrictEqual(0);
    });

    test("does not dispose of any removed entries", () => {
      collection.add({ d1, d2 });
      collection.clear();
      expect(d1.disposed || d2.disposed).toBeFalse();
    });

    test("does not dispose to the instance", () => {
      collection.clear();
      expect(collection.disposed).toBeFalse();
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        collection.dispose();
        collection.clear();
      }).toThrow();
    });
  });

  describe("has method", () => {
    test("returns true for a previously added key", () => {
      collection.add({ "test": d1 });
      expect(collection.has("test")).toBeTrue();
    });

    test("returns false for an unknown key", () => {
      expect(collection.has("test")).toBeFalse();
    });

    test("does not throw if invoked on a disposed instance", () => {
      expect(() => {
        collection.dispose();
        collection.has("test");
      }).not.toThrow();
    });
  });

  describe("get method", () => {
    test("returns a previously added disposable for a key", () => {
      collection.add({ d1 });
      const result = collection.get("d1") as events.IDisposable[];
      expect(result).toBeDefined();
      expect(result[0]).toStrictEqual(d1);
    });

    test("can return multiple disposables for a key", () => {
      collection.add({ "test": [d1, d2] });
      const result = collection.get("test") as events.IDisposable[];
      expect(result[0]).toStrictEqual(d1);
      expect(result[1]).toStrictEqual(d2);
    });

    test("does not throw when given an invalid key", () => {
      expect(() => {
        collection.get("test");
      }).not.toThrow();
    });

    test("returns undefined when given an invalid key", () => {
      expect(collection.get("test")).toBeUndefined();
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        collection.dispose();
        collection.get("test");
      }).toThrow();
    });
  });
});
