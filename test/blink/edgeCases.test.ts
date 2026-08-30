import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { CollectionRule } from "lib";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("Edge cases", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("an element appears at most once", () => {
    const el = makeHTML();
    append(s, el);
    append(s, el);
    expect(s.coll.length).toBe(1);
    expect(s.data.indexOf(el)).toBe(0);
  });

  test("very long ids/names are matched exactly", () => {
    const longId = "x".repeat(10_000);
    const longName = "y".repeat(10_000);
    const a = makeHTML("div", { id: longId });
    const b = makeHTML("div", { name: longName });
    append(s, a);
    append(s, b, a);
    expect(s.coll.namedItem(longId)).toBe(a);
    expect(s.coll.namedItem(longName)).toBe(b);
  });

  test("Unicode / surrogate-pair ids are matched exactly", () => {
    const id = "🦄-id-🌈";
    const el = makeHTML("div", { id });
    append(s, el);
    expect(s.coll.namedItem(id)).toBe(el);
    expect(s.coll.namedItem("🦄-id")).toBeNull();
  });

  test("Object.prototype keys only match when an element carries them", () => {
    populate(s, 2);
    expect(s.coll.namedItem("toString")).toBeNull();
    expect(s.coll.namedItem("__proto__")).toBeNull();

    const el = makeHTML("div", { id: "toString" });
    append(s, el, s.coll.item(s.coll.length - 1));
    expect(s.coll.namedItem("toString")).toBe(el);
  });

  test("numeric-string id does not collide with index 0", () => {
    const a = makeHTML();
    const b = makeHTML("div", { id: "0" });
    append(s, a);
    append(s, b, a);
    expect(s.coll[0]).toBe(a); // index 0 → first element
    // String "0" looks up by index per WebIDL legacy platform object
    // lookup order: integer-valued string keys are treated as indices.
    expect((s.coll as unknown as Record<string, Element>)["0"]).toBe(a);
  });

  test("a child the rule rejects is not a member", () => {
    const s2 = setup(
      new CollectionRule({
        matches: (el) => el.localName !== "b",
      }),
    );
    const stranger = makeHTML("b", { id: "ghost" });
    s2.root.append(makeHTML(), stranger);

    expect(s2.data.contains(stranger)).toBe(false);
    expect(s2.coll.namedItem("ghost")).toBeNull();

    stranger.id = "ghost-2";
    expect(s2.coll.namedItem("ghost-2")).toBeNull();

    teardown(s2);
  });

  test("an element not under root is never a member", () => {
    const outside = makeHTML("div", { id: "outside" });
    document.body.append(outside);

    expect(s.data.contains(outside)).toBe(false);
    expect(s.coll.namedItem("outside")).toBeNull();

    outside.id = "renamed";
    expect(s.coll.namedItem("renamed")).toBeNull();

    outside.remove();
  });

  test("survives 1000 insert/remove cycles", () => {
    for (let cycle = 0; cycle < 1000; cycle++) {
      const el = makeHTML("div", { id: `c-${cycle}` });
      append(s, el);
      el.remove();
    }
    expect(s.coll.length).toBe(0);
  });
});
