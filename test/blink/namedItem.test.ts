import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  makeSVG,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("namedItem(name) and named property access", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("returns the first element whose id equals name", () => {
    const els = populate(s, 3, (i) => ({ id: `el-${i}` }));
    expect(s.coll.namedItem("el-1")).toBe(els[1]);
  });

  test("falls back to name attribute when no id matches", () => {
    const el = makeHTML("div", { name: "x" });
    append(s, el);
    expect(s.coll.namedItem("x")).toBe(el);
  });

  test("returns null when no element matches", () => {
    populate(s, 3, (i) => ({ id: `el-${i}` }));
    expect(s.coll.namedItem("missing")).toBeNull();
  });

  test("empty-string name returns null", () => {
    populate(s, 3, (i) => ({ id: `el-${i}` }));
    expect(s.coll.namedItem("")).toBeNull();
  });

  test("coll['foo'] matches coll.namedItem('foo')", () => {
    const el = makeHTML("div", { id: "foo" });
    append(s, el);
    expect((s.coll as unknown as Record<string, Element>)["foo"]).toBe(el);
  });

  test("coll['foo'] is undefined for non-matching names", () => {
    populate(s, 3, (i) => ({ id: `el-${i}` }));
    expect(
      (s.coll as unknown as Record<string, Element>)["missing"],
    ).toBeUndefined();
  });

  test("id takes priority over name attribute on different elements", () => {
    const byName = makeHTML("div", { name: "shared" });
    const byId = makeHTML("div", { id: "shared" });
    append(s, byName);
    append(s, byId, byName);
    expect(s.coll.namedItem("shared")).toBe(byId);
  });

  test("duplicate id — first in collection order wins", () => {
    const first = makeHTML("div", { id: "dup" });
    const second = makeHTML("div", { id: "dup" });
    append(s, first);
    append(s, second, first);
    expect(s.coll.namedItem("dup")).toBe(first);
  });

  test("duplicate name — first in collection order wins", () => {
    const first = makeHTML("div", { name: "dup" });
    const second = makeHTML("div", { name: "dup" });
    append(s, first);
    append(s, second, first);
    expect(s.coll.namedItem("dup")).toBe(first);
  });

  test("name on non-HTML-namespace element is ignored", () => {
    const svg = makeSVG("circle", { name: "x" });
    append(s, svg);
    expect(s.coll.namedItem("x")).toBeNull();
  });

  test("id on non-HTML-namespace element still registers", () => {
    const svg = makeSVG("circle", { id: "shape" });
    append(s, svg);
    expect(s.coll.namedItem("shape")).toBe(svg);
  });

  test("element with empty id is not matched by namedItem('')", () => {
    const el = makeHTML();
    append(s, el);
    expect(el.id).toBe("");
    expect(s.coll.namedItem("")).toBeNull();
  });

  test("element with empty name attribute is not matched by namedItem('')", () => {
    const el = makeHTML("div", { name: "" });
    append(s, el);
    expect(s.coll.namedItem("")).toBeNull();
  });

  test("name shared by id and name — id-bearing element wins", () => {
    const byName = makeHTML("div", { name: "shared" });
    const byId = makeHTML("div", { id: "shared" });
    append(s, byName);
    append(s, byId, byName);
    expect(s.coll.namedItem("shared")).toBe(byId);
  });

  test("named lookup does not crash on elements without id/name", () => {
    populate(s, 3);
    expect(() => s.coll.namedItem("foo")).not.toThrow();
    expect(s.coll.namedItem("foo")).toBeNull();
  });
});
