/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as path from "path";

/** The root path of the project. */
export const projectRoot = path.join(__dirname, "..", "..");

/** The root path of the output directory. */
export const buildRoot = path.join(projectRoot, "out");

/** The root path of the data file directory. */
export const dataRoot = buildRoot;
