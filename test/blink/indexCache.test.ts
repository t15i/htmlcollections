import { describe, expect, test } from "vitest";

import {
  BlinklikeHTMLCollectionData,
  CollectionIndexCache,
  type CollectionRule,
} from "lib";

import { makeHTML } from "./utils";

/**
 * A rule that counts how many candidates it has been asked about.
 *
 * @remarks
 * The counter is what separates the two tiers of the cache from the outside:
 * a walk to offset `i` consults the rule `i + 1` times, a full rebuild
 * consults it once per member. Nothing else about this cache is observable.
 */
function counting(
  matches: (el: Element) => boolean = () => true,
  subtree = false,
) {
  const calls = { n: 0 };
  const rule: CollectionRule = {
    matches: (el: Element) => {
      calls.n++;
      return matches(el);
    },
    subtree,
  };
  return { rule, calls };
}

function rooted(): HTMLElement {
  const root = document.createElement("div");
  document.body.append(root);
  return root;
}

/** Fills `root` with `n` element children and returns them. */
function flat(root: Element, n: number): HTMLElement[] {
  const els: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const el = makeHTML("div", { id: `e${i}` });
    root.append(el);
    els.push(el);
  }
  return els;
}

/**
 * Builds a two-level tree under `root` and returns its members in tree order.
 *
 * @remarks
 * ```
 * root
 *  |- a        d
 *  |  |- b     |- e
 *  |  `- c
 * ```
 * Tree order is `a, b, c, d, e`, so the backward walk has to climb out of one
 * subtree and descend into the deepest corner of the previous one.
 */
function nested(root: Element): HTMLElement[] {
  const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map((id) =>
    makeHTML("div", { id }),
  ) as [HTMLElement, HTMLElement, HTMLElement, HTMLElement, HTMLElement];

  a.append(b, c);
  d.append(e);
  root.append(a, d);

  return [a, b, c, d, e];
}

