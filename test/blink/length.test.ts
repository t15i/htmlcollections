import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("length attribute", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("reflects the current number of elements", () => {
    populate(s, 5);
    expect(s.coll.length).toBe(5);
  });

  test("updates after insertAfter", () => {
    expect(s.coll.length).toBe(0);
    append(s, makeHTML());
    expect(s.coll.length).toBe(1);
    append(s, makeHTML(), s.coll.item(0));
    expect(s.coll.length).toBe(2);
  });

  test("updates after remove", () => {
    const els = populate(s, 3);
    s.data.remove(els[1]!);
    expect(s.coll.length).toBe(2);
  });

  test("length is readonly (strict-mode assignment throws)", () => {
    populate(s, 2);
    // ES modules are always strict; assigning a readonly WebIDL attribute
    // throws a TypeError.
    expect(() => {
      (s.coll as unknown as { length: number }).length = 99;
    }).toThrow(TypeError);
    expect(s.coll.length).toBe(2);
  });

  test("returns a number", () => {
    populate(s, 3);
    expect(typeof s.coll.length).toBe("number");
    expect(Number.isInteger(s.coll.length)).toBe(true);
  });

  test("survives interleaved insert/remove cycles", () => {
    const els = populate(s, 4);
    s.data.remove(els[0]!);
    s.data.remove(els[3]!);
    expect(s.coll.length).toBe(2);
    append(s, makeHTML(), els[1]!);
    expect(s.coll.length).toBe(3);
    s.data.remove(els[1]!);
    expect(s.coll.length).toBe(2);
  });
});
