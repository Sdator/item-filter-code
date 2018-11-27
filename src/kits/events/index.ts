/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export * from "./composite-disposable";
export * from "./disposable";
export * from "./mapped-disposable";
export * from "./emitter";
export * from "./guards";

export interface IDisposable {
  dispose(): void;
}

/** The standard event interface used across all of our APIs. */
export interface Event<T1, T2 = void> {
  /**
   * A function that represents an event to which you subscribe by calling it with
   * a listener function as argument.
   *
   * @param listener The listener function will be called when the event happens.
   * @param preempt Whether to place this handler ahead of any existing ones.
   * @param thisArgs The `this`-argument which will be used when calling the event listener.
   * @return A disposable which unsubscribes the event listener.
   */
  (listener: (e: T1) => T2, preempt?: boolean, thisArgs?: object): IDisposable;
}
