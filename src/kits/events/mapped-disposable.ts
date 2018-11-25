/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { IDisposable } from "./index";
import { isDisposable } from "./guards";
import { uniqueArrayMerge } from "../../helpers";

/**
 * A map-based collection of disposables, where keys can be used to dispose of
 * sets of associated disposables.
 */
export class MappedDisposable implements IDisposable {
  private _disposed: boolean;
  private readonly _disposableSets: Map<string, IDisposable[]>;

  /** The number of sets currently within the collection. */
  get size(): number {
    return this._disposableSets.size;
  }

  /** Returns whether this collection has been disposed of previously. */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * Create a new collection, optionally with one or more `key:disposables` pairings.
   *
   * @param disposables An object mapping keys to disposables.
   */
  constructor(disposables?: { [key: string]: IDisposable | IDisposable[] }) {
    this._disposed = false;
    this._disposableSets = new Map;

    if (disposables == null) {
      return;
    }

    // It's not possible to have duplicate keys given that this is a constructor
    // with a single object input.
    for (const key of Object.keys(disposables)) {
      const value = disposables[key];
      this._set(key, value);
    }
  }

  /**
   * Dispose of the set of disposables associated with the given keys, removing
   * them from the collection. If no arguments are passed, disposes of the entire
   * collection and renders this instance inert.
   *
   * @param keys One or more keys for the objects to dispose of. If not provided,
   * the entire collection will be disposed of.
   */
  dispose(keys?: string | string[]): void {
    if (this._disposed) return;

    if (keys == null) {
      for (const [_, disposables] of this._disposableSets) {
        // Same as within CompositeDisposable, remove entires in reverse order.
        // It isn't as common with this data type to add to these sets, though
        // it is possible.
        while (disposables.length) {
          (<IDisposable>disposables.pop()).dispose();
        }
      }
      this._disposed = true;
      this._disposableSets.clear();
    } else if (keys instanceof Array) {
      for (const k of keys) {
        this._disposeIfMapped(k);
      }
    } else {
      this._disposeIfMapped(keys);
    }
  }

  /**
   * Adds each set of disposable values to the collection under the associated key.
   *
   * - If a particular key is already set, then the existing disposables will
   * be merged with the given disposables. Any duplicate disposables will only be
   * added once. If you wish to overwrite the existing disposables for each given key
   * instead, then use `set()`.
   * - If the value of a given key is `undefined`, then that key will be removed
   * from the collection without any of its values being disposed of.
   *
   * @param disposables An object mapping keys to disposables.
   */
  add(disposables: { [key: string]: IDisposable | IDisposable[] | undefined }): void {
    if (this._disposed) {
      throw new Error("add attempted on a disposed instance");
    }

    for (const key of Object.keys(disposables)) {
      this._add(key, disposables[key]);
    }
  }

  /**
   * Adds each set of disposable values to the collection under the associated key.
   *
   * - If a particular key is already set, then the existing disposables will
   * be overwritten with the given disposables. Overwritten disposables will **not**
   * be disposed of. If you wish to merge both sets of disposables instead, then use `add()`.
   * - If the value of a given key is `undefined`, then that key will be removed
   * from the collection without any of its values being disposed of.
   *
   * @param disposables An object mapping keys to disposables.
   */
  set(disposables: { [key: string]: IDisposable | IDisposable[] | undefined }): void {
    if (this._disposed) {
      throw new Error("set attempted on a disposed instance");
    }

    for (const key of Object.keys(disposables)) {
      this._set(key, disposables[key]);
    }
  }

  /**
   * Removes the given disposables from the value for the given key. If no
   * disposables are passed in, then the key is removed from the collection
   * entirely.
   *
   * Removed disposables are *not* disposed of upon removal.
   *
   * @param key The key of the mapping.
   * @param disposables The disposables to be removed from the composite.
   */
  delete(key: string, disposables?: IDisposable | IDisposable[]): void {
    if (this._disposed) {
      throw new Error("delete attempted on a disposed instance");
    }

    // Check to see if this key existed regardless of the value of the second
    // parameter, as this is a programmer error.
    const values = this._disposableSets.get(key);
    if (values == null) {
      throw new Error("attempted to delete disposables for an unknown key");
    }

    if (disposables == null) {
      this._disposableSets.delete(key);
    } else if (disposables instanceof Array) {
      const result = values.filter(value => !disposables.includes(value));
      this._disposableSets.set(key, result);
    } else {
      this._disposableSets.set(key, [disposables]);
    }
  }

  /** Clear the collection's contents without disposing of any contained disposables. */
  clear(): void {
    if (this._disposed) {
      throw new Error("clear attempted on a disposed instance");
    }

    this._disposableSets.clear();
  }

  /** Returns whether this collection contains disposables for the given key. */
  has(key: string): boolean {
    if (this._disposed) {
      throw new Error("has attempted on a disposed instance");
    }

    return this._disposableSets.has(key);
  }

  /** Returns the disposables associated with the given key. */
  get(key: string): IDisposable[] | undefined {
    if (this._disposed) {
      throw new Error("get attempted on a disposed instance");
    }

    const disposables = this._disposableSets.get(key);
    return disposables == null ? undefined : disposables.slice();
  }

  private _add(key: string, value: IDisposable | IDisposable[] | undefined): void {
    const existingValues = this._disposableSets.get(key) || [];

    if (value == null) {
      this._disposableSets.delete(key);
    } else if (value instanceof Array) {
      this._verifyDisposableArray(value);
      this._disposableSets.set(key, uniqueArrayMerge(existingValues, value));
    } else if (isDisposable(value)) {
      existingValues.push(value);
      this._disposableSets.set(key, existingValues);
    } else {
      throw new Error("attempted to add a non-disposable to a MappedDisposable");
    }
  }

  private _set(key: string, value: IDisposable | IDisposable[] | undefined): void {
    if (value == null) {
      this._disposableSets.delete(key);
    } else if (value instanceof Array) {
      this._verifyDisposableArray(value);
      // We want to clone the array itself, retaining the references to the
      // disposables. This is thus intentionally a shallow copy.
      this._disposableSets.set(key, value.slice());
    } else if (isDisposable(value)) {
      this._disposableSets.set(key, [value]);
    } else {
      throw new Error("attempted to add a non-disposable to a MappedDisposable");
    }
  }

  private _verifyDisposableArray(values: IDisposable[]): void {
    if (values.some(value => !isDisposable(value))) {
      throw new Error("attempted to add a non-disposable within an array to a MappedDisposable");
    }
  }

  private _disposeIfMapped(key: string): void {
    const disposables = this._disposableSets.get(key);
    if (disposables) {
      while (disposables.length) {
        (<IDisposable>disposables.pop()).dispose();
      }
      this._disposableSets.delete(key);
    } else {
      throw new Error(`attempted to dispose of unknown key "${key}"`);
    }
  }
}
