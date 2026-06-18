import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  makeSVG,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("Live observation", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("mutating id 'a' → 'b' redirects namedItem", () => {
    const el = makeHTML("div", { id: "a" });
    append(s, el);
    el.id = "b";
    expect(s.coll.namedItem("a")).toBeNull();
    expect(s.coll.namedItem("b")).toBe(el);
  });

  test("mutating name attribute 'a' → 'b' redirects namedItem", () => {
    const el = makeHTML("div", { name: "a" });
    append(s, el);
    el.setAttribute("name", "b");
    expect(s.coll.namedItem("a")).toBeNull();
    expect(s.coll.namedItem("b")).toBe(el);
  });

  test("removing id drops the name from supported names", () => {
    const el = makeHTML("div", { id: "x" });
    append(s, el);
    el.removeAttribute("id");
    expect("x" in s.coll).toBe(false);
    expect(s.coll.namedItem("x")).toBeNull();
  });

  test("setting id to '' is treated as no id", () => {
    const el = makeHTML("div", { id: "x" });
    append(s, el);
    el.id = "";
    expect("x" in s.coll).toBe(false);
    expect("" in s.coll).toBe(false);
  });

  test("adding name attribute to a current member makes namedItem find it", () => {
    const el = makeHTML();
    append(s, el);
    expect(s.coll.namedItem("late")).toBeNull();
    el.setAttribute("name", "late");
    expect(s.coll.namedItem("late")).toBe(el);
  });

  test("mutations on a non-member descendant are ignored", () => {
    const member = makeHTML("div", { id: "m" });
    const stranger = makeHTML("div", { id: "s" });
    append(s, member);
    s.root.appendChild(stranger); // attached, but not registered
    expect(s.coll.namedItem("s")).toBeNull();
    stranger.id = "s2";
    expect("s2" in s.coll).toBe(false);
    expect(s.coll.namedItem("s2")).toBeNull();
  });

  test("mutating non-HTML-namespace name attribute does not change namedItem", () => {
    const svg = makeSVG("circle", { name: "a" });
    append(s, svg);
    expect(s.coll.namedItem("a")).toBeNull();
    svg.setAttribute("name", "b");
    expect(s.coll.namedItem("a")).toBeNull();
    expect(s.coll.namedItem("b")).toBeNull();
  });

  test("mutating non-HTML-namespace id attribute does change results", () => {
    const svg = makeSVG("circle", { id: "shape-a" });
    append(s, svg);
    expect(s.coll.namedItem("shape-a")).toBe(svg);
    svg.id = "shape-b";
    expect(s.coll.namedItem("shape-a")).toBeNull();
    expect(s.coll.namedItem("shape-b")).toBe(svg);
  });

  test("multiple mutations in one microtask are all applied before the next read", () => {
    const a = makeHTML("div", { id: "a1" });
    const b = makeHTML("div", { id: "b1" });
    append(s, a);
    append(s, b, a);
    a.id = "a2";
    b.id = "b2";
    expect(s.coll.namedItem("a1")).toBeNull();
    expect(s.coll.namedItem("b1")).toBeNull();
    expect(s.coll.namedItem("a2")).toBe(a);
    expect(s.coll.namedItem("b2")).toBe(b);
  });

  test("read after mutation sees new state without awaiting MO flush", () => {
    const el = makeHTML("div", { id: "old" });
    append(s, el);
    el.id = "new";
    // Synchronous drain via takeRecords ensures freshness.
    expect(s.coll.namedItem("new")).toBe(el);
  });

  test("mutating id and name on the same element updates both registrations", () => {
    const el = makeHTML("div", { id: "i1", name: "n1" });
    append(s, el);
    el.id = "i2";
    el.setAttribute("name", "n2");
    expect("i1" in s.coll).toBe(false);
    expect("n1" in s.coll).toBe(false);
    expect("i2" in s.coll).toBe(true);
    expect("n2" in s.coll).toBe(true);
  });

  test("setting an attribute to its current value is a no-op", () => {
    const el = makeHTML("div", { id: "same" });
    append(s, el);
    // Force the observer to fire by reading first, then re-setting.
    expect(s.coll.namedItem("same")).toBe(el);
    el.setAttribute("id", "same");
    expect(s.coll.namedItem("same")).toBe(el);
  });

  test("bucket invalidation does not desync live counters", () => {
    const a = makeHTML("div", { id: "x" });
    const b = makeHTML("div", { id: "x" });
    append(s, a);
    append(s, b, a);
    a.id = "y";
    expect("x" in s.coll).toBe(true);
    expect("y" in s.coll).toBe(true);
    expect(s.coll.namedItem("x")).toBe(b);
    expect(s.coll.namedItem("y")).toBe(a);
  });
});
