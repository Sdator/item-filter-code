/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as events from "../../../src/kits/events";

describe("Emitter", () => {
  let emitter: events.Emitter;

  beforeEach(() => {
    emitter = new events.Emitter;
  });

  afterEach(() => {
    emitter.dispose();
  });

  describe("disposed property", () => {
    test("is false on instance construction", () => {
      expect(emitter.disposed).toStrictEqual(false);
    });

    test("is true following an invocation of dispose()", () => {
      emitter.dispose();
      expect(emitter.disposed).toStrictEqual(true);
    });

    test("throws when set", () => {
      expect(() => {
        // tslint:disable-next-line:no-any
        (<any>emitter.disposed) = true;
      }).toThrow();
    });
  });

  describe("clear method", () => {
    test("removes all registered handlers from the Emitter", () => {
      expect(emitter.getTotalListenerCount()).toStrictEqual(0);
      emitter.on("test", () => { });
      expect(emitter.getTotalListenerCount()).toStrictEqual(1);
      emitter.clear();
      expect(emitter.getTotalListenerCount()).toStrictEqual(0);
    });

    test("does not dispose of the Emitter", () => {
      emitter.clear();
      expect(emitter.disposed).toStrictEqual(false);
    });

    test("throws when invoked on a disposed instance", () => {
      emitter.dispose();
      expect(() => {
        emitter.clear();
      }).toThrow();
    });
  });

  describe("dispose method", () => {
    test("removes all registered handlers from the Emitter", () => {
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(0);
      emitter.on("test", () => { });
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(1);
      emitter.dispose();
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(0);
    });

    test("disposes of the Emitter instance", () => {
      expect(emitter.disposed).toStrictEqual(false);
      emitter.dispose();
      expect(emitter.disposed).toStrictEqual(true);
    });

    test("does not throw when invoked on a disposed instance", () => {
      emitter.dispose();
      expect(() => {
        emitter.dispose();
      }).not.toThrow();
    });
  });

  describe("on method", () => {
    test("takes an event name as the first parameter", () => {
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(0);
      emitter.on("test", () => { });
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(1);
    });

    test("takes an event handler as the second parameter", () => {
      const spy = jest.fn();
      emitter.on("test", spy);
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(1);
    });

    test("allows multiple handlers to be registered for a given event", () => {
      const s1 = jest.fn();
      const s2 = jest.fn();
      emitter.on("test", s1);
      emitter.on("test", s2);
      emitter.emit("test", undefined);
      expect(s1).toBeCalledTimes(1);
      expect(s1).toBeCalledTimes(1);
    });

    test("invokes handlers in the order in which they were added", () => {
      let n = 0;
      const fn = () => ++n;
      const s1 = jest.fn(fn);
      const s2 = jest.fn(fn);
      emitter.on("test", s1);
      emitter.on("test", s2);
      emitter.emit("test", undefined);
      expect(s1).toHaveLastReturnedWith(1);
      expect(s2).toHaveLastReturnedWith(2);
    });

    test("does not remove handlers following an emission", () => {
      const spy = jest.fn();
      emitter.on("test", spy);
      expect(spy).not.toBeCalled();
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(1);
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(2);
    });

    test("returns a disposable that removes the handler on disposal", () => {
      const spy = jest.fn();
      const d = emitter.on("test", spy);
      d.dispose();
      expect(spy).not.toBeCalled();
      emitter.emit("test", undefined);
      expect(spy).not.toBeCalled();
    });

    test("only registers a handler for the given event name", () => {
      const spy = jest.fn();
      emitter.on("e1", () => { });
      emitter.on("e2", spy);
      expect(spy).not.toBeCalled();
      emitter.emit("e1", undefined);
      expect(spy).not.toBeCalled();
    });

    test("throws when invoked on a disposed instance", () => {
      emitter.dispose();
      expect(() => {
        emitter.on("test", () => { });
      }).toThrow();
    });
  });

  describe("once method", () => {
    test("takes an event name as the first parameter", () => {
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(0);
      emitter.once("test", () => { });
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(1);
    });

    test("takes an event handler as the second parameter", () => {
      const spy = jest.fn();
      emitter.once("test", spy);
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(1);
    });

    test("allows multiple handlers to be registered for a given event", () => {
      const s1 = jest.fn();
      const s2 = jest.fn();
      emitter.once("test", s1);
      emitter.once("test", s2);
      emitter.emit("test", undefined);
      expect(s1).toBeCalledTimes(1);
      expect(s1).toBeCalledTimes(1);
    });

    test("invokes handlers in the order in which they were added", () => {
      let n = 0;
      const fn = () => ++n;
      const s1 = jest.fn(fn);
      const s2 = jest.fn(fn);
      emitter.once("test", s1);
      emitter.once("test", s2);
      emitter.emit("test", undefined);
      expect(s1).toHaveLastReturnedWith(1);
      expect(s2).toHaveLastReturnedWith(2);
    });

    test("removes the handler following an emission", () => {
      const spy = jest.fn();
      emitter.once("test", spy);
      expect(spy).not.toBeCalled();
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(1);
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(1);
    });

    test("supports removal of multiple handlers following an emission", () => {
      const s1 = jest.fn();
      const s2 = jest.fn();
      emitter.once("test", s1);
      emitter.once("test", s2);
      emitter.emit("test", undefined);
      expect(s1).toBeCalledTimes(1);
      expect(s2).toBeCalledTimes(1);
      emitter.emit("test", undefined);
      expect(s1).toBeCalledTimes(1);
      expect(s2).toBeCalledTimes(1);
    });

    test("does not modify other handlers following an emission", () => {
      const spy = jest.fn();
      emitter.on("test", spy);
      emitter.once("test", () => { });
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(1);
      emitter.emit("test", undefined);
      expect(spy).toBeCalledTimes(2);
    });

    test("returns a disposable that removes the handler on disposal", () => {
      const spy = jest.fn();
      const d = emitter.once("test", spy);
      d.dispose();
      expect(spy).not.toBeCalled();
      emitter.emit("test", undefined);
      expect(spy).not.toBeCalled();
    });

    test("only registers a handler for the given event name", () => {
      const spy = jest.fn();
      emitter.once("e1", () => { });
      emitter.once("e2", spy);
      expect(spy).not.toBeCalled();
      emitter.emit("e1", undefined);
      expect(spy).not.toBeCalled();
    });

    test("throws when invoked on a disposed instance", () => {
      emitter.dispose();
      expect(() => {
        emitter.once("test", () => { });
      }).toThrow();
    });
  });

  describe("preempt method", () => {
    // TODO(glen): write preempt tests.
    pending("TODO");
  });

  describe("preemptOnce method", () => {
    // TODO(glen): write preemptOnce tests.
    pending("TODO");
  });

  describe("emit method", () => {
    test("invokes all registered handlers for the given event when called", () => {
      const s1 = jest.fn();
      const s2 = jest.fn();
      emitter.on("test", s1);
      emitter.on("test", s2);
      expect(s1).not.toBeCalled();
      expect(s2).not.toBeCalled();
      emitter.emit("test", undefined);
      expect(s1).toBeCalledTimes(1);
      expect(s2).toBeCalledTimes(1);
    });

    test("only invokes handlers for the given event when called", () => {
      const spy = jest.fn();
      emitter.on("e1", spy);
      emitter.on("e2", () => { });
      expect(spy).not.toBeCalled();
      emitter.emit("e2", undefined);
      expect(spy).not.toBeCalled();
    });

    test("passes the second parameter to each invoked handler", () => {
      const s1 = jest.fn();
      const s2 = jest.fn();
      emitter.on("test", s1);
      emitter.on("test", s2);
      emitter.emit("test", 42);
      expect(s1).toBeCalledWith(42);
      expect(s2).toBeCalledWith(42);
    });

    test("allows that second parameter to be any arbitrary type", () => {
      const spy = jest.fn();
      emitter.on("test", spy);

      emitter.emit("test", 42);
      expect(spy).toHaveBeenLastCalledWith(42);

      const obj = { a: 42 };
      emitter.emit("test", obj);
      expect(spy).toHaveBeenLastCalledWith(obj);

      emitter.emit("test", undefined);
      expect(spy).toHaveBeenLastCalledWith(undefined);
    });

    test("throws when invoked on a disposed instance", () => {
      emitter.dispose();
      expect(() => {
        emitter.emit("test", undefined);
      }).toThrow();
    });
  });

  describe("emitAsync method", () => {
    test("invokes all registered handlers for the given event when called", async () => {
      const s1 = jest.fn();
      const s2 = jest.fn();
      emitter.on("test", s1);
      emitter.on("test", s2);
      expect(s1).not.toBeCalled();
      expect(s2).not.toBeCalled();
      const promise = emitter.emitAsync("test", undefined);
      const result = await promise;
      expect(result).toStrictEqual(true);
      expect(s1).toBeCalledTimes(1);
      expect(s2).toBeCalledTimes(1);
    });

    test("resolves to false when no handlers are registered", async () => {
      const promise = emitter.emitAsync("test", undefined);
      const result = await promise;
      expect(result).toStrictEqual(false);
    });

    test("only invokes handlers for the given event when called", async () => {
      const spy = jest.fn();
      emitter.on("e1", spy);
      emitter.on("e2", () => { });
      expect(spy).not.toBeCalled();
      await emitter.emitAsync("e2", undefined);
      expect(spy).not.toBeCalled();
    });

    test("passes the second parameter to each invoked handler", async () => {
      const s1 = jest.fn();
      const s2 = jest.fn();
      emitter.on("test", s1);
      emitter.on("test", s2);
      await emitter.emitAsync("test", 42);
      expect(s1).toBeCalledWith(42);
      expect(s2).toBeCalledWith(42);
    });

    test("allows that second parameter to be any arbitrary type", async () => {
      const spy = jest.fn();
      emitter.on("test", spy);

      await emitter.emitAsync("test", 42);
      expect(spy).toHaveBeenLastCalledWith(42);

      const obj = { a: 42 };
      await emitter.emitAsync("test", obj);
      expect(spy).toHaveBeenLastCalledWith(obj);

      await emitter.emitAsync("test", undefined);
      expect(spy).toHaveBeenLastCalledWith(undefined);
    });

    test("throws when invoked on a disposed instance", async () => {
      emitter.dispose();
      await expect(emitter.emitAsync("test", undefined)).rejects
        .toEqual(new Error("modification or access attempted on a disposed instance"));
    });
  });

  describe("getEventNames method", () => {
    test("returns the list of events with listeners", () => {
      emitter.on("e1", () => { });
      expect(emitter.getEventNames()).toEqual(["e1"]);
      emitter.on("e2", () => { });
      expect(emitter.getEventNames()).toEqual(["e1", "e2"]);
    });

    test("returns an empty array if there are no events with listeners", () => {
      expect(emitter.getEventNames()).toEqual([]);
    });
  });

  describe("getListenerCountForEvent method", () => {
    test("returns the number of listeners for a given event", () => {
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(0);
      emitter.on("test", () => { });
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(1);
      emitter.on("test", () => { });
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(2);
    });

    test("does not count listeners for other events", () => {
      emitter.on("e1", () => { });
      expect(emitter.getListenerCountForEvent("e1")).toStrictEqual(1);
      emitter.on("e2", () => { });
      expect(emitter.getListenerCountForEvent("e1")).toStrictEqual(1);
    });

    test("returns 0 for events with no listeners", () => {
      expect(emitter.getListenerCountForEvent("test")).toStrictEqual(0);
    });

    test("does not throw when invoked on a disposed instance", () => {
      emitter.dispose();
      expect(() => {
        emitter.getListenerCountForEvent("test");
      }).not.toThrow();
    });
  });

  describe("getTotalListenerCount method", () => {
    test("returns the total listener count from all events", () => {
      expect(emitter.getTotalListenerCount()).toStrictEqual(0);
      emitter.on("e1", () => { });
      expect(emitter.getTotalListenerCount()).toStrictEqual(1);
      emitter.on("e2", () => { });
      expect(emitter.getTotalListenerCount()).toStrictEqual(2);
    });

    test("correctly counts events with multiple listeners", () => {
      emitter.on("test", () => { });
      expect(emitter.getTotalListenerCount()).toStrictEqual(1);
      emitter.on("test", () => { });
      expect(emitter.getTotalListenerCount()).toStrictEqual(2);
    });

    test("returns 0 if no events have any listeners", () => {
      expect(emitter.getTotalListenerCount()).toStrictEqual(0);
    });

    test("does not throw when invoked on a disposed instance", () => {
      emitter.dispose();
      expect(() => {
        emitter.getTotalListenerCount();
      }).not.toThrow();
    });
  });
});
