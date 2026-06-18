import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { BlinklikeHTMLCollection } from "lib";

import { populate, setup, teardown, type Setup } from "./utils";

describe("Construction", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("constructs from a BlinklikeHTMLCollectionData instance", () => {
    expect(s.coll).toBeInstanceOf(BlinklikeHTMLCollection);
  });

  test("empty backing → length === 0", () => {
    expect(s.coll.length).toBe(0);
  });

  test("empty backing → item(0) === null", () => {
    expect(s.coll.item(0)).toBeNull();
  });

  test("empty backing → namedItem('anything') === null", () => {
    expect(s.coll.namedItem("anything")).toBeNull();
  });

  test("empty backing → for-of yields nothing", () => {
    let count = 0;
    for (const el of s.coll) {
      void el;
      count++;
    }
    expect(count).toBe(0);
  });

  test("empty backing → Array.from(coll).length === 0", () => {
    expect(Array.from(s.coll).length).toBe(0);
  });

  test("two instances over independent data do not share state", () => {
    const t = setup();
    populate(s, 1);
    expect(s.coll.length).toBe(1);
    expect(t.coll.length).toBe(0);
    teardown(t);
  });

  test("two instances over the same data observe the same view", () => {
    const second = new BlinklikeHTMLCollection(s.data);
    populate(s, 3);
    expect(second.length).toBe(s.coll.length);
    expect(second.item(0)).toBe(s.coll.item(0));
    expect(second.item(2)).toBe(s.coll.item(2));
  });
});
