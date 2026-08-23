import {
  BlinklikeHTMLCollection,
  BlinklikeHTMLCollectionData,
  type CollectionRule,
} from "lib";

export const SVG_NS = "http://www.w3.org/2000/svg";

/** Every element child of the root is a member. */
export const ALL_CHILDREN: CollectionRule = {
  matches: () => true,
};

export interface Setup {
  root: HTMLElement;
  data: BlinklikeHTMLCollectionData;
  coll: BlinklikeHTMLCollection;
}

export function setup(rule: CollectionRule = ALL_CHILDREN): Setup {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const data = new BlinklikeHTMLCollectionData(root, rule);
  const coll = new BlinklikeHTMLCollection(data);
  return { root, data, coll };
}

export function teardown(s: Setup): void {
  s.root.remove();
}

export function makeHTML(
  tag = "div",
  attrs: Record<string, string> = {},
): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

export function makeSVG(
  tag = "circle",
  attrs: Record<string, string> = {},
): SVGElement {
  const el = document.createElementNS(SVG_NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Inserts `el` under `s.root` immediately after `ref`, or as the first child
 * when `ref` is `null`.
 *
 * @remarks
 * Membership follows the tree now, so there is nothing to register: position
 * in the collection is position in the tree.
 */
export function append(
  s: Setup,
  el: Element,
  ref: Element | null = null,
): void {
  if (ref === null) s.root.prepend(el);
  else ref.after(el);
}

/**
 * Populates `s` with `n` HTML divs as a flat list of siblings. Optional
 * `attrsFn` is called per index to produce attributes (e.g. `id`, `name`).
 */
export function populate(
  s: Setup,
  n: number,
  attrsFn?: (i: number) => Record<string, string>,
): HTMLElement[] {
  const els: HTMLElement[] = [];
  let ref: Element | null = null;
  for (let i = 0; i < n; i++) {
    const el = makeHTML("div", attrsFn?.(i));
    append(s, el, ref);
    els.push(el);
    ref = el;
  }
  return els;
}
