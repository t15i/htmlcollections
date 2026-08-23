import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { BlinklikeHTMLCollectionData } from "lib";

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

  test("prepending puts the element first", () => {
    const a = makeHTML();
    const b = makeHTML();
    append(s, a);
    s.root.prepend(b);
    expect(s.coll.length).toBe(2);
    expect(s.coll.item(0)).toBe(b);
    expect(s.coll.item(1)).toBe(a);
  });

  test("appending puts the element last", () => {
    populate(s, 2);
    const fresh = makeHTML();
    s.root.appendChild(fresh);
    expect(s.coll.item(s.coll.length - 1)).toBe(fresh);
  });

  test("inserting in the middle lands between its neighbours", () => {
    const els = populate(s, 3);
    const fresh = makeHTML();
    els[0]!.after(fresh);
    expect([...s.coll]).toEqual([els[0], fresh, els[1], els[2]]);
  });

  test("removal shrinks the collection", () => {
    const els = populate(s, 3);
    els[1]!.remove();
    expect(s.coll.length).toBe(2);
    expect([...s.coll]).toEqual([els[0], els[2]]);
  });

  test("removing a non-member changes nothing", () => {
    const els = populate(s, 2);
    makeHTML().remove();
    expect([...s.coll]).toEqual(els);
  });

  test("insert, remove, insert preserves ordering", () => {
    const a = makeHTML();
    const b = makeHTML();
    const c = makeHTML();
    append(s, a);
    append(s, b, a);
    a.remove();
    append(s, c, null);
    expect([...s.coll]).toEqual([c, b]);
  });

  test("collection order is tree order, not insertion order", () => {
    const a = makeHTML();
    const b = makeHTML();
    const c = makeHTML();
    s.root.append(b);
    s.root.prepend(a);
    b.after(c);
    expect([...s.coll]).toEqual([a, b, c]);
  });

  test("moving a member reorders the collection", () => {
    const els = populate(s, 3);
    s.root.prepend(els[2]!);
    expect([...s.coll]).toEqual([els[2], els[0], els[1]]);
  });

  test("wholesale replacement through innerHTML is picked up", () => {
    populate(s, 3);
    expect(s.coll.length).toBe(3);
    s.root.innerHTML = "<p></p><p></p>";
    expect(s.coll.length).toBe(2);
    expect([...s.coll]).toEqual([...s.root.children]);
  });

  test("children that do not match the rule are excluded", () => {
    const s2 = setup({
      matches: (el) => el.localName === "b",
    });
    const hit = makeHTML("b");
    s2.root.append(makeHTML("i"), hit, makeHTML("i"));
    expect([...s2.coll]).toEqual([hit]);
    teardown(s2);
  });

  test("descendants scope reaches through wrappers, in tree order", () => {
    const s2 = setup({
      matches: (el) => el.localName === "b",
      subtree: true,
    });
    s2.root.innerHTML = "<b id=1></b><i><b id=2></b></i><b id=3></b>";
    expect([...s2.coll].map((el) => el.id)).toEqual(["1", "2", "3"]);
    teardown(s2);
  });

  test("children scope ignores matches below the root's children", () => {
    const s2 = setup({
      matches: (el) => el.localName === "b",
    });
    s2.root.innerHTML = "<b id=1></b><i><b id=2></b></i>";
    expect([...s2.coll].map((el) => el.id)).toEqual(["1"]);
    teardown(s2);
  });

  test("invalidate() re-collects membership the observer cannot see", () => {
    let admit = false;
    const root = document.createElement("div");
    document.body.append(root);
    const data = new BlinklikeHTMLCollectionData(root, {
      matches: () => admit,
    });
    root.append(makeHTML(), makeHTML());

    expect(data.length).toBe(0);
    admit = true;
    expect(data.length).toBe(0);

    data.invalidate();
    expect(data.length).toBe(2);

    root.remove();
  });
});
