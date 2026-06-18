import { BlinklikeHTMLCollection, BlinklikeHTMLCollectionData } from "lib";

export const SVG_NS = "http://www.w3.org/2000/svg";

export interface Setup {
  root: HTMLElement;
  data: BlinklikeHTMLCollectionData;
  coll: BlinklikeHTMLCollection;
}

export function setup(): Setup {
  const root = document.createElement("div");
  document.body.appendChild(root);
  const data = new BlinklikeHTMLCollectionData(root);
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
 * Appends `el` under `s.root` and registers it in the collection after
 * `ref` (which must already be a member, or `null` to prepend).
 */
export function append(
  s: Setup,
  el: Element,
  ref: Element | null = null,
): void {
  s.root.appendChild(el);
  s.data.insertAfter(el, ref);
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
