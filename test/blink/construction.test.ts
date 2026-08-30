import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { BlinklikeHTMLCollection } from "lib";

import { ALL_CHILDREN, populate, setup, teardown, type Setup } from "./utils";

describe("Construction", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("constructs from a root and a rule", () => {
    expect(s.coll).toBeInstanceOf(BlinklikeHTMLCollection);
  });

  test("keeps the root and the rule it was built from", () => {
    // What a walk that acts on the members rather than reading them needs:
    // the same two things the collection itself was built from.
    expect(s.data.root).toBe(s.root);
    expect(s.data.rule).toBe(ALL_CHILDREN);
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

  test("two instances over independent roots do not share state", () => {
    const t = setup();
    populate(s, 1);
    expect(s.coll.length).toBe(1);
    expect(t.coll.length).toBe(0);
    teardown(t);
  });

  test("two instances over the same root and rule observe the same view", () => {
    // Each keeps a store of its own now - a collection is built from a root
    // and a rule and makes the rest itself - so what they agree on is the
    // tree, which is the only thing membership was ever read from.
    const second = new BlinklikeHTMLCollection(s.root, ALL_CHILDREN);
    populate(s, 3);
    expect(second.length).toBe(s.coll.length);
    expect(second.item(0)).toBe(s.coll.item(0));
    expect(second.item(2)).toBe(s.coll.item(2));
  });
});
