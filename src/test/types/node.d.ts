/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

declare namespace NodeJS {
  interface Global {
    // tslint:disable-next-line:no-any
    [key: string]: any;
  }
}
