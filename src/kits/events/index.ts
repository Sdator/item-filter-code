/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export * from "./composite-disposable";
export * from "./disposable";
export * from "./emitter";

export interface IDisposable {
  dispose(): void;
}

/**
 * The standard event interface used across all of our APIs.
 * Essentially identical to the `vscode.Event` type.
 */
// tslint:disable-next-line:no-any
export interface Event<T1, T2 = any> {
  /**
   * A function that represents an event to which you subscribe by calling it with
   * a listener function as argument.
   *
   * @param listener The listener function will be called when the event happens.
   * @param thisArgs The `this`-argument which will be used when calling the event listener.
   * @param disposables An array to which a [disposable](#Disposable) will be added.
   * @return A disposable which unsubscribes the event listener.
   */
  // tslint:disable-next-line:no-any
  (listener: (e: T1) => T2, thisArgs?: any, disposables?: IDisposable[]): IDisposable;
}

/** Determines whether the given entity is a disposable object. */
export function isDisposable(entity: unknown): entity is IDisposable {
  return typeof entity === "object" && entity != null && "dispose" in entity;
}
