import { afterEach, beforeEach, describe, expect, test } from "vitest";

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

  test("element rejected on second insertAfter", () => {
    const el = makeHTML();
    append(s, el);
    expect(s.data.insertAfter(el, null)).toBe(false);
    expect(s.coll.length).toBe(1);
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

  test("detached element (under root but not registered) is not a member", () => {
    populate(s, 2);
    const stranger = makeHTML("div", { id: "ghost" });
    s.root.appendChild(stranger);
    expect(s.data.contains(stranger)).toBe(false);
    expect(s.coll.namedItem("ghost")).toBeNull();
    stranger.id = "ghost-2";
    expect(s.coll.namedItem("ghost-2")).toBeNull();
  });

  test("element not under root — attribute mutations are not observed", () => {
    const detached = makeHTML("div", { id: "outside" });
    // Do not append to s.root.
    expect(s.data.insertAfter(detached, null)).toBe(true);
    expect(s.coll.namedItem("outside")).toBe(detached);
    detached.id = "renamed";
    // The cache cannot observe this mutation; the stale entry remains.
    expect(s.coll.namedItem("outside")).toBe(detached);
  });

  test("survives 1000 insert/remove cycles", () => {
    for (let cycle = 0; cycle < 1000; cycle++) {
      const el = makeHTML("div", { id: `c-${cycle}` });
      append(s, el);
      s.data.remove(el);
    }
    expect(s.coll.length).toBe(0);
  });
});
