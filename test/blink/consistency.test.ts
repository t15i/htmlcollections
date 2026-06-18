import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("Cross-method consistency", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("length matches the count of distinct iterated elements", () => {
    populate(s, 6);
    expect(s.coll.length).toBe([...s.coll].length);
    expect(s.coll.length).toBe(new Set([...s.coll]).size);
  });

  test("item(i) matches the i-th iterated element", () => {
    const arr = [...populate(s, 10)];
    const iterated = [...s.coll];
    for (let i = 0; i < arr.length; i++) {
      expect(s.coll.item(i)).toBe(iterated[i]);
    }
  });

  test("namedItem(name) for each enumerated name returns a member", () => {
    const a = makeHTML("div", { id: "a" });
    const b = makeHTML("div", { name: "b" });
    const c = makeHTML("div", { id: "c", name: "c-name" });
    append(s, a);
    append(s, b, a);
    append(s, c, b);
    const members = new Set([...s.coll]);
    for (const name of s.data.names()) {
      const found = s.coll.namedItem(name);
      expect(found).not.toBeNull();
      expect(members.has(found!)).toBe(true);
    }
  });

  test("data.contains(el) ↔ Array.from(coll).includes(el)", () => {
    const els = populate(s, 5);
    const stranger = makeHTML();
    for (const el of els) {
      expect(s.data.contains(el)).toBe(Array.from(s.coll).includes(el));
    }
    expect(s.data.contains(stranger)).toBe(false);
    expect(Array.from(s.coll).includes(stranger)).toBe(false);
  });

  test("data.indexOf(el) matches the index found by iterating", () => {
    const els = populate(s, 5);
    const arr = [...s.coll];
    for (const el of els) {
      expect(s.data.indexOf(el)).toBe(arr.indexOf(el));
    }
    expect(s.data.indexOf(makeHTML())).toBe(-1);
  });

  test("invariants hold across structural mutations", () => {
    const els = populate(s, 5);
    s.data.remove(els[2]!);
    const fresh = makeHTML();
    append(s, fresh, els[0]!);
    s.data.remove(els[4]!);

    const arr = [...s.coll];
    expect(s.coll.length).toBe(arr.length);
    for (let i = 0; i < arr.length; i++) {
      expect(s.coll.item(i)).toBe(arr[i]);
      expect(s.data.indexOf(arr[i]!)).toBe(i);
      expect(s.data.contains(arr[i]!)).toBe(true);
    }
  });
});
