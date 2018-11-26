/* ============================================================================
 * Copyright (c) Glen Marker. All rights reserved.
 * Licensed under the MIT license. See the LICENSE file in the project root for
 * license information.
 * ===========================================================================*/

import "jest-extended";
import * as events from "../../../src/kits/events";

describe("isDisposable()", () => {
  test("returns true when given a Disposable", () => {
    const disposable = new events.Disposable;
    expect(events.isDisposable(disposable)).toBeTrue();
  });

  test("returns true when given a CompositeDisposable", () => {
    const composite = new events.CompositeDisposable;
    expect(events.isDisposable(composite)).toBeTrue();
  });

  test("returns true when given a MappedDisposable", () => {
    const collection = new events.MappedDisposable;
    expect(events.isDisposable(collection)).toBeTrue();
  });

  test("returns true when given any object with a dispose method", () => {
    const disposable = {
      dispose: () => { }
    };
    expect(events.isDisposable(disposable)).toBeTrue();
  });

  test("returns false when given a primitive type", () => {
    expect(events.isDisposable(42)).toBeFalse();
    expect(events.isDisposable(null)).toBeFalse();
    expect(events.isDisposable(undefined)).toBeFalse();
    expect(events.isDisposable(false)).toBeFalse();
    expect(events.isDisposable("test")).toBeFalse();
    expect(events.isDisposable(Symbol("test"))).toBeFalse();
  });

  test("returns false when given any other object", () => {
    expect(events.isDisposable({})).toBeFalse();
    expect(events.isDisposable(() => { })).toBeFalse();
    expect(events.isDisposable([])).toBeFalse();
  });
});
