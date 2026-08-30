import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { BlinklikeHTMLCollectionData } from "lib/blink/BlinklikeHTMLCollectionData";

import { makeHTML, populate, setup, teardown, type Setup } from "./utils";
import { CollectionRule } from "lib";

describe("Neighbour traversal", () => {
  let s: Setup;
  beforeEach(() => {
    s = setup();
  });
  afterEach(() => {
    teardown(s);
  });

  test("root exposes the element the collection is rooted at", () => {
    expect(s.data.root).toBe(s.root);
  });

  test("first and last name the ends of the collection", () => {
    const els = populate(s, 3);
    expect(s.data.first).toBe(els[0]);
    expect(s.data.last).toBe(els[2]);
  });

  test("first and last are null for an empty collection", () => {
    expect(s.data.first).toBeNull();
    expect(s.data.last).toBeNull();
  });

  test("first and last coincide for a collection of one", () => {
    const els = populate(s, 1);
    expect(s.data.first).toBe(els[0]);
    expect(s.data.last).toBe(els[0]);
  });

  test("first and last follow the tree", () => {
    const els = populate(s, 3);
    els[0]!.remove();
    expect(s.data.first).toBe(els[1]);

    const tail = makeHTML();
    s.root.append(tail);
    expect(s.data.last).toBe(tail);
  });

  test("first walks no further than it must", () => {
    const calls = { n: 0 };
    const root = document.createElement("div");
    document.body.append(root);
    const data = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: () => {
          calls.n++;
          return true;
        },
      }),
    );
    for (let i = 0; i < 50; i++) root.append(makeHTML());

    // The rule is consulted once, not fifty times: no vector is built.
    expect(data.first).toBe(root.firstElementChild);
    expect(calls.n).toBe(1);

    root.remove();
  });

  test("next walks forward and stops at the tail", () => {
    const els = populate(s, 3);
    expect(s.data.next(els[0]!)).toBe(els[1]);
    expect(s.data.next(els[1]!)).toBe(els[2]);
    expect(s.data.next(els[2]!)).toBeNull();
  });

  test("previous walks backward and stops at the head", () => {
    const els = populate(s, 3);
    expect(s.data.previous(els[2]!)).toBe(els[1]);
    expect(s.data.previous(els[1]!)).toBe(els[0]);
    expect(s.data.previous(els[0]!)).toBeNull();
  });

  test("next and previous return null for a non-member", () => {
    populate(s, 2);
    const stranger = makeHTML();
    expect(s.data.next(stranger)).toBeNull();
    expect(s.data.previous(stranger)).toBeNull();
  });

  test("forward yields the tail of the collection", () => {
    const els = populate(s, 4);
    expect([...s.data.forward(els[1]!)]).toEqual([els[2], els[3]]);
    expect([...s.data.forward(els[3]!)]).toEqual([]);
  });

  test("backward yields the head in reverse", () => {
    const els = populate(s, 4);
    expect([...s.data.backward(els[2]!)]).toEqual([els[1], els[0]]);
    expect([...s.data.backward(els[0]!)]).toEqual([]);
  });

  test("forward and backward yield nothing for a non-member", () => {
    populate(s, 2);
    const stranger = makeHTML();
    expect([...s.data.forward(stranger)]).toEqual([]);
    expect([...s.data.backward(stranger)]).toEqual([]);
  });

  test("neighbours follow the tree after a move", () => {
    const els = populate(s, 3);
    s.root.prepend(els[2]!);
    expect(s.data.next(els[2]!)).toBe(els[0]);
    expect(s.data.previous(els[0]!)).toBe(els[2]);
  });

  test("non-integer and negative indices are out of range", () => {
    populate(s, 2);
    expect(s.data.item(1.5)).toBeNull();
    expect(s.data.item(-1)).toBeNull();
    expect(s.data.item(NaN)).toBeNull();
    expect(s.data.hasItem(1.5)).toBe(false);
    expect(s.data.hasItem(-1)).toBe(false);
    expect(s.data.hasItem(2)).toBe(false);
    expect(s.data.hasItem(1)).toBe(true);
  });

  test("indexOf and contains report non-members", () => {
    populate(s, 2);
    const stranger = makeHTML();
    expect(s.data.indexOf(stranger)).toBe(-1);
    expect(s.data.contains(stranger)).toBe(false);
  });
});
