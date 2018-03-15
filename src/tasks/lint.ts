/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import { lintTypeScript } from "./index";

const result = lintTypeScript(true);
if (result !== 0) process.exit(result);
