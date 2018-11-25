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
      expect(events.isDisposable(collection)).toStrictEqual(true);
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
    test("exists on the MappedDisposable class", () => {
      expect(collection.size).toBeDefined();
    });

    test("is a number", () => {
      expect(typeof collection.size === "number").toStrictEqual(true);
    });

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
    test("exists on the Disposable class", () => {
      expect(collection.disposed).toBeDefined();
    });

    test("is a boolean", () => {
      expect(typeof collection.disposed === "boolean").toStrictEqual(true);
    });

    test("is initially set to false", () => {
      expect(collection.disposed).toStrictEqual(false);
    });

    test("is set to true whenever dispose() is called", () => {
      collection.dispose();
      expect(collection.disposed).toStrictEqual(true);
    });

    test("throws when set", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        (<any>collection).disposed = true;
      }).toThrow();
    });
  });

  describe("dispose method", () => {
    test("exists on the MappedDisposable class", () => {
      expect(collection.dispose).toBeDefined();
    });

    test("is a function", () => {
      expect(typeof collection.dispose === "function").toStrictEqual(true);
    });

    test("disposes of the MappedDisposable when called with no arguments", () => {
      expect(collection.disposed).toStrictEqual(false);
      collection.dispose();
      expect(collection.disposed).toStrictEqual(true);
    });

    test("disposes of a specific key:disposable pairing when called with a string", () => {
      collection.add({ "test": composite });
      expect(composite.disposed).toStrictEqual(false);
      expect(collection.disposed).toStrictEqual(false);
      collection.dispose("test");
      expect(composite.disposed).toStrictEqual(true);
      expect(collection.disposed).toStrictEqual(false);
    });

    test("disposes of each key's value when called with multiple strings", () => {
      collection.add({
        d1,
        d2,
        composite
      });

      expect(collection.disposed).toStrictEqual(false);
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
      expect(composite.disposed).toStrictEqual(false);

      collection.dispose(["d1", "d2"]);

      expect(collection.disposed).toStrictEqual(false);
      expect(d1.disposed).toStrictEqual(true);
      expect(d2.disposed).toStrictEqual(true);
      expect(composite.disposed).toStrictEqual(false);
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
    test("exists on the MappedDisposable class", () => {
      expect(collection.add).toBeDefined();
    });

    test("is a function", () => {
      expect(typeof collection.add === "function").toStrictEqual(true);
    });

    test("takes a key:disposable pairing as a parameter", () => {
      expect(collection.size).toStrictEqual(0);
      collection.add({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed).toStrictEqual(true);
    });

    test("takes a key:disposables pairing as a parameter", () => {
      collection.add({ "test": [d1, d2] });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed && d2.disposed).toStrictEqual(true);
    });

    test("takes multiple key:disposable pairings as a parameter", () => {
      collection.add({
        "test": d1,
        "test2": [d2, composite]
      });
      expect(collection.size).toStrictEqual(2);
      collection.dispose();
      expect(d1.disposed && d2.disposed && composite.disposed).toStrictEqual(true);
    });

    test("does not overwrite existing key:disposable pairings", () => {
      collection.add({ "test": d1 });
      collection.add({ "test": d2 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed && d2.disposed).toStrictEqual(true);
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

    test("throws when given a non-disposable object", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        collection.add({ "test": {} as any });
      }).toThrow();
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

    test("throws if given an invalid array for a key:disposables pairing", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        collection.add({ "test": [d1, {} as any, d2] });
      }).toThrow();
    });
  });

  describe("set method", () => {
    test("exists on the MappedDisposable class", () => {
      expect(collection.set).toBeDefined();
    });

    test("is a function", () => {
      expect(typeof collection.set === "function").toStrictEqual(true);
    });

    test("takes a key:disposable pairing as a parameter", () => {
      expect(collection.size).toStrictEqual(0);
      collection.set({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed).toStrictEqual(true);
    });

    test("takes a key:disposables pairing as a parameter", () => {
      collection.set({ "test": [d1, d2] });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed && d2.disposed).toStrictEqual(true);
    });

    test("takes multiple key:disposable pairings as a parameter", () => {
      collection.set({
        "test": d1,
        "test2": [d2, composite]
      });
      expect(collection.size).toStrictEqual(2);
      collection.dispose();
      expect(d1.disposed && d2.disposed && composite.disposed).toStrictEqual(true);
    });

    test("overwrites existing key:disposable pairings", () => {
      collection.set({ "test": d1 });
      collection.set({ "test": d2 });
      expect(collection.size).toStrictEqual(1);
      collection.dispose();
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(true);
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

    test("throws when given a non-disposable object", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        collection.set({ "test": {} as any });
      }).toThrow();
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

    test("throws if given an invalid array for a key:disposables pairing", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        collection.set({ "test": [d1, {} as any, d2] });
      }).toThrow();
    });
  });

  describe("delete method", () => {
    test("exists on the MappedDisposable class", () => {
      expect(collection.delete).toBeDefined();
    });

    test("is a function", () => {
      expect(typeof collection.delete === "function").toStrictEqual(true);
    });

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
      expect(d1.disposed).toStrictEqual(false);
      expect(d2.disposed).toStrictEqual(false);
      expect(composite.disposed).toStrictEqual(true);
    });

    test("does not dispose to deleted disposables", () => {
      collection.add({ "test": d1 });
      collection.delete("test");
      expect(d1.disposed).toStrictEqual(false);
    });

    test("does not dispose to specifically deleted disposables", () => {
      collection.add({ "test": d1 });
      expect(collection.size).toStrictEqual(1);
      collection.delete("test", d1);
      expect(d1.disposed).toStrictEqual(false);
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
    test("exists on the MappedDisposable class", () => {
      expect(collection.clear).toBeDefined();
    });

    test("is a function", () => {
      expect(typeof collection.clear === "function").toStrictEqual(true);
    });

    test("removes all entries from the collection when called", () => {
      collection.add({ d1, d2 });
      expect(collection.size).toStrictEqual(2);
      collection.clear();
      expect(collection.size).toStrictEqual(0);
    });

    test("does not dispose of any removed entries", () => {
      collection.add({ d1, d2 });
      collection.clear();
      expect(d1.disposed || d2.disposed).toStrictEqual(false);
    });

    test("does not dispose to the instance", () => {
      collection.clear();
      expect(collection.disposed).toStrictEqual(false);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        collection.dispose();
        collection.clear();
      }).toThrow();
    });
  });

  describe("has method", () => {
    test("exists on the MappedDisposable class", () => {
      expect(collection.has).toBeDefined();
    });

    test("is a function", () => {
      expect(typeof collection.has === "function").toStrictEqual(true);
    });

    test("returns true for a previously added key", () => {
      collection.add({ "test": d1 });
      expect(collection.has("test")).toStrictEqual(true);
    });

    test("returns false for an unknown key", () => {
      expect(collection.has("test")).toStrictEqual(false);
    });

    test("throws if invoked on a disposed instance", () => {
      expect(() => {
        collection.dispose();
        collection.has("test");
      }).toThrow();
    });
  });

  describe("get method", () => {
    test("exists on the MappedDisposable class", () => {
      expect(collection.get).toBeDefined();
    });

    test("is a function", () => {
      expect(typeof collection.get === "function").toStrictEqual(true);
    });

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
