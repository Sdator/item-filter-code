/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

// Incomplete type definition for "jest-extended", which augments the types of
// "jest" itself. Matchers are only added when used.

declare namespace jest {
  interface Matchers<R> {
    /** Use when checking if a value is equal (===) to true. */
    toBeTrue(): CustomMatcherResult;

    /** Use when checking if a value is equal (===) to false. */
    toBeFalse(): CustomMatcherResult;

    /** Use when checking if a Mock was called before another Mock. */
    toHaveBeenCalledBefore(mock: Mock): CustomMatcherResult;

    /** Use when checking if a Mock was called after another Mock. */
    toHaveBeenCalledAfter(mock: Mock): CustomMatcherResult;
  }
}
