/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// TODO(glen): does implementing observeOnce make any sense?

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
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  on<T1 extends keyof Emissions, T2 = unknown>(event: T1, handler: (value: Emissions[T1]) => void,
    thisArg?: T2): Disposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);
    return this._on(event, fn);
  }

  /**
   * Register the given handler function to be invoked the next time an event
   * with the given name is emitted via `::emit`.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @param preempt Whether to place this handler ahead of any existing ones.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  once<T1 extends keyof Emissions, T2 = unknown>(event: T1, handler:
    (value: Emissions[T1]) => void, thisArg?: T2): Disposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);
    let disposable: Disposable;

    const wrapper: typeof handler = (value) => {
      disposable.dispose();
      // TODO(glen): ensure that this will have the right `this` context.
      fn(value);
    };

    disposable = this._on(event, wrapper);
    return disposable;
  }

  /**
   * Simplifies the creation of observation functions within code utilizing Emitters.
   *
   * @param event The name of the event.
   * @param collection An iterable collection containing all previous emissions.
   * @param handler The callback to be invoked whenever the event is fired.
   * @param thisArg The context in which the callback should be invoked.
   * @param disposables An array to automatically place the created disposable into.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observe<T1 extends keyof Emissions, T2 = unknown>(event: T1, collection: Iterable<Emissions[T1]>,
    handler: (param: Emissions[T1]) => void, thisArg?: T2): IDisposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);

    for (const item of collection) {
      fn(item);
    }

    return this._on(event, fn, false);
  }

  /**
   * Register the given handler function to be invoked before all other
   * handlers existing at the time of subscription whenever events by the
   * given name are emitted via `::emit`.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  preempt<T1 extends keyof Emissions, T2 = unknown>(event: T1, handler: (value:
    Emissions[T1]) => void, thisArg?: T2): Disposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);
    return this._on(event, fn, true);
  }

  /**
   * Register the given handler function to be invoked before all other handlers
   * existing at the time of subscription only once the next time events by the
   * given name are emitted via `::emit`. After being invoked, it will automatically
   * be unsubscribed.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  preemptOnce<T1 extends keyof Emissions, T2 = unknown>(event: T1, handler: (value:
    Emissions[T1]) => void, thisArg?: T2): Disposable {

    this._checkIfDisposed();

    const fn = this._bindIfPossible(handler, thisArg);
    let disposable: Disposable;

    const wrapper: typeof handler = (value) => {
      disposable.dispose();
      fn(value);
    };

    disposable = this._on(event, wrapper, true);
    return disposable;
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

  private _on<T extends keyof Emissions>(event: T, handler: (value: Emissions[T]) => void,
    preempt = false): Disposable {

    const currentHandlers = this._eventHandlers.get(event as string);
    if (currentHandlers) {
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

  /** Removes a registered handler whenever its disposable is disposed of. */
  private _off<T = unknown>(event: string, handler: (value: T) => void):
    void {

    if (this._disposed) return;

    const previousHandlers = this._eventHandlers.get(event);
    if (previousHandlers) {
      // tslint:disable-next-line:ban-types
      const newHandlers: Function[] = [];
      for (const h of previousHandlers) {
        if (h !== handler) newHandlers.push(h);
      }

      if (newHandlers.length > 0) {
        this._eventHandlers.set(event, newHandlers);
      } else {
        this._eventHandlers.delete(event);
      }
    }
  }

  /** Attempts to bind the given function to the given object. */
  // tslint:disable-next-line:ban-types
  private _bindIfPossible<T1 extends Function, T2>(fn: T1, thisArg: T2): T1 {
    // tslint:disable-next-line:no-unsafe-any
    return thisArg != null && typeof thisArg === "object" ? fn.bind(thisArg) : fn;
  }

  private _checkIfDisposed(): void {
    if (this._disposed) {
      throw new Error("modification or access attempted on a disposed instance");
    }
  }
}
