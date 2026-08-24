import {
  Argument,
  Attribute,
  Constructor,
  Exposed,
  Interface,
  Internals,
} from "@t15i/webidl-decorators";
import { InterfaceType, UnsignedLong } from "@t15i/webidl-types";

import { expect, test } from "vitest";

import {
  BlinklikeHTMLCollection,
  BlinklikeHTMLCollectionData,
  type BlinklikeHTMLCollectionInternals,
} from "lib";

test("README: root plus rule", () => {
  const root = document.createElement("div");
  root.innerHTML =
    `<custom-item id="a"></custom-item><custom-item id="b"></custom-item>` +
    `<custom-item id="c"></custom-item><span></span>`;
  document.body.append(root);

  const data = new BlinklikeHTMLCollectionData(root, {
    matches: (el) => el.localName === "custom-item",
  });
  const items = new BlinklikeHTMLCollection(data);

  expect(items.length).toBe(3);
  expect(items.item(0)).toBe(root.firstElementChild);
  expect(items.namedItem("b")).toBe(root.children[1]);
  expect((items as unknown as Record<string, Element>)["b"]).toBe(
    root.children[1],
  );
  expect([...items].length).toBe(3);

  root.remove();
});

/**
 * Guards the examples in README.md.
 *
 * @remarks
 * Documentation that is never executed drifts, and this one drifted all the
 * way through a rewrite before anyone noticed. Every snippet the README shows
 * is run here in the shape it is printed in.
 */
test("README: web component wiring", () => {
  class HTMLCustomListElement extends HTMLElement {
    #data = new BlinklikeHTMLCollectionData(this, {
      matches: (el) => el.localName === "readme-item",
    });
    #items = new BlinklikeHTMLCollection(this.#data);

    get items(): HTMLCollection {
      return this.#items as unknown as HTMLCollection;
    }
  }
  class HTMLCustomItemElement extends HTMLElement {}

  if (customElements.get("readme-list") === undefined) {
    customElements.define("readme-list", HTMLCustomListElement);
    customElements.define("readme-item", HTMLCustomItemElement);
  }

  const list = document.createElement("readme-list") as HTMLCustomListElement;
  list.innerHTML = `<readme-item id="a"></readme-item><readme-item id="b"></readme-item>`;
  document.body.append(list);

  expect(list.items.length).toBe(2);
  expect(list.items.namedItem("b")).toBe(list.children[1]);

  list.remove();
});

test("README: attributes declaration", () => {
  const select = document.createElement("div");
  document.body.append(select);
  const data = new BlinklikeHTMLCollectionData(select, {
    matches: (el) => el.localName === "option" && !el.hasAttribute("disabled"),
    attributes: ["disabled"],
  });

  const a = document.createElement("option");
  const b = document.createElement("option");
  select.append(a, b);
  expect(data.length).toBe(2);

  b.setAttribute("disabled", "");
  expect(data.length).toBe(1);

  select.remove();
});

test("README: subtree", () => {
  const form = document.createElement("div");
  form.innerHTML = `<fieldset><input></fieldset><input>`;
  document.body.append(form);

  const data = new BlinklikeHTMLCollectionData(form, {
    matches: (el) => el.localName === "input",
    subtree: true,
  });
  expect(data.length).toBe(2);

  form.remove();
});

test("README: live named lookups", () => {
  const list = document.createElement("div");
  document.body.append(list);
  const data = new BlinklikeHTMLCollectionData(list, {
    matches: (el) => el.localName === "custom-item",
  });
  const items = new BlinklikeHTMLCollection(data);

  const el = document.createElement("custom-item");
  el.id = "hero";
  list.append(el);

  expect(items.namedItem("hero")).toBe(el);

  el.id = "champion";

  expect(items.namedItem("hero")).toBeNull();
  expect(items.namedItem("champion")).toBe(el);
  expect("champion" in items).toBe(true);

  list.remove();
});

interface DerivedHTMLCollectionInternals extends BlinklikeHTMLCollectionInternals {
  // ... whatever extra internal slots the derived interface needs
  label: string;
}

@Exposed("Window")
@Interface
@Constructor([Argument(InterfaceType(BlinklikeHTMLCollectionData), "data")])
class DerivedHTMLCollection extends BlinklikeHTMLCollection {
  /** @internal */
  declare [Internals]: DerivedHTMLCollectionInternals;

  constructor(data: BlinklikeHTMLCollectionData) {
    super(data);
    this[Internals].label = "derived";
  }

  @Attribute(UnsignedLong)
  override get length(): number {
    return this[Internals].data.length;
  }

  @Attribute(UnsignedLong)
  override set length(value: number) {
    void value;
  }
}

test("README: extending", () => {
  const root = document.createElement("div");
  root.innerHTML = `<custom-item></custom-item><custom-item></custom-item>`;
  document.body.append(root);

  const data = new BlinklikeHTMLCollectionData(root, {
    matches: (el) => el.localName === "custom-item",
  });
  const items = new DerivedHTMLCollection(data);

  expect(items.length).toBe(2);
  expect(items.item(0)).toBe(root.firstElementChild);
  expect(items[Internals].label).toBe("derived");

  root.remove();
});
