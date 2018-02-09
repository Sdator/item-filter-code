/* ============================================================================
 * Copyright  Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

export class Point {
  row: number;
  column: number;

  /**
   * Creates a Point from any point-compatible object.
   * @param object Either an object with a row and column property or an array
   * containing two numbers representing the row and column (in that order).
   */
  static fromObject(obj: [number, number]|{ row: number, column: number }): Point {
    let row: number;
    let column: number;

    if (Array.isArray(obj)) {
      [row, column] = obj;
    } else {
      row = obj.row;
      column = obj.column;
    }

    return new Point(row, column);
  }

  constructor(row: number, column: number) {
    this.row = row;
    this.column = column;
  }
}
