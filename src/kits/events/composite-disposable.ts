/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { IDisposable } from "./index";

/**
 * Aggregates multiple disposable objects together into a single disposable,
 * so they can all be disposed as a group.
 *
 * This is particularly useful when subscribing to multiple events.
 */
export class CompositeDisposable implements IDisposable {
  private _disposed: boolean;
  private _disposables: IDisposable[];

  /** The number of disposables within the composite. */
  get size(): number {
    return this._disposables.length;
  }

  /** Returns whether the composite has been disposed of previously. */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * Create a new composite, optionally with one or more disposables.
   *
   * @param disposables Disposable objects to add to the composite.
   */
  constructor(...disposables: IDisposable[]) {
    this._disposed = false;
    this._disposables = [
      ...disposables
    ];
  }

  /** Dispose of each disposable previously added to this composite. */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    while (this._disposables.length) {
      const s = this._disposables.pop();
      if (s) s.dispose();
    }
  }

  /**
   * Add one or more disposables to the composite, later to be disposed of as
   * an aggregate.
   *
   * @param disposables Disposable objects to add to the composite.
   */
  add(...disposables: IDisposable[]): void {
    if (this._disposed) throw new Error("add attempted on a disposed CompositeDisposable");

    for (const disposable of disposables) {
      this._disposables.push(disposable);
    }
  }

  /** Remove a previously added disposable from the composite. */
  remove(disposable: IDisposable): void {
    if (this._disposed) throw new Error("delete attempted on a disposed CompositeDisposable");
    this._disposables = this._disposables.filter(d => d === disposable ? false : true);
  }

  /** Clear all disposables within the composite. */
  clear(): void {
    if (this._disposed) throw new Error("clear attempted on a disposed CompositeDisposable");
    this._disposables.length = 0;
  }
}
