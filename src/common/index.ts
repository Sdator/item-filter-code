/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";

import { Configuration } from "../types";

/** The root path of the project. */
export const projectRoot = path.join(__dirname, "..", "..");

/** The root path of the output directory. */
export const buildRoot = path.join(projectRoot, "out");

/** The root path of the data file directory. */
export const dataRoot = buildRoot;

/** Determines whether the given entity is an Error. */
// tslint:disable-next-line:no-any
export function isError(entity: any): entity is Error {
  if (entity != null && entity instanceof Error) return true;
  else return false;
}

/** Determines whether the given entity contains our configuration variables. */
// tslint:disable-next-line:no-any
export function isConfiguration(entity: any): entity is Configuration {
  if (entity != null && (<Configuration>entity)["item-filter"] != null) {
    return true;
  } else {
    return false;
  }
}