describe("Indexed access", () => {
  test("a cold read walks only as far as the index it was asked for", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 50);

    expect(data.item(3)).toBe(els[3]);
    expect(calls.n).toBe(4);

    root.remove();
  });

  test("a cold read does not build the item vector", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 50);

    expect(data.item(3)).toBe(els[3]);
    // One more step from where the previous read stopped, not a rebuild.
    expect(data.item(4)).toBe(els[4]);
    expect(calls.n).toBe(5);

    // Reading length is what materializes the vector, and it is the only
    // thing that does.
    expect(data.length).toBe(50);
    expect(calls.n).toBe(55);

    // Now indexed access is an array lookup and costs nothing at all.
    expect(data.item(49)).toBe(els[49]);
    expect(calls.n).toBe(55);

    root.remove();
  });

  test("sequential access costs one step per index", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 40);

    for (let i = 0; i < 40; i++) expect(data.item(i)).toBe(els[i]);

    expect(calls.n).toBe(40);

    root.remove();
  });

  test("a nearer anchor is walked backward", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 50);

    expect(data.item(40)).toBe(els[40]);
    const walked = calls.n;

    expect(data.item(39)).toBe(els[39]);
    expect(calls.n).toBe(walked + 1);

    root.remove();
  });

  test("a nearer first member restarts the walk from the beginning", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 50);

    expect(data.item(40)).toBe(els[40]);
    const walked = calls.n;

    // 3 is nearer to the head than to the anchor at 40, so the walk starts
    // over instead of stepping back 37 times.
    expect(data.item(3)).toBe(els[3]);
    expect(calls.n).toBe(walked + 4);

    root.remove();
  });

  test("running off the end learns the count and keeps the anchor", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 50);

    // The walk teaches the cache the count without building the vector, and
    // the walker is left parked on the last member it reached.
    expect(data.item(999)).toBeNull();
    expect(calls.n).toBe(50);
    expect(data.length).toBe(50);
    expect(calls.n).toBe(50);

    // Reading the end costs nothing at all: that is where the anchor is.
    expect(data.item(49)).toBe(els[49]);
    expect(calls.n).toBe(50);

    expect(data.item(45)).toBe(els[45]);
    expect(calls.n).toBe(54);

    root.remove();
  });

  test("a known count lets a walk start from the last member", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 50);

    expect(data.item(999)).toBeNull();
    expect(data.length).toBe(50);

    // Drag the anchor back to the head.
    expect(data.item(2)).toBe(els[2]);
    const walked = calls.n;

    // 48 is nearer to the end than to the anchor at 2: descend to the last
    // member, then step back once, rather than walk forward 46 times.
    expect(data.item(48)).toBe(els[48]);
    expect(calls.n).toBe(walked + 2);

    root.remove();
  });

  test("every index reads the same member cold as it does warm", () => {
    const root = rooted();
    const warm = new BlinklikeHTMLCollectionData(
      root,
      counting(() => true, true).rule,
    );
    const members = nested(root);

    expect([...warm]).toEqual(members);

    for (let i = 0; i < members.length; i++) {
      const cold = new BlinklikeHTMLCollectionData(root, {
        matches: () => true,
        subtree: true,
      });
      expect(cold.item(i)).toBe(members[i]);
    }

    root.remove();
  });

  test("a descendant walk can start from the last member", () => {
    const root = rooted();
    const { rule, calls } = counting(() => true, true);
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const members = nested(root);

    expect(data.item(999)).toBeNull();
    expect(data.length).toBe(5);

    // Drag the anchor back to the head.
    expect(data.item(0)).toBe(members[0]);
    const walked = calls.n;

    // The end is nearer than the anchor, so the walk descends through last
    // children into the deepest corner of the tree instead of walking the
    // collection. The descent is unfiltered, so only the candidate it lands on
    // is put to the rule: one call, not four members' worth.
    expect(data.item(4)).toBe(members[4]);
    expect(calls.n).toBe(walked + 1);

    expect(data.item(3)).toBe(members[3]);

    root.remove();
  });

  test("a descendant walk agrees with tree order in both directions", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(root, {
      matches: () => true,
      subtree: true,
    });
    const members = nested(root);

    // Forward from cold, then all the way back through the same anchor.
    for (let i = 0; i < members.length; i++) {
      expect(data.item(i)).toBe(members[i]);
    }
    for (let i = members.length - 1; i >= 0; i--) {
      expect(data.item(i)).toBe(members[i]);
    }

    // A backward jump of more than one step, so the walk has to climb out of
    // one subtree and into the deepest corner of the previous one.
    expect(data.item(4)).toBe(members[4]);
    expect(data.item(2)).toBe(members[2]);
    expect(data.item(0)).toBe(members[0]);

    root.remove();
  });

  test("mixed access order lands on the right member every time", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(root, counting().rule);
    const els = flat(root, 20);

    // Forward jumps, backward jumps, restarts and repeats of the anchor.
    for (const i of [7, 19, 18, 2, 2, 0, 11, 10, 19, 5, 12]) {
      expect(data.item(i)).toBe(els[i]);
    }
    expect(data.item(20)).toBeNull();

    root.remove();
  });

  test("a rebuild after every mutation is not what an indexed read costs", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    const els = flat(root, 200);

    // Each append invalidates; each read then walks to the first member and
    // stops. Ten rounds cost ten steps, not ten rebuilds.
    for (let i = 0; i < 10; i++) {
      root.append(makeHTML());
      expect(data.item(0)).toBe(els[0]);
    }

    expect(calls.n).toBe(10);

    root.remove();
  });

  test("isEmpty answers from the first member alone", () => {
    const root = rooted();
    const { rule, calls } = counting();
    const data = new BlinklikeHTMLCollectionData(root, rule);
    flat(root, 50);

    expect(data.isEmpty).toBe(false);
    expect(calls.n).toBe(1);

    root.remove();
  });

  test("isEmpty is true for a collection with no members", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(root, {
      matches: (el) => el.hasAttribute("on"),
    });
    flat(root, 5);

    expect(data.isEmpty).toBe(true);
    expect(data.length).toBe(0);

    root.remove();
  });

  test("hasExactlyOneItem stops at the second member", () => {
    const root = rooted();

    const one = rooted();
    const { rule: oneRule, calls: oneCalls } = counting();
    const single = new BlinklikeHTMLCollectionData(one, oneRule);
    flat(one, 1);
    expect(single.hasExactlyOneItem).toBe(true);
    expect(oneCalls.n).toBe(1);

    const { rule, calls } = counting();
    const many = new BlinklikeHTMLCollectionData(root, rule);
    flat(root, 50);
    expect(many.hasExactlyOneItem).toBe(false);
    expect(calls.n).toBe(2);

    one.remove();
    root.remove();
  });

  test("isEmpty and hasExactlyOneItem answer from a valid count", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(root, counting().rule);
    flat(root, 1);

    expect(data.length).toBe(1);
    expect(data.isEmpty).toBe(false);
    expect(data.hasExactlyOneItem).toBe(true);

    root.append(makeHTML());
    expect(data.length).toBe(2);
    expect(data.hasExactlyOneItem).toBe(false);

    root.remove();
  });

  test("hasExactlyOneItem answers from an anchor already past the first", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(root, counting().rule);
    const els = flat(root, 50);

    expect(data.item(10)).toBe(els[10]);
    expect(data.hasExactlyOneItem).toBe(false);

    root.remove();
  });

  test("an out-of-range or non-integer index is null on either tier", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(root, counting().rule);
    const els = flat(root, 5);

    // Cold: the anchor tier.
    expect(data.item(-1)).toBeNull();
    expect(data.item(1.5)).toBeNull();
    expect(data.item(5)).toBeNull();
    expect(data.item(0)).toBe(els[0]);

    // Warm: the vector tier.
    expect(data.length).toBe(5);
    expect(data.item(-1)).toBeNull();
    expect(data.item(1.5)).toBeNull();
    expect(data.item(5)).toBeNull();
    expect(data.item(4)).toBe(els[4]);

    root.remove();
  });

  test("indexOf and contains agree with a walk that never built the vector", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(root, counting().rule);
    const els = flat(root, 30);

    expect(data.item(12)).toBe(els[12]);

    // These cannot answer from the anchor, so they materialize — and the
    // vector has to agree with what the anchor already reported.
    expect(data.indexOf(els[12]!)).toBe(12);
    expect(data.contains(els[12]!)).toBe(true);
    expect(data.contains(makeHTML())).toBe(false);
    expect(data.item(12)).toBe(els[12]);

    root.remove();
  });
});

