/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// TODO(glen): low priority, but try to get rid of these eventually.
// tslint:disable:ban-types no-any no-unsafe-any
// TODO(glen): emitting data should be optional.

import { IDisposable } from "./index";
import { Disposable } from "./disposable";

/**
 * Utility class to be used when implementing event-based APIs that allows for
 * handlers registered via `::on` to be invoked with calls to `::emit`.
 *
 * Instances of this class are intended to be used internally by classes that
 * expose an event-based API.
 */
export class Emitter<Emissions = { [key: string]: any }> implements IDisposable {
  private _disposed: boolean;
  private readonly _eventHandlers: Map<string, Function[]>;

  /** Returns whether this emitter has been disposed of previously. */
  get disposed(): boolean {
    return this._disposed;
  }

  /** Create a new Emitter. */
  constructor() {
    this._disposed = false;
    this._eventHandlers = new Map;
  }

  /** Clear out any existing subscribers. */
  clear(): void {
    this._eventHandlers.clear();
  }

  /** Unsubscribe all handlers. */
  dispose(): boolean {
    this._eventHandlers.clear();
    this._disposed = true;
    return true;
  }

  /** Returns whether this emitter has been disposed of previously. */
  isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Registers a handler to be invoked whenever the given event is emitted.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  on<T extends keyof Emissions>(event: T, handler: (value: Emissions[T]) => void,
    unshift = false): Disposable {

    if (this._disposed) {
      throw new Error("listen attempted on a disposed Emitter");
    }

    if (typeof handler !== "function") {
      throw new Error("handler passed to Emitter wasn't a function");
    }

    const currentHandlers = this._eventHandlers.get(event as string);
    if (currentHandlers) {
      if (unshift) {
        currentHandlers.unshift(handler);
      } else {
        currentHandlers.push(handler);
      }
    } else {
      this._eventHandlers.set(event as string, [handler]);
    }

    return new Disposable(() => {
      this._off(event as string, handler);
    });
  }

  /**
   * Register the given handler function to be invoked the next time an event
   * with the given name is emitted via `::emit`.
   *
   * @param event The event name that will trigger the handler on emission.
   * @param handler The function to invoke when `::emit` is called with the given
   * event name.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  once<T extends keyof Emissions>(event: T, handler: (value: Emissions[T]) => void,
    unshift = false): Disposable {

    let disposable: Disposable;

    const wrapper = (value: Emissions[T]) => {
      if (disposable) disposable.dispose();
      handler(value);
    };

    disposable = this.on(event, wrapper, unshift);
    return disposable;
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
  preempt<T extends keyof Emissions>(event: T, handler: (value:
    Emissions[T]) => void): Disposable {

    return this.on(event, handler, true);
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
  preemptOnce<T extends keyof Emissions>(event: T, handler: (value:
    Emissions[T]) => void): Disposable {

    return this.once(event, handler, true);
  }

  /**
   * Invoke the handlers registered via ::on for the given event name.
   *
   * @param event The name of the event being emitted.
   * @param value The value associated with the emitted event.
   * @return Whether a handler was registered and invoked during this emission.
   */
  emit<T extends keyof Emissions>(event: T, value: Emissions[T]): boolean {
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

    const handlers = this._eventHandlers.get(event as string);
    if (!handlers) return false;

    const promises: Array<Promise<void>> = [];
    for (const handler of handlers) {
      const promise = new Promise<void>(resolve => {
        resolve(handler(value));
      });
      promises.push(promise);
    }

    await Promise.all(promises);
    return true;
  }

  /** Returns the name of every current registered event. */
  getEventNames(): string[] {
    return Object.keys(this._eventHandlers);
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
   * Simplifies the creation of registration functions within code utilizing Emitters.
   * @param event The name of the event.
   * @param callback The callback to be invoked whenever the event is fired.
   * @param thisArg The context in which the callback should be invoked.
   * @param disposables An array to automatically place the created disposable into.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  registerEvent<T extends keyof Emissions>(event: T, callback: (param: Emissions[T]) => any,
    thisArg: any, disposables?: IDisposable[]): IDisposable {

    const fn = thisArg != null && typeof thisArg === "object" ? callback.bind(thisArg) : callback;
    if (disposables) {
      const disposable = this.on(event, fn);
      disposables.push(disposable);
      return disposable;
    } else {
      return this.on(event, fn);
    }
  }

  /**
   * Simplifies the creation of observation functions within code utilizing Emitters.
   * @param event The name of the event.
   * @param collection An iterable collection containing all previous emissions.
   * @param callback The callback to be invoked whenever the event is fired.
   * @param thisArg The context in which the callback should be invoked.
   * @param disposables An array to automatically place the created disposable into.
   * @return A disposable on which `.dispose()` can be called to unsubscribe.
   */
  observeEvent<T extends keyof Emissions>(event: T, collection: Iterable<Emissions[T]>,
    callback: (param: Emissions[T]) => any, thisArg: any, disposables?: IDisposable[]):
    IDisposable {

    const fn = thisArg != null && typeof thisArg === "object" ? callback.bind(thisArg) : callback;

    for (const item of collection) {
      fn(item);
    }

    return this.registerEvent<T>(event, fn, null, disposables);
  }

  /** Removes a registered handler whenever its disposable is disposed of. */
  private _off(event: string, handler: Function): void {
    if (this._disposed) return;

    const previousHandlers = this._eventHandlers.get(event);
    if (previousHandlers) {
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
}
