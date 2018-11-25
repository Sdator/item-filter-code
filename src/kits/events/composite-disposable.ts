/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { IDisposable } from "./index";
import { isDisposable } from "./guards";

/**
 * Aggregates multiple disposable objects together into a single disposable,
 * so they can all be disposed as a group.
 *
 * This is particularly useful when subscribing to multiple events.
 */
export class CompositeDisposable implements IDisposable {
  private _disposed: boolean;
  private _disposables: IDisposable[];

  /** Returns whether the composite has been disposed of previously. */
  get disposed(): boolean {
    return this._disposed;
  }

  /** The number of disposables within the composite. */
  get size(): number {
    return this._disposables.length;
  }

  /**
   * Create a new composite, optionally with one or more disposables.
   *
   * @param disposables Disposable objects to add to the composite.
   */
  constructor(disposables?: IDisposable | IDisposable[]) {
    this._disposed = false;

    if (disposables == null) {
      this._disposables = [];
    } else if (disposables instanceof Array) {
      this._disposables = disposables.slice();
    } else {
      this._disposables = [disposables];
    }
  }

  /** Dispose of each disposable previously added to this composite. */
  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    while (this._disposables.length) {
      // The above condition makes this impossible to be undefined.
      (<IDisposable>this._disposables.pop()).dispose();
    }
  }

  /**
   * Add one or more disposables to the composite, later to be disposed of as
   * an aggregate.
   *
   * @param disposables Disposable objects to add to the composite.
   */
  add(disposables: IDisposable | IDisposable[]): void {
    if (this._disposed) {
      throw new Error("add attempted on a disposed CompositeDisposable");
    }

    if (disposables instanceof Array) {
      for (const disposable of disposables) {
        this._addIfDisposable(disposable);
      }
    } else {
      this._addIfDisposable(disposables);
    }
  }

  /** Clear all disposables within the composite. */
  clear(): void {
    if (this._disposed) {
      throw new Error("clear attempted on a disposed CompositeDisposable");
    }

    this._disposables.length = 0;
  }

  /** Remove a previously added disposable from the composite. */
  delete(disposable: IDisposable): void {
    if (this._disposed) {
      throw new Error("delete attempted on a disposed CompositeDisposable");
    }

    this._disposables = this._disposables.filter(d => d === disposable ? false : true);
  }

  /** Returns a boolean indicating whether the given entity exists within the composite. */
  has(disposable: IDisposable): boolean {
    if (this._disposed) {
      throw new Error("get attempted on a disposed CompositeDisposable");
    }

    return this._disposables.includes(disposable);
  }

  private _addIfDisposable(disposable: IDisposable): void {
    if (isDisposable(disposable)) {
      this._disposables.push(disposable);
    } else {
      throw new Error("attempted to add a non-disposable object");
    }
  }
}
