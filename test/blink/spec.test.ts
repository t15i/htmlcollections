import { BlinklikeHTMLCollection } from "lib";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { setup, teardown, type Setup } from "./utils";

describe("WebIDL spec conformance smoke tests", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("BlinklikeHTMLCollection.prototype.item.length === 1", () => {
    expect(BlinklikeHTMLCollection.prototype.item.length).toBe(1);
  });

  test("BlinklikeHTMLCollection.prototype.namedItem.length === 1", () => {
    expect(BlinklikeHTMLCollection.prototype.namedItem.length).toBe(1);
  });

  test("item() / namedItem() with no arguments throws TypeError (arity)", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.coll.item as any).call(s.coll),
    ).toThrow(
      new TypeError(
        "Failed to execute 'item' on 'BlinklikeHTMLCollection': 1 argument required, but only 0 present.",
      ),
    );
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s.coll.namedItem as any).call(s.coll),
    ).toThrow(
      new TypeError(
        "Failed to execute 'namedItem' on 'BlinklikeHTMLCollection': 1 argument required, but only 0 present.",
      ),
    );
  });

  test("calling methods on a foreign `this` throws TypeError", () => {
    expect(() => s.coll.item.call({}, 0)).toThrow(
      new TypeError("Illegal invocation"),
    );
    expect(() => s.coll.namedItem.call({}, "x")).toThrow(
      new TypeError("Illegal invocation"),
    );
  });
});
