import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("item(index) and indexed access", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("item(0) returns the first element", () => {
    const els = populate(s, 3);
    expect(s.coll.item(0)).toBe(els[0]);
  });

  test("item(length - 1) returns the last element", () => {
    const els = populate(s, 3);
    expect(s.coll.item(s.coll.length - 1)).toBe(els[2]);
  });

  test("item(length) returns null", () => {
    populate(s, 3);
    expect(s.coll.item(s.coll.length)).toBeNull();
  });

  test("item(-1) returns null", () => {
    populate(s, 3);
    expect(s.coll.item(-1)).toBeNull();
  });

  test("item(NaN) coerces via UnsignedLong (≈ 0)", () => {
    const els = populate(s, 3);
    // UnsignedLong of NaN is 0 per WebIDL [EnforceRange]-less coercion.
    expect(s.coll.item(NaN as unknown as number)).toBe(els[0]);
  });

  test("item(1.5) truncates toward zero", () => {
    const els = populate(s, 3);
    expect(s.coll.item(1.5)).toBe(els[1]);
  });

  test("item('1') coerces the string to 1", () => {
    const els = populate(s, 3);
    expect(s.coll.item("1" as unknown as number)).toBe(els[1]);
  });

  test("coll[0] matches coll.item(0)", () => {
    const els = populate(s, 3);
    expect(s.coll[0]).toBe(els[0]);
    expect(s.coll[2]).toBe(els[2]);
  });

  test("coll[length] returns undefined", () => {
    populate(s, 3);
    expect(s.coll[s.coll.length]).toBeUndefined();
  });

  test("coll[-1] returns undefined", () => {
    populate(s, 3);
    expect(s.coll[-1 as unknown as number]).toBeUndefined();
  });

  test("sequential item(i) returns each element exactly once in order", () => {
    const els = populate(s, 10);
    for (let i = 0; i < els.length; i++) {
      expect(s.coll.item(i)).toBe(els[i]);
    }
  });

  test("random-access pattern returns the correct element each time", () => {
    const els = populate(s, 100);
    expect(s.coll.item(50)).toBe(els[50]);
    expect(s.coll.item(0)).toBe(els[0]);
    expect(s.coll.item(99)).toBe(els[99]);
    expect(s.coll.item(25)).toBe(els[25]);
  });

  test("repeated item(i) returns the same element", () => {
    const els = populate(s, 3);
    expect(s.coll.item(1)).toBe(els[1]);
    expect(s.coll.item(1)).toBe(els[1]);
    expect(s.coll.item(1)).toBe(els[1]);
  });

  test("item(i) reflects new ordering after structural mutation", () => {
    const els = populate(s, 3);
    s.data.remove(els[0]!);
    expect(s.coll.item(0)).toBe(els[1]);
    expect(s.coll.item(1)).toBe(els[2]);
    const fresh = makeHTML();
    append(s, fresh, null);
    expect(s.coll.item(0)).toBe(fresh);
    expect(s.coll.item(1)).toBe(els[1]);
  });

  test("collection of size 1 — item(0) returns the element, item(1) null", () => {
    const els = populate(s, 1);
    expect(s.coll.item(0)).toBe(els[0]);
    expect(s.coll.item(1)).toBeNull();
  });
});
