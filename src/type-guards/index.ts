/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { SoundInformation, DefaultSoundInformation } from "../types";
import { IDisposable } from "../kits/events";

/** Determines whether the given entity is an Error. */
export function isError(entity: unknown): entity is Error {
  return entity instanceof Error;
}

/** Determines whether the given sound information details a default sound. */
export function isDefaultSoundInformation(info: SoundInformation):
  info is DefaultSoundInformation {

  return "identifier" in info;
}

/** Determines whether the given entity is a disposable object. */
export function isDisposable(entity: unknown): entity is IDisposable {
  return typeof entity === "object" && entity != null && "dispose" in entity;
}
