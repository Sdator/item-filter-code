/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export function AssertUnreachable(nothing: never): never {
  throw new Error("Should never hit this assertion at runtime.");
}
