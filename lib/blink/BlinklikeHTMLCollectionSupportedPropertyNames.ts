import type { BlinklikeHTMLCollectionData } from "./BlinklikeHTMLCollectionData";

/**
 * Supported property names view of a {@link BlinklikeHTMLCollectionData}.
 *
 * @see https://webidl.spec.whatwg.org/#dfn-supported-property-names
 */
export class BlinklikeHTMLCollectionSupportedPropertyNames {
  #data: BlinklikeHTMLCollectionData;

  constructor(data: BlinklikeHTMLCollectionData) {
    this.#data = data;
  }

  /**
   * Iterates the deduplicated keys currently in use as either an id or a
   * `name` attribute, in collection order.
   */
  [Symbol.iterator]() {
    return this.#data.names();
  }

  /**
   * True iff any current member of the collection carries `name` as its id
   * or `name` attribute.
   */
  has(name: string) {
    return this.#data.hasNamedItem(name);
  }
}
