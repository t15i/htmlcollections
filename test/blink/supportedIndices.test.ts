import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { populate, setup, teardown, type Setup } from "./utils";

describe("Supported property indices", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("0 is a supported index for a non-empty collection", () => {
    populate(s, 3);
    expect(0 in s.coll).toBe(true);
  });

  test("(length - 1) is a supported index", () => {
    populate(s, 3);
    expect(s.coll.length - 1 in s.coll).toBe(true);
  });

  test("length is not a supported index", () => {
    populate(s, 3);
    expect(s.coll.length in s.coll).toBe(false);
  });

  test("-1 is not a supported index", () => {
    populate(s, 3);
    expect((-1) in s.coll).toBe(false);
  });

  test("Object.keys(coll) includes 0..length-1 as strings", () => {
    populate(s, 3);
    const keys = Object.keys(s.coll);
    for (let i = 0; i < s.coll.length; i++) {
      expect(keys).toContain(String(i));
    }
  });

  test("iterating supported indices yields 0..length-1 in order", () => {
    populate(s, 4);
    const indices = Object.keys(s.coll)
      .filter((k) => /^\d+$/.test(k))
      .map(Number);
    const expected = Array.from({ length: s.coll.length }, (_, i) => i);
    expect(indices.slice(0, expected.length)).toEqual(expected);
  });

  test("after remove, the formerly-trailing index is no longer supported", () => {
    const els = populate(s, 3);
    s.data.remove(els[2]!);
    expect(2 in s.coll).toBe(false);
    expect(1 in s.coll).toBe(true);
  });
});
