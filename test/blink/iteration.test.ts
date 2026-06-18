import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("Iteration — [Symbol.iterator]", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("for-of yields every element exactly once", () => {
    const els = populate(s, 5);
    const seen: Element[] = [];
    for (const el of s.coll) seen.push(el);
    expect(seen).toEqual(els);
  });

  test("iteration order matches item(0)..item(length-1)", () => {
    populate(s, 5);
    const byItem: (Element | null)[] = [];
    for (let i = 0; i < s.coll.length; i++) byItem.push(s.coll.item(i));
    expect([...s.coll]).toEqual(byItem);
  });

  test("Array.from(coll) returns elements in order", () => {
    const els = populate(s, 4);
    expect(Array.from(s.coll)).toEqual(els);
  });

  test("spread returns elements in order", () => {
    const els = populate(s, 4);
    expect([...s.coll]).toEqual(els);
  });

  test("iterator delegates to the backing data iterator", () => {
    populate(s, 3);
    expect([...s.coll]).toEqual([...s.data]);
  });

  test("multiple concurrent iterators walk independently from head", () => {
    const els = populate(s, 3);
    const a = s.coll[Symbol.iterator]();
    const b = s.coll[Symbol.iterator]();
    expect(a.next().value).toBe(els[0]);
    expect(b.next().value).toBe(els[0]);
    expect(a.next().value).toBe(els[1]);
    expect(b.next().value).toBe(els[1]);
    expect(a.next().value).toBe(els[2]);
    expect(b.next().value).toBe(els[2]);
    expect(a.next().done).toBe(true);
    expect(b.next().done).toBe(true);
  });

  test("iteration over empty collection produces no values and terminates", () => {
    const it = s.coll[Symbol.iterator]();
    expect(it.next().done).toBe(true);
  });

  test("iteration after structural mutation reflects the new state", () => {
    const els = populate(s, 3);
    s.data.remove(els[1]!);
    expect([...s.coll]).toEqual([els[0], els[2]]);
    const fresh = makeHTML();
    append(s, fresh, els[2]!);
    expect([...s.coll]).toEqual([els[0], els[2], fresh]);
  });

  test("mutation during iteration does not crash", () => {
    const els = populate(s, 5);
    expect(() => {
      const it = s.coll[Symbol.iterator]();
      it.next();
      s.data.remove(els[2]!);
      while (!it.next().done) {
        /* drain */
      }
    }).not.toThrow();
  });
});
