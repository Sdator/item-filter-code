/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { IDisposable } from "./index";

/** Determines whether the given entity is a disposable object. */
export function isDisposable(entity: unknown): entity is IDisposable {
  return typeof entity === "object" && entity != null && "dispose" in entity;
}