describe("Indexed access under an impure rule", () => {
  test("a collection that empties under the anchor reports itself empty", () => {
    const root = rooted();
    let live = true;
    const data = new BlinklikeHTMLCollectionData(root, {
      matches: () => live,
    });
    const els = flat(root, 20);

    expect(data.item(5)).toBe(els[5]);

    // Membership changed with no mutation behind it and no invalidate() call:
    // the rule broke its contract. The walk still has to terminate.
    live = false;
    expect(data.item(2)).toBeNull();
    expect(data.length).toBe(0);

    root.remove();
  });

  test("a backward walk that runs out of members returns null", () => {
    const root = rooted();
    let all = true;
    const data = new BlinklikeHTMLCollectionData(root, {
      matches: (el) => all || el.id === "e0",
    });
    const els = flat(root, 20);

    expect(data.item(5)).toBe(els[5]);

    all = false;
    // Nearer to the anchor at 5 than to the head, so the walk goes backward
    // and falls off the front of a collection that now has one member.
    expect(data.item(3)).toBeNull();

    root.remove();
  });
});

describe("The anchor tier on its own", () => {
  test("serves indexed access without ever building a vector", () => {
    const root = rooted();
    const els = flat(root, 30);
    const { rule, calls } = counting();
    const cache = new CollectionIndexCache(root, rule);

    expect(cache.get(4)).toBe(els[4]);
    expect(calls.n).toBe(5);

    // Counting on the base tier: ask for an offset past the end and let the
    // failed walk report where it stopped.
    expect(cache.count()).toBe(30);
    expect(cache.count()).toBe(30);

    expect(cache.get(29)).toBe(els[29]);
    expect(cache.get(30)).toBeNull();
    expect(cache.isEmpty()).toBe(false);
    expect(cache.hasExactlyOne()).toBe(false);

    cache.invalidate();
    expect(cache.get(0)).toBe(els[0]);

    root.remove();
  });
});

describe("The two tiers agree", () => {
  /** Deterministic LCG, so a failure is reproducible from the seed alone. */
  function rng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  /** Grows a random tree of `n` elements under `root`, half of them members. */
  function randomTree(root: Element, rand: () => number, n: number): void {
    const pool: Element[] = [root];
    for (let i = 0; i < n; i++) {
      const parent = pool[Math.floor(rand() * pool.length)]!;
      const el = makeHTML("div");
      if (rand() < 0.5) el.setAttribute("on", "");
      parent.append(el);
      pool.push(el);
    }
  }

  test("random access from an anchor matches the materialized vector", () => {
    const rule: CollectionRule = {
      matches: (el) => el.hasAttribute("on"),
      subtree: true,
    };

    for (const seed of [1, 7, 42, 1337]) {
      const rand = rng(seed);
      const root = rooted();
      randomTree(root, rand, 60);

      // The vector tier, read once up front.
      const reference = new BlinklikeHTMLCollectionData(root, rule);
      const expected = [...reference];
      expect(expected.length).toBeGreaterThan(4);

      // The anchor tier, never asked for its length, so its vector is never
      // built and every read has to walk.
      const subject = new BlinklikeHTMLCollectionData(root, rule);

      for (let i = 0; i < 300; i++) {
        const index = Math.floor(rand() * (expected.length + 3)) - 1;
        expect([seed, index, subject.item(index)]).toEqual([
          seed,
          index,
          expected[index] ?? null,
        ]);
      }

      root.remove();
    }
  });

  test("the two tiers stay in step across mutations", () => {
    const rand = rng(2024);
    const root = rooted();
    randomTree(root, rand, 40);

    const rule: CollectionRule = {
      matches: (el) => el.hasAttribute("on"),
      subtree: true,
    };
    const reference = new BlinklikeHTMLCollectionData(root, rule);
    const subject = new BlinklikeHTMLCollectionData(root, rule);

    for (let round = 0; round < 12; round++) {
      const expected = [...reference];

      for (let i = 0; i < 25; i++) {
        const index = Math.floor(rand() * (expected.length + 2));
        expect(subject.item(index)).toBe(expected[index] ?? null);
      }

      // Invalidate both and let the next round walk a different tree.
      if (rand() < 0.5) {
        randomTree(root, rand, 3);
      } else {
        const members = [...reference];
        members[Math.floor(rand() * members.length)]?.remove();
      }
    }

    root.remove();
  });
});

