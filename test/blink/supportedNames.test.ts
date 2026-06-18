import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  append,
  makeHTML,
  populate,
  setup,
  teardown,
  type Setup,
} from "./utils";

describe("Supported property names", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("element with id='foo' or name='bar' is a supported name", () => {
    const a = makeHTML("div", { id: "foo" });
    const b = makeHTML("div", { name: "bar" });
    append(s, a);
    append(s, b, a);
    expect("foo" in s.coll).toBe(true);
    expect("bar" in s.coll).toBe(true);
  });

  test("unknown name is not a supported name", () => {
    populate(s, 3, (i) => ({ id: `el-${i}` }));
    expect("foo" in s.coll).toBe(false);
  });

  test("empty string is never a supported name", () => {
    populate(s, 1, () => ({ name: "" }));
    expect("" in s.coll).toBe(false);
  });

  test("same name supported by both id and name appears once in enumeration", () => {
    const a = makeHTML("div", { id: "shared" });
    const b = makeHTML("div", { name: "shared" });
    append(s, a);
    append(s, b, a);
    const names = [...s.data.names()];
    expect(names.filter((n) => n === "shared").length).toBe(1);
  });

  test("iteration over supported names yields ids and names in collection order", () => {
    const a = makeHTML("div", { id: "a" });
    const b = makeHTML("div", { name: "b" });
    const c = makeHTML("div", { id: "c" });
    append(s, a);
    append(s, b, a);
    append(s, c, b);
    expect([...s.data.names()]).toEqual(["a", "b", "c"]);
  });

  test("after mutating id, old name dropped and new name supported", () => {
    const el = makeHTML("div", { id: "old" });
    append(s, el);
    expect("old" in s.coll).toBe(true);
    el.id = "new";
    expect("old" in s.coll).toBe(false);
    expect("new" in s.coll).toBe(true);
  });

  test("after mutating name attribute, old name dropped and new name supported", () => {
    const el = makeHTML("div", { name: "old" });
    append(s, el);
    expect("old" in s.coll).toBe(true);
    el.setAttribute("name", "new");
    expect("old" in s.coll).toBe(false);
    expect("new" in s.coll).toBe(true);
  });

  test("after removing the last element carrying a name, the name is no longer supported", () => {
    const el = makeHTML("div", { id: "only" });
    append(s, el);
    expect("only" in s.coll).toBe(true);
    s.data.remove(el);
    expect("only" in s.coll).toBe(false);
  });

  test("second carrier keeps name supported when original is removed", () => {
    const a = makeHTML("div", { id: "shared" });
    const b = makeHTML("div", { id: "shared" });
    append(s, a);
    append(s, b, a);
    s.data.remove(a);
    expect("shared" in s.coll).toBe(true);
    expect(s.coll.namedItem("shared")).toBe(b);
  });

  test("Object.keys exposes supported property names", () => {
    const el = makeHTML("div", { id: "foo" });
    append(s, el);
    expect(Object.keys(s.coll)).toContain("foo");
  });
});
