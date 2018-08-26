/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { IDisposable } from ".";

/**
 * A handle to a resource that can be disposed, optionally with an action being
 * invoked on disposal.
 */
export class Disposable implements IDisposable {
  private disposed: boolean;

  /**
   * Create a new disposable.
   *
   * @param action An action to be taken on disposal.
   */
  constructor(private action?: () => void) {
    if (action && typeof(action) !== "function") {
      throw new Error("Disposal action passed to a Disposable wasn't a function.");
    }
    this.disposed = false;
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
    if (this.disposed) return;

    this.disposed = true;
    if (this.action) {
      this.action();
      this.action = undefined;
    }
  }

  /** Returns whether this disposable has been disposed of previously. */
  isDisposed(): boolean {
    return this.disposed;
  }
}
