/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { IDisposable } from "./index";

/**
 * A handle to a resource that can be disposed, optionally with an action being
 * invoked on disposal.
 */
export class Disposable implements IDisposable {
  private _disposed: boolean;

  /** Returns whether this disposable has been disposed of previously. */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * Create a new disposable.
   *
   * @param action An action to be taken on disposal.
   */
  constructor(private action?: () => void) {
    this._disposed = false;
  }

  /**
   * Perform the disposal action, indicating that the resource associated with
   * this disposable is no longer needed.
   *
   * You can call this method more than once, but the disposal action will only
   * be performed the first time.
   *
   * @return Whether this instance was successfully disposed of.
   */
  dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    if (this.action) {
      this.action();
      this.action = undefined;
    }
  }
}