describe("Walker filter semantics", () => {
  /**
   * ```
   * root
   *  |- a (no)  -> g  (yes)
   *  |- b (yes) -> bg (yes)
   *  |- c (no)  -> h  (yes)
   *  `- d (yes)
   * ```
   * A children-scoped collection over this tree has exactly two members, `b`
   * and `d`. Every other "yes" is a grandchild.
   */
  function mixed(root: Element) {
    const mk = (id: string, on: boolean) => {
      const el = makeHTML("div", on ? { id, on: "" } : { id });
      return el;
    };

    const a = mk("a", false);
    const b = mk("b", true);
    const c = mk("c", false);
    const d = mk("d", true);
    a.append(mk("g", true));
    b.append(mk("bg", true));
    c.append(mk("h", true));
    root.append(a, b, c, d);

    return { a, b, c, d };
  }

  // Spelled out rather than left to the default: children-against-descendants
  // is the subject of every test below, and the rule it is paired with says
  // `subtree: true`.
  const ON: CollectionRule = {
    matches: (el) => el.hasAttribute("on"),
    subtree: false,
  };

  test("a children-scoped walk never descends past the children", () => {
    const root = rooted();
    const { b, d } = mixed(root);
    const data = new BlinklikeHTMLCollectionData(root, ON);

    // A skipped non-member would let the walk into its subtree and hand back
    // a grandchild; a rejected one cannot.
    expect([...data]).toEqual([b, d]);
    expect(data.length).toBe(2);

    root.remove();
  });

  test("a cold children-scoped read never descends either", () => {
    const root = rooted();
    const { b, d } = mixed(root);

    // Read only through the anchor tier, so the vector never covers for it.
    const first = new BlinklikeHTMLCollectionData(root, ON);
    expect(first.item(0)).toBe(b);

    const second = new BlinklikeHTMLCollectionData(root, ON);
    expect(second.item(1)).toBe(d);

    const third = new BlinklikeHTMLCollectionData(root, ON);
    expect(third.item(2)).toBeNull();

    root.remove();
  });

  test("stepping back across a non-member with children lands on the member", () => {
    const root = rooted();
    const { b, d } = mixed(root);
    const data = new BlinklikeHTMLCollectionData(root, ON);

    // Backward from d: the walk meets rejected `c`, then descends into `b`'s
    // own child before climbing back out to `b` itself.
    expect(data.item(1)).toBe(d);
    expect(data.item(0)).toBe(b);

    root.remove();
  });

  test("a descendant-scoped walk does descend past non-members", () => {
    const root = rooted();
    const { b, d } = mixed(root);
    const data = new BlinklikeHTMLCollectionData(root, {
      matches: (el) => el.hasAttribute("on"),
      subtree: true,
    });

    const ids = [...data].map((el) => el.id);
    expect(ids).toEqual(["g", "b", "bg", "h", "d"]);
    expect(data.item(1)).toBe(b);
    expect(data.item(4)).toBe(d);

    root.remove();
  });

  test("a rule that matches the root never yields the root", () => {
    const root = rooted();
    let live = true;
    const data = new BlinklikeHTMLCollectionData(root, {
      matches: (el) => el === root || live,
      subtree: true,
    });
    const els = flat(root, 8);

    expect(data.item(5)).toBe(els[5]);

    // Impure: membership changed with no mutation behind it. The backward walk
    // now runs past the front of the collection and climbs to the root — which
    // this rule says it matches. previousNode() filters that parent and would
    // return it.
    live = false;
    expect(data.item(3)).toBeNull();
    expect(data.item(0)).toBeNull();
    expect(data.length).toBe(0);

    root.remove();
  });
});
