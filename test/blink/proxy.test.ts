import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { BlinklikeHTMLCollection } from "lib";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("WebIDL / Proxy semantics", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("typeof coll === 'object'", () => {
    expect(typeof s.coll).toBe("object");
  });

  test("coll instanceof BlinklikeHTMLCollection is true", () => {
    expect(s.coll).toBeInstanceOf(BlinklikeHTMLCollection);
  });

  test("coll instanceof globalThis.HTMLCollection is true", () => {
    expect(s.coll).toBeInstanceOf(globalThis.HTMLCollection);
  });

  test("native collection still matches globalThis.HTMLCollection", () => {
    const host = document.createElement("div");
    host.append(document.createElement("span"));
    expect(host.children).toBeInstanceOf(globalThis.HTMLCollection);
  });

  test("coll.length is data-like, not a method", () => {
    populate(s, 2);
    expect(typeof s.coll.length).toBe("number");
    expect(typeof (s.coll as { length: unknown }).length).not.toBe("function");
  });

  test("coll[0] = el is rejected — index unchanged", () => {
    const els = populate(s, 2);
    const stranger = makeHTML();
    try {
      (s.coll as unknown as Element[])[0] = stranger;
    } catch {
      /* strict-mode TypeError is acceptable */
    }
    expect(s.coll[0]).toBe(els[0]);
  });

  test("coll['foo'] = el is rejected — name unchanged", () => {
    const el = makeHTML("div", { id: "foo" });
    append(s, el);
    const stranger = makeHTML();
    try {
      (s.coll as unknown as Record<string, Element>)["foo"] = stranger;
    } catch {
      /* strict-mode TypeError is acceptable */
    }
    expect(s.coll.namedItem("foo")).toBe(el);
  });

  test("delete coll[0] is rejected — index still resolves", () => {
    const els = populate(s, 2);
    try {
      delete (s.coll as unknown as Record<number, Element>)[0];
    } catch {
      /* strict-mode TypeError is acceptable */
    }
    expect(s.coll[0]).toBe(els[0]);
  });

  test("delete coll['foo'] is rejected — name still resolves", () => {
    const el = makeHTML("div", { id: "foo" });
    append(s, el);
    try {
      delete (s.coll as unknown as Record<string, Element>)["foo"];
    } catch {
      /* strict-mode TypeError is acceptable */
    }
    expect(s.coll.namedItem("foo")).toBe(el);
  });

  test("Symbol-keyed access short-circuits the proxy", () => {
    populate(s, 3);
    const fn = s.coll[Symbol.iterator];
    expect(typeof fn).toBe("function");
  });

  test("item and namedItem are callable methods from the prototype", () => {
    populate(s, 3, (i) => ({ id: `el-${i}` }));
    expect(typeof s.coll.item).toBe("function");
    expect(typeof s.coll.namedItem).toBe("function");
    expect(s.coll.item(0)).not.toBeNull();
    expect(s.coll.namedItem("el-1")).not.toBeNull();
  });

  test("unknown method name returns undefined", () => {
    populate(s, 3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((s.coll as any).xyz).toBeUndefined();
  });

  test("getOwnPropertyDescriptor for a supported index returns a descriptor", () => {
    populate(s, 2);
    const desc = Object.getOwnPropertyDescriptor(s.coll, 0);
    expect(desc).toBeDefined();
    expect(desc!.enumerable).toBe(true);
    expect(desc!.configurable).toBe(true);
  });

  test("getOwnPropertyDescriptor for a supported name returns a descriptor", () => {
    const el = makeHTML("div", { id: "foo" });
    append(s, el);
    const desc = Object.getOwnPropertyDescriptor(s.coll, "foo");
    expect(desc).toBeDefined();
    expect(desc!.value).toBe(el);
  });
});
