/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as types from "../types";

/** Returns the operator type that correlates to the given text, if any. */
export function intoFilterOperator(text: string): types.FilterOperator | undefined {
  switch (text) {
    case "=":
      return types.FilterOperator.Equals;
    case ">":
      return types.FilterOperator.GreaterThan;
    case ">=":
      return types.FilterOperator.GreaterThanEquals;
    case "<":
      return types.FilterOperator.LessThan;
    case "<=":
      return types.FilterOperator.LessThanEquals;
    default:
      return undefined;
  }
}
