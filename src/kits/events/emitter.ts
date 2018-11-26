/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as assert from "assert";

import { IDisposable } from "./index";
import { CompositeDisposable } from "./composite-disposable";
import { Disposable } from "./disposable";

/**
 * Utility class to be used when implementing event-based APIs that allows for
 * handlers registered via `::on` to be invoked with calls to `::emit`.
 *
 * Instances of this class are intended to be used internally by classes that
 * expose an event-based API.
 */
export class Emitter<Emissions = { [key: string]: unknown }> implements IDisposable {
  private _disposed: boolean;
  // tslint:disable-next-line:ban-types
  private readonly _eventHandlers: Map<string, Function[]>;
  private _subscriptions: CompositeDisposable;

  /** Returns whether this emitter has been disposed of previously. */
  get disposed(): boolean {
    return this._disposed;
  }

  /** Create a new Emitter. */
  constructor() {
    this._disposed = false;
    this._eventHandlers = new Map();
    this._subscriptions = new CompositeDisposable();
  }

  /** Clear out any existing subscribers. */
  clear(): void {
    this._checkIfDisposed();

    this._subscriptions.dispose();
    this._subscriptions = new CompositeDisposable();

    this._eventHandlers.clear();
  }

  /** Unsubscribe all handlers. */
  dispose(): void {
    if (this._disposed) return;

    this._subscriptions.dispose();
    this._eventHandlers.clear();
    this._disposed = true;
  }

  /**
   * Registers a handler to be invoked whenever the given event is emitted.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @param preempt Whether to place this handler ahead of any existing ones.
   * @param thisArg The context in which the callback should be invoked.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  on<T1 extends keyof Emissions, T2 = unknown>(event: T1, handler: (value: Emissions[T1]) => void,
    preempt = false, thisArg?: T2): Disposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);
    // This is necessary in order to allow duplicate handlers to be registered
    // for any single event.
    const wrapper: typeof handler = (value) => {
      fn(value);
    };

    return this._on(event, wrapper, preempt);
  }

  /**
   * Register the given handler function to be invoked the next time an event
   * with the given name is emitted via `::emit`.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @param preempt Whether to place this handler ahead of any existing ones.
   * @param thisArg The context in which the callback should be invoked.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  once<T1 extends keyof Emissions, T2 = unknown>(event: T1, handler:
    (value: Emissions[T1]) => void, preempt = false, thisArg?: T2): Disposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);
    let disposable: Disposable;

    const wrapper: typeof handler = (value) => {
      disposable.dispose();
      fn(value);
    };

    disposable = this._on(event, wrapper, preempt);
    return disposable;
  }

  /**
   * Invokes each emission from the given collection on the given handler, then
   * registers that handler to be invoked whenever the given event is emitted.
   *
   * @param event The name of the event.
   * @param collection An iterable collection containing all previous emissions.
   * @param handler The callback to be invoked whenever the event is fired.
   * @param preempt Whether to place this handler ahead of any existing ones.
   * @param thisArg The context in which the callback should be invoked.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observe<T1 extends keyof Emissions, T2 = unknown>(event: T1, collection: Iterable<Emissions[T1]>,
    handler: (param: Emissions[T1]) => void, preempt = false, thisArg?: T2): IDisposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);
    const wrapper: typeof handler = (value) => {
      fn(value);
    };

    for (const item of collection) {
      fn(item);
    }

    return this._on(event, wrapper, preempt);
  }

  /**
   * Invoke the handlers registered via ::on for the given event name.
   *
   * @param event The name of the event being emitted.
   * @param value The value associated with the emitted event.
   * @return Whether a handler was registered and invoked during this emission.
   */
  emit<T extends keyof Emissions>(event: T, value: Emissions[T]): boolean {
    this._checkIfDisposed();

    const handlers = this._eventHandlers.get(event as string);
    if (!handlers) return false;

    for (const handler of handlers) {
      handler(value);
    }

    return true;
  }

  /**
   * Asynchronously invoke the handlers registered via ::on for the given event name.
   *
   * @param event The name of the event being emitted.
   * @param value The value associated with the emitted event.
   * @return A promise that will either be resolved to `true` once all handlers have
   * been invoked or resolved to `false` if no handlers were registered.
   */
  async emitAsync<T extends keyof Emissions>(event: T, value: Emissions[T]):
    Promise<boolean> {

    this._checkIfDisposed();

    const handlers = this._eventHandlers.get(event as string);
    if (!handlers) {
      return false;
    }

    const promises: Array<Promise<void>> = [];
    for (const handler of handlers) {
      const promise = new Promise<void>(resolve => {
        handler(value);
        resolve();
      });
      promises.push(promise);
    }

    await Promise.all(promises);
    return true;
  }

  /** Returns the name of every current registered event. */
  getEventNames(): string[] {
    if (this._eventHandlers.size === 0) {
      return [];
    } else {
      return Array.from(this._eventHandlers.keys());
    }
  }

  /** Returns the number of listeners for the given event. */
  getListenerCountForEvent(event: string): number {
    const handlers = this._eventHandlers.get(event);
    return handlers ? handlers.length : 0;
  }

  /** Returns the total number of listeners for this emitter. */
  getTotalListenerCount(): number {
    let result = 0;

    this._eventHandlers.forEach(value => {
      result += value.length;
    });

    return result;
  }

  /**
   * Registers a handler to be invoked whenever the given event is emitted.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @param preempt Whether to place this handler ahead of any existing ones.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  private _on<T extends keyof Emissions>(event: T, handler: (value: Emissions[T]) => void,
    preempt: boolean): Disposable {

    const currentHandlers = this._eventHandlers.get(event as string);
    if (currentHandlers) {
      assert(!currentHandlers.includes(handler));

      if (preempt) {
        currentHandlers.unshift(handler);
      } else {
        currentHandlers.push(handler);
      }
    } else {
      this._eventHandlers.set(event as string, [handler]);
    }

    const cleanup = new Disposable(() => {
      if (!this._subscriptions.disposed) {
        this._subscriptions.delete(cleanup);
      }

      this._off(event as string, handler);
    });

    this._subscriptions.add(cleanup);
    return cleanup;
  }

  /**
   * Unsubscribe a previously registered handler from an event.
   * @param event The event name to unsubscribe the handler from.
   * @param handler The handler being unsubscribed.
   */
  private _off<T = unknown>(event: string, handler: (value: T) => void):
    void {

    assert(!this.disposed, "expected this action to not fire if disposed");
    const previousHandlers = this._eventHandlers.get(event) as Function[];
    assert(previousHandlers != null, "expected this handler to be registered");
    const newHandlers = previousHandlers.filter((h) => h !== handler);

    if (newHandlers.length > 0) {
      this._eventHandlers.set(event, newHandlers);
    } else {
      this._eventHandlers.delete(event);
    }
  }

  /** Attempts to bind the given function to the given object. */
  // tslint:disable-next-line:ban-types
  private _bindIfPossible<T1 extends Function, T2>(fn: T1, thisArg: T2): T1 {
    // tslint:disable-next-line:no-unsafe-any
    return thisArg != null && typeof thisArg === "object" ? fn.bind(thisArg) : fn;
  }

  /** Throws an exception if this instance has been disposed of. */
  private _checkIfDisposed(): void {
    if (this._disposed) {
      throw new Error("modification or access attempted on a disposed instance");
    }
  }
}
