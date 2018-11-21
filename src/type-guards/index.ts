/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { NewSoundInformation, DefaultSoundInformation } from "../types";

/** Determines whether the given entity is an Error. */
// tslint:disable-next-line:no-any
export function isError(entity: any): entity is Error {
  if (entity != null && entity instanceof Error) return true;
  else return false;
}

/** Determines whether the given sound information details a default sound. */
export function isDefaultSoundInformation(info: NewSoundInformation):
  info is DefaultSoundInformation {

  return "identifier" in info;
}
