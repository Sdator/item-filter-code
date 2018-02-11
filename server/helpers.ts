/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export type Result<T> = Promise<T> | T;

export function assertUnreachable(_: never): never {
  throw new Error("Should never hit this assertion at runtime.");
}

export function runSafe<T>(f: () => Result<T>, errorValue: T, errorMessage: string):
  Result<T> {

  try {
    const result = f();
    if (result instanceof Promise) {
      return result.then(void 0, e => {
        console.error(errorMessage, e);
        return errorValue;
      });
    }
    return result;
  } catch (e) {
    console.error(errorMessage, e);
    return errorValue;
  }
}
