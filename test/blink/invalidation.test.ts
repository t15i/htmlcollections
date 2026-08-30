import { describe, expect, test } from "vitest";

import { BlinklikeHTMLCollectionData } from "lib/blink/BlinklikeHTMLCollectionData";
import { CollectionCacheObserver } from "lib/blink/CollectionCacheObserver";

import { CollectionRule } from "lib";

import { makeHTML } from "./utils";

/** A rule that counts how many candidates it has been asked about. */
function counting(
  matches: (el: Element) => boolean,
  attributes?: readonly string[],
) {
  const calls = { n: 0 };
  const rule = new CollectionRule({
    matches: (el: Element) => {
      calls.n++;
      return matches(el);
    },
    ...(attributes === undefined ? {} : { attributes }),
  });
  return { rule, calls };
}

function rooted() {
  const root = document.createElement("div");
  document.body.append(root);
  return root;
}

describe("Cache invalidation", () => {
  test("id change rebuilds the named cache but not the item vector", () => {
    const root = rooted();
    const { rule, calls } = counting(() => true);
    const data = new BlinklikeHTMLCollectionData(root, rule);

    const a = makeHTML("div", { id: "a" });
    root.append(a, makeHTML(), makeHTML());

    expect(data.length).toBe(3);
    const afterFirstBuild = calls.n;
    expect(afterFirstBuild).toBeGreaterThan(0);

    a.id = "renamed";

    // The item vector survives: the rule is not consulted again.
    expect(data.length).toBe(3);
    expect(calls.n).toBe(afterFirstBuild);

    // The named cache does not: the new id resolves, the old one does not.
    expect(data.namedItem("renamed")).toBe(a);
    expect(data.namedItem("a")).toBeNull();
    expect(calls.n).toBe(afterFirstBuild);

    root.remove();
  });

  test("name change behaves the same way", () => {
    const root = rooted();
    const { rule, calls } = counting(() => true);
    const data = new BlinklikeHTMLCollectionData(root, rule);

    const a = makeHTML("div", { name: "a" });
    root.append(a);

    expect(data.length).toBe(1);
    const built = calls.n;

    a.setAttribute("name", "b");
    expect(data.namedItem("b")).toBe(a);
    expect(data.namedItem("a")).toBeNull();
    expect(data.length).toBe(1);
    expect(calls.n).toBe(built);

    root.remove();
  });

  test("a declared attribute rebuilds membership", () => {
    const root = rooted();
    const { rule } = counting((el) => el.hasAttribute("on"), ["on"]);
    const data = new BlinklikeHTMLCollectionData(root, rule);

    const a = makeHTML();
    const b = makeHTML("div", { on: "" });
    root.append(a, b);

    expect(data.length).toBe(1);
    a.setAttribute("on", "");
    expect(data.length).toBe(2);
    b.removeAttribute("on");
    expect(data.length).toBe(1);

    root.remove();
  });

  test("an undeclared attribute does not rebuild membership", () => {
    const root = rooted();
    const { rule } = counting((el) => el.hasAttribute("on"));
    const data = new BlinklikeHTMLCollectionData(root, rule);

    const a = makeHTML();
    root.append(a);
    expect(data.length).toBe(0);

    a.setAttribute("on", "");
    expect(data.length).toBe(0);

    // Structure still invalidates, and the rebuild then sees the attribute.
    root.append(makeHTML());
    expect(data.length).toBe(1);

    root.remove();
  });

  test("declaring id promotes it to a full invalidation", () => {
    const root = rooted();
    const { rule, calls } = counting((el) => el.id !== "", ["id"]);
    const data = new BlinklikeHTMLCollectionData(root, rule);

    const a = makeHTML();
    root.append(a);
    expect(data.length).toBe(0);
    const built = calls.n;

    a.id = "now-a-member";
    expect(data.length).toBe(1);
    expect(calls.n).toBeGreaterThan(built);

    root.remove();
  });

  test("one collection's declared attribute leaves another's caches alone", () => {
    const root = rooted();
    const declaring = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: (el) => el.hasAttribute("on"),
        attributes: ["on"],
      }),
    );
    const plain = counting(() => true);
    const bystander = new BlinklikeHTMLCollectionData(root, plain.rule);

    const a = makeHTML("div", { id: "a" });
    root.append(a);

    expect(declaring.length).toBe(0);
    expect(bystander.length).toBe(1);
    const built = plain.calls.n;

    a.setAttribute("on", "");

    expect(declaring.length).toBe(1);
    // The bystander declared nothing about "on": neither cache moves.
    expect(bystander.length).toBe(1);
    expect(plain.calls.n).toBe(built);
    expect(bystander.namedItem("a")).toBe(a);

    root.remove();
  });

  test("both collections of a root share one observer", () => {
    const root = rooted();
    const first = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: () => true,
      }),
    );
    const second = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: () => true,
        attributes: ["on"],
      }),
    );

    // Registering anything else on the same root hands back the very same
    // observer the two collections above are already using.
    const noop = { invalidate: () => {}, invalidateNames: () => {} };
    expect(CollectionCacheObserver.observe(root, noop)).toBe(
      CollectionCacheObserver.observe(root, noop),
    );

    root.append(makeHTML());
    expect(first.length).toBe(1);
    expect(second.length).toBe(1);

    root.remove();
  });

  test("a mutation delivered to the callback is not lost", async () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: () => true,
      }),
    );

    root.append(makeHTML());
    expect(data.length).toBe(1);

    root.append(makeHTML());
    // Let the observer's callback run and empty the record queue, so a read
    // that relied on takeRecords alone would see nothing.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(data.length).toBe(2);

    root.remove();
  });

  test("a children-scoped collection is invalidated from inside its members", () => {
    const root = rooted();
    const { rule, calls } = counting(() => true);
    const data = new BlinklikeHTMLCollectionData(root, rule);

    const member = makeHTML();
    root.append(member);
    expect(data.length).toBe(1);
    const built = calls.n;

    // Membership cannot have changed — the members of a children-scoped
    // collection are the children of the root — but the cache drops anyway:
    // a structural change invalidates every cache registered on the root,
    // whatever scope that cache draws its members from.
    member.append(makeHTML());
    expect(data.length).toBe(1);
    expect(calls.n).toBeGreaterThan(built);

    root.remove();
  });

  test("a mutation that moves no element invalidates nothing", () => {
    const root = rooted();
    const { rule, calls } = counting(() => true);
    const children = new BlinklikeHTMLCollectionData(root, rule);
    const descendants = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: () => true,
        subtree: true,
      }),
    );

    const member = makeHTML();
    root.append(member);
    expect(children.length).toBe(1);
    expect(descendants.length).toBe(1);
    const built = calls.n;

    // All childList records, none of them carrying an element: a member is
    // always an element, so no rule can care.
    member.textContent = "hello";
    member.textContent = "goodbye";
    root.append(document.createTextNode("loose"));

    expect(children.length).toBe(1);
    expect(descendants.length).toBe(1);
    expect(calls.n).toBe(built);

    root.remove();
  });

  test("a descendants-scoped collection sees mutations inside members", () => {
    const root = rooted();
    const data = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: () => true,
        subtree: true,
      }),
    );

    const member = makeHTML();
    root.append(member);
    expect(data.length).toBe(1);

    member.append(makeHTML());
    expect(data.length).toBe(2);

    root.remove();
  });

  test("caches start dirty, so content predating the collection is seen", () => {
    const root = rooted();
    root.innerHTML = "<i></i><i></i><i></i>";

    const data = new BlinklikeHTMLCollectionData(
      root,
      new CollectionRule({
        matches: () => true,
      }),
    );

    expect(data.length).toBe(3);

    root.remove();
  });
});
