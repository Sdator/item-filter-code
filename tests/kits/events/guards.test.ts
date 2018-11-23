/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import * as events from "../../../src/kits/events";

describe("isDisposable()", () => {
  test("returns true when given a Disposable", () => {
    const disposable = new events.Disposable;
    expect(events.isDisposable(disposable)).toStrictEqual(true);
  });

  test("returns true when given a CompositeDisposable", () => {
    const composite = new events.CompositeDisposable;
    expect(events.isDisposable(composite)).toStrictEqual(true);
  });

  test("returns true when given a MappedDisposable", () => {
    const collection = new events.MappedDisposable;
    expect(events.isDisposable(collection)).toStrictEqual(true);
  });

  test("returns true when given any object with a dispose method", () => {
    const disposable = {
      dispose: () => { }
    };
    expect(events.isDisposable(disposable)).toStrictEqual(true);
  });

  test("returns false when given a primitive type", () => {
    expect(events.isDisposable(42)).toStrictEqual(false);
    expect(events.isDisposable(null)).toStrictEqual(false);
    expect(events.isDisposable(undefined)).toStrictEqual(false);
    expect(events.isDisposable(false)).toStrictEqual(false);
    expect(events.isDisposable("test")).toStrictEqual(false);
    expect(events.isDisposable(Symbol("test"))).toStrictEqual(false);
  });

  test("returns false when given any other object", () => {
    expect(events.isDisposable({})).toStrictEqual(false);
    expect(events.isDisposable(() => { })).toStrictEqual(false);
    expect(events.isDisposable([])).toStrictEqual(false);
  });
});
