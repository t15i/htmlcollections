import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("Structural mutations through BlinklikeHTMLCollectionData", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("insertAfter(el, null) prepends and bumps length by 1", () => {
    const a = makeHTML();
    const b = makeHTML();
    append(s, a);
    s.root.appendChild(b);
    expect(s.data.insertAfter(b, null)).toBe(true);
    expect(s.coll.length).toBe(2);
    expect(s.coll.item(0)).toBe(b);
    expect(s.coll.item(1)).toBe(a);
  });

  test("insertAfter(el, tail) appends", () => {
    const els = populate(s, 2);
    const fresh = makeHTML();
    s.root.appendChild(fresh);
    expect(s.data.insertAfter(fresh, els[1]!)).toBe(true);
    expect(s.coll.item(s.coll.length - 1)).toBe(fresh);
  });

  test("insertAfter(el, mid) inserts between mid and mid.next", () => {
    const els = populate(s, 3);
    const fresh = makeHTML();
    s.root.appendChild(fresh);
    expect(s.data.insertAfter(fresh, els[0]!)).toBe(true);
    expect([...s.coll]).toEqual([els[0], fresh, els[1], els[2]]);
  });

  test("re-inserting a member returns false and leaves collection unchanged", () => {
    const els = populate(s, 3);
    expect(s.data.insertAfter(els[0]!, els[2]!)).toBe(false);
    expect([...s.coll]).toEqual(els);
  });

  test("insertAfter where ref is not a member returns false", () => {
    populate(s, 2);
    const stranger = makeHTML();
    const fresh = makeHTML();
    s.root.appendChild(fresh);
    expect(s.data.insertAfter(fresh, stranger)).toBe(false);
    expect(s.data.contains(fresh)).toBe(false);
  });

  test("remove(el) for a member returns true and shrinks length", () => {
    const els = populate(s, 3);
    expect(s.data.remove(els[1]!)).toBe(true);
    expect(s.coll.length).toBe(2);
    expect([...s.coll]).toEqual([els[0], els[2]]);
  });

  test("remove(el) for a non-member returns false", () => {
    populate(s, 2);
    const stranger = makeHTML();
    expect(s.data.remove(stranger)).toBe(false);
  });

  test("insert/remove/insert sequence preserves ordering", () => {
    const a = makeHTML();
    const b = makeHTML();
    const c = makeHTML();
    append(s, a);
    append(s, b, a);
    s.data.remove(a);
    append(s, c, null);
    expect([...s.coll]).toEqual([c, b]);
  });
});
